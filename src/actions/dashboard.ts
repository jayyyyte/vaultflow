"use server";

import { db } from "@/db";
import { wallets, categories, transactions, recurringBills, settings } from "@/db/schema";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { getCurrentYearMonth } from "@/lib/utils";
import { getWalletsWithBalances } from "./wallets";
import { getTransactions } from "./transactions";
import { getRecurringBills } from "./recurring";
import type { DashboardSummary, MonthlyCashFlowPoint, CategorySpendingPoint } from "@/lib/types";

export async function getDashboardData(month: string = getCurrentYearMonth()) {
  const [currYear, currMonth] = month.split("-").map(Number);

  // Calculate boundary for 6 months history (e.g. 2026-05-01)
  const oldestDate = new Date(currYear, currMonth - 6, 1);
  const oldestY = oldestDate.getFullYear();
  const oldestM = String(oldestDate.getMonth() + 1).padStart(2, "0");
  const sixMonthsAgoKey = `${oldestY}-${oldestM}-01`;

  // ⚡ Run all SQL aggregation queries in ONE parallel batch via Promise.all.
  // Replaces in-memory transaction scanning with SQLite GROUP BY aggregations.
  const [
    walletList,
    appSettings,
    recentTransactions,
    recurring,
    [monthStats],
    sixMonthStats,
    categoryStats,
  ] = await Promise.all([
    getWalletsWithBalances(),
    db.select().from(settings),
    getTransactions({ limit: 8 }),
    getRecurringBills(),
    db
      .select({
        income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
        expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(like(transactions.date, `${month}%`)),
    db
      .select({
        ymKey: sql<string>`substr(${transactions.date}, 1, 7)`,
        income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
        expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(sql`${transactions.date} >= ${sixMonthsAgoKey}`)
      .groupBy(sql`substr(${transactions.date}, 1, 7)`),
    db
      .select({
        categoryId: transactions.categoryId,
        categoryName: sql<string>`COALESCE(${categories.name}, 'Chưa phân loại')`,
        categoryColor: sql<string>`COALESCE(${categories.color}, '#71717a')`,
        amount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.type, "expense"),
          like(transactions.date, `${month}%`)
        )
      )
      .groupBy(transactions.categoryId, categories.name, categories.color),
  ]);

  // 1. Wallets calculations
  let liquidAssets = 0;
  let creditDebt = 0;

  for (const w of walletList) {
    if (w.type === "credit") {
      if (w.currentBalance < 0) {
        creditDebt += Math.abs(w.currentBalance);
      }
    } else {
      liquidAssets += Math.max(0, w.currentBalance);
    }
  }

  const netWorth = liquidAssets - creditDebt;

  // 2. Settings (currency symbol & code)
  const symbolSetting = appSettings.find((s) => s.key === "currency_symbol");
  const currencySetting = appSettings.find((s) => s.key === "currency");
  const currencySymbol = symbolSetting ? symbolSetting.value : "$";
  const currency = currencySetting ? currencySetting.value : "USD";

  // 3. Transactions for the selected month (computed via SQL)
  const monthlyIncome = Number(monthStats?.income) || 0;
  const monthlyExpense = Number(monthStats?.expense) || 0;
  const monthlySavings = monthlyIncome - monthlyExpense;
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

  const summary: DashboardSummary = {
    totalBalance: liquidAssets,
    netWorth,
    monthlyIncome,
    monthlyExpense,
    monthlySavings,
    savingsRate,
    currencySymbol,
    currency,
  };

  // 4. Past 6 months cash flow trend for Recharts (computed via SQL GROUP BY)
  const historyMap = new Map(sixMonthStats.map((s) => [s.ymKey, s]));
  const cashFlowHistory: MonthlyCashFlowPoint[] = [];

  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(currYear, currMonth - 1 - i, 1);
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, "0");
    const ymKey = `${y}-${m}`;
    const monthLabel = targetDate.toLocaleDateString("en-US", { month: "short" });

    const stat = historyMap.get(ymKey);
    const inc = Number(stat?.income) || 0;
    const exp = Number(stat?.expense) || 0;

    cashFlowHistory.push({
      month: monthLabel,
      income: inc,
      expense: exp,
      net: inc - exp,
    });
  }

  // 5. Category Spending Breakdown for Donut Chart (computed via SQL)
  const categoryBreakdown: CategorySpendingPoint[] = categoryStats
    .map((cs) => {
      const amount = Number(cs.amount) || 0;
      const percent = monthlyExpense > 0 ? (amount / monthlyExpense) * 100 : 0;
      return {
        name: cs.categoryName,
        amount,
        color: cs.categoryColor,
        percent,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return {
    summary,
    cashFlowHistory,
    categoryBreakdown,
    wallets: walletList,
    recentTransactions,
    recurringBills: recurring,
    currentMonth: month,
  };
}

export type CashFlowPeriod = "week" | "month" | "quarter" | "6m" | "year";

export async function getCashFlowHistoryByPeriod(
  period: CashFlowPeriod = "6m",
  referenceMonth: string = getCurrentYearMonth()
): Promise<MonthlyCashFlowPoint[]> {
  const [currYear, currMonth] = referenceMonth.split("-").map(Number);

  if (period === "week") {
    // Current week: past 7 days
    const days: MonthlyCashFlowPoint[] = [];
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    const startDateStr = start.toISOString().split("T")[0];

    const stats = await db
      .select({
        dayKey: transactions.date,
        income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
        expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(sql`${transactions.date} >= ${startDateStr}`)
      .groupBy(transactions.date);

    const statMap = new Map(stats.map((s) => [s.dayKey, s]));

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayKey = d.toISOString().split("T")[0];
      const dayLabel = d.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric" });
      const stat = statMap.get(dayKey);
      const inc = Number(stat?.income) || 0;
      const exp = Number(stat?.expense) || 0;

      days.push({
        month: dayLabel,
        income: inc,
        expense: exp,
        net: inc - exp,
      });
    }
    return days;
  }

  if (period === "month") {
    // 4 weeks of the selected month
    const stats = await db
      .select({
        date: transactions.date,
        income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
        expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(like(transactions.date, `${referenceMonth}%`))
      .groupBy(transactions.date);

    const weekData = [
      { month: "Tuần 1 (1-7)", income: 0, expense: 0, net: 0 },
      { month: "Tuần 2 (8-14)", income: 0, expense: 0, net: 0 },
      { month: "Tuần 3 (15-21)", income: 0, expense: 0, net: 0 },
      { month: "Tuần 4 (22+)", income: 0, expense: 0, net: 0 },
    ];

    for (const row of stats) {
      const day = parseInt(row.date.split("-")[2], 10);
      const inc = Number(row.income) || 0;
      const exp = Number(row.expense) || 0;

      let idx = 3;
      if (day <= 7) idx = 0;
      else if (day <= 14) idx = 1;
      else if (day <= 21) idx = 2;

      weekData[idx].income += inc;
      weekData[idx].expense += exp;
      weekData[idx].net += inc - exp;
    }

    return weekData;
  }

  if (period === "quarter") {
    // Current quarter: 3 months
    const qIndex = Math.floor((currMonth - 1) / 3);
    const qStartMonth = qIndex * 3 + 1;
    const months: MonthlyCashFlowPoint[] = [];

    const stats = await db
      .select({
        ymKey: sql<string>`substr(${transactions.date}, 1, 7)`,
        income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
        expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(like(transactions.date, `${currYear}%`))
      .groupBy(sql`substr(${transactions.date}, 1, 7)`);

    const statMap = new Map(stats.map((s) => [s.ymKey, s]));

    for (let m = qStartMonth; m < qStartMonth + 3; m++) {
      const mStr = String(m).padStart(2, "0");
      const ymKey = `${currYear}-${mStr}`;
      const d = new Date(currYear, m - 1, 1);
      const monthLabel = `T${m} (${d.toLocaleDateString("en-US", { month: "short" })})`;
      const stat = statMap.get(ymKey);
      const inc = Number(stat?.income) || 0;
      const exp = Number(stat?.expense) || 0;

      months.push({
        month: monthLabel,
        income: inc,
        expense: exp,
        net: inc - exp,
      });
    }

    return months;
  }

  if (period === "year") {
    // 12 months of the year
    const stats = await db
      .select({
        ymKey: sql<string>`substr(${transactions.date}, 1, 7)`,
        income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
        expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(like(transactions.date, `${currYear}%`))
      .groupBy(sql`substr(${transactions.date}, 1, 7)`);

    const statMap = new Map(stats.map((s) => [s.ymKey, s]));
    const yearPoints: MonthlyCashFlowPoint[] = [];

    for (let m = 1; m <= 12; m++) {
      const mStr = String(m).padStart(2, "0");
      const ymKey = `${currYear}-${mStr}`;
      const monthLabel = `T${m}`;
      const stat = statMap.get(ymKey);
      const inc = Number(stat?.income) || 0;
      const exp = Number(stat?.expense) || 0;

      yearPoints.push({
        month: monthLabel,
        income: inc,
        expense: exp,
        net: inc - exp,
      });
    }

    return yearPoints;
  }

  // Default: 6 months
  const oldestDate = new Date(currYear, currMonth - 6, 1);
  const oldestY = oldestDate.getFullYear();
  const oldestM = String(oldestDate.getMonth() + 1).padStart(2, "0");
  const sixMonthsAgoKey = `${oldestY}-${oldestM}-01`;

  const sixMonthStats = await db
    .select({
      ymKey: sql<string>`substr(${transactions.date}, 1, 7)`,
      income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
      expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(sql`${transactions.date} >= ${sixMonthsAgoKey}`)
    .groupBy(sql`substr(${transactions.date}, 1, 7)`);

  const historyMap = new Map(sixMonthStats.map((s) => [s.ymKey, s]));
  const cashFlowHistory: MonthlyCashFlowPoint[] = [];

  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(currYear, currMonth - 1 - i, 1);
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, "0");
    const ymKey = `${y}-${m}`;
    const monthLabel = targetDate.toLocaleDateString("en-US", { month: "short" });

    const stat = historyMap.get(ymKey);
    const inc = Number(stat?.income) || 0;
    const exp = Number(stat?.expense) || 0;

    cashFlowHistory.push({
      month: monthLabel,
      income: inc,
      expense: exp,
      net: inc - exp,
    });
  }

  return cashFlowHistory;
}
