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
        categoryName: categories.name,
        categoryColor: categories.color,
        amount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
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
