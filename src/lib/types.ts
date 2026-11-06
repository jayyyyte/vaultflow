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
