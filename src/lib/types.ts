import type { Wallet, Category, Transaction, RecurringBill } from "@/db/schema";

export interface WalletWithBalance extends Wallet {
  currentBalance: number;
  totalIncome: number;
  totalExpense: number;
}

export interface TransactionWithDetails extends Transaction {
  categoryName?: string | null;
  categoryIcon?: string | null;
  categoryColor?: string | null;
  walletName?: string | null;
  walletColor?: string | null;
  walletIcon?: string | null;
  destinationWalletName?: string | null;
}

export interface CategoryWithSpending extends Category {
  spentThisMonth: number;
  remainingBudget: number;
  percentUsed: number;
  transactionCount: number;
}

export interface DashboardSummary {
  totalBalance: number;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlySavings: number;
  savingsRate: number;
  currencySymbol: string;
  currency?: string;
}

export interface MonthlyCashFlowPoint {
  month: string; // "Jan", "Feb", etc.
  income: number;
  expense: number;
  net: number;
}

export interface CategorySpendingPoint {
  name: string;
  amount: number;
  color: string;
  percent: number;
}

export interface CategoryAnalyticsItem {
  id: string;
  name: string;
  type: "expense" | "income";
  icon: string;
  color: string;
  monthlyBudget: number;
  classification?: "needs" | "wants" | "savings";
  currentAmount: number;
  previousAmount: number;
  momGrowth: number; // percentage change vs previous month (+15% or -10%)
  shareOfTotal: number; // percentage of total expenses/income
  transactionCount: number;
  avgPerTransaction: number;
  budgetUtilization: number;
  status: "over_budget" | "warning" | "good" | "unbudgeted";
}

export interface NeedsWantsCategoryItem {
  id: string;
  name: string;
  amount: number;
  color: string;
  icon: string;
  share: number;
}

export interface NeedsWantsReport {
  month: string;
  totalIncome: number;
  totalExpense: number;
  needs: {
    total: number;
    percentOfIncome: number;
    percentOfExpense: number;
    targetPercent: 50;
    delta: number;
    categories: NeedsWantsCategoryItem[];
  };
  wants: {
    total: number;
    percentOfIncome: number;
    percentOfExpense: number;
    targetPercent: 30;
    delta: number;
    categories: NeedsWantsCategoryItem[];
  };
  savings: {
    total: number;
    percentOfIncome: number;
    targetPercent: 20;
    delta: number;
    categories: NeedsWantsCategoryItem[];
  };
  healthScore: number; // 0 to 100
  assessment: {
    title: string;
    description: string;
    status: "excellent" | "good" | "warning" | "danger";
  };
}

export interface CategoryAnalytics {
  currentMonth: string;
  previousMonth: string;
  totalExpenseCurrent: number;
  totalExpensePrevious: number;
  totalIncomeCurrent: number;
  totalIncomePrevious: number;
  expenseCategories: CategoryAnalyticsItem[];
  incomeCategories: CategoryAnalyticsItem[];
  insights: {
    topExpenseCategory?: CategoryAnalyticsItem;
    fastestGrowingExpense?: CategoryAnalyticsItem;
    mostFrequentExpense?: CategoryAnalyticsItem;
    overBudgetCount: number;
    nearLimitCount: number;
    totalBudgeted: number;
  };
}
