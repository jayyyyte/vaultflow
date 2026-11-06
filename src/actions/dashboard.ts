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
  // 1. Wallets
  const walletList = await getWalletsWithBalances();

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

  // 2. Settings (currency symbol)
  const appSettings = await db.select().from(settings);
  const symbolSetting = appSettings.find((s) => s.key === "currency_symbol");
  const currencySetting = appSettings.find((s) => s.key === "currency");
  const currencySymbol = symbolSetting ? symbolSetting.value : "$";
  const currency = currencySetting ? currencySetting.value : "USD";

  // 3. Transactions for the selected month
  const currentMonthTx = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      type: transactions.type,
      categoryId: transactions.categoryId,
    })
    .from(transactions)
    .where(like(transactions.date, `${month}%`));

  let monthlyIncome = 0;
  let monthlyExpense = 0;

  for (const tx of currentMonthTx) {
    if (tx.type === "income") monthlyIncome += tx.amount;
    if (tx.type === "expense") monthlyExpense += tx.amount;
  }

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

  // 4. Past 6 months cash flow trend for Recharts
  const cashFlowHistory: MonthlyCashFlowPoint[] = [];
  const [currYear, currMonth] = month.split("-").map(Number);

  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(currYear, currMonth - 1 - i, 1);
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, "0");
    const ymKey = `${y}-${m}`;
    const monthLabel = targetDate.toLocaleDateString("en-US", { month: "short" });

    const monthRows = await db
      .select({
        amount: transactions.amount,
        type: transactions.type,
      })
      .from(transactions)
      .where(like(transactions.date, `${ymKey}%`));

    let inc = 0;
    let exp = 0;
    for (const r of monthRows) {
      if (r.type === "income") inc += r.amount;
      if (r.type === "expense") exp += r.amount;
    }

    cashFlowHistory.push({
      month: monthLabel,
      income: inc,
      expense: exp,
      net: inc - exp,
    });
  }

  // 5. Category Spending Breakdown for Donut Chart
  const allCategories = await db.select().from(categories);
  const catMap = new Map(allCategories.map((c) => [c.id, c]));

  const categorySpendingMap = new Map<string, number>();
  for (const tx of currentMonthTx) {
    if (tx.type === "expense" && tx.categoryId) {
      const current = categorySpendingMap.get(tx.categoryId) || 0;
      categorySpendingMap.set(tx.categoryId, current + tx.amount);
    }
  }

  const categoryBreakdown: CategorySpendingPoint[] = [];
  for (const [catId, amount] of categorySpendingMap.entries()) {
    const cat = catMap.get(catId);
    if (cat && amount > 0) {
      const percent = monthlyExpense > 0 ? (amount / monthlyExpense) * 100 : 0;
      categoryBreakdown.push({
        name: cat.name,
        amount,
        color: cat.color,
        percent,
      });
    }
  }
  categoryBreakdown.sort((a, b) => b.amount - a.amount);

  // 6. Recent transactions (latest 8)
  const recentTransactions = await getTransactions({ limit: 8 });

  // 7. Upcoming recurring bills
  const recurring = await getRecurringBills();

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
