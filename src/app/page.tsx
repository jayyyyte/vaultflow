import React, { Suspense } from "react";
import Link from "next/link";
import { getDashboardData } from "@/actions/dashboard";
import { getCurrentYearMonth, formatCurrency, formatDate, getMonthYearLabel } from "@/lib/utils";
import { CashFlowChart } from "@/components/charts/cash-flow-chart";
import { CategoryPieChart } from "@/components/charts/category-pie-chart";
import { DynamicIcon } from "@/components/icon-helper";
import { DashboardClientControls } from "@/components/dashboard-client-controls";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  TrendingUp,
  Receipt,
  ArrowRight,
  Calendar,
  CreditCard,
  Building2,
  Banknote,
  Smartphone,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";


interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const currentMonth = resolvedParams.month || getCurrentYearMonth();
  const data = await getDashboardData(currentMonth);

  const { summary, cashFlowHistory, categoryBreakdown, wallets, recentTransactions, recurringBills } = data;
  const currencySymbol = summary.currencySymbol || "$";
  const currency = summary.currency || "USD";

  return (
    <div className="space-y-6">
      {/* Top Banner / Month Selector & Quick Add Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Financial Overview
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time balance across {wallets.length} wallets • libSQL serverless
          </p>
        </div>

        {/* Client-side Month Selector & Action Buttons */}
        <Suspense fallback={<div className="h-9 w-48 bg-zinc-900 rounded-xl animate-pulse" />}>
          <DashboardClientControls currentMonth={currentMonth} />
        </Suspense>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Net Worth */}
        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Worth</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
            {formatCurrency(summary.netWorth, currency, currencySymbol)}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-zinc-400">
            <span>Liquid: {formatCurrency(summary.totalBalance, currency, currencySymbol)}</span>
          </div>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
        </div>

        {/* Monthly Income */}
        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Income</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tracking-tight">
            {formatCurrency(summary.monthlyIncome, currency, currencySymbol)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-2">
            In {getMonthYearLabel(currentMonth)}
          </p>
        </div>

        {/* Monthly Expenses */}
        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Expenses</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-400 font-mono tracking-tight">
            {formatCurrency(summary.monthlyExpense, currency, currencySymbol)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-2">
            {summary.monthlyIncome > 0
              ? `${((summary.monthlyExpense / summary.monthlyIncome) * 100).toFixed(0)}% of income`
              : "Tracked this month"}
          </p>
        </div>

        {/* Net Savings */}
        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cash Flow</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              summary.monthlySavings >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
            summary.monthlySavings >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}>
            {summary.monthlySavings >= 0 ? "+" : ""}
            {formatCurrency(summary.monthlySavings, currency, currencySymbol)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-2">
            Savings rate: <span className="font-semibold text-zinc-200">{summary.savingsRate.toFixed(0)}%</span>
          </p>
        </div>
      </div>

      {/* Wallets Horizontal Strip */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">My Wallets</h2>
            <span className="text-xs text-zinc-400 font-mono">({wallets.length})</span>
          </div>
          <Link
            href="/wallets"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
          >
            Manage <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-4 hover:border-zinc-700 transition-all relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${wallet.color}25`, color: wallet.color }}
                >
                  <DynamicIcon name={wallet.icon} className="w-4 h-4" />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-800/90 text-zinc-400 border border-zinc-700/50">
                  {wallet.type.replace("_", "-")}
                </span>
              </div>
              <p className="text-xs font-semibold text-zinc-200 truncate">{wallet.name}</p>
              <p
                className={`text-lg font-black font-mono mt-1 ${
                  wallet.currentBalance < 0 ? "text-amber-400" : "text-white"
                }`}
              >
                {formatCurrency(wallet.currentBalance, wallet.currency, currencySymbol)}
              </p>
              {wallet.type === "credit" && wallet.creditLimit && wallet.creditLimit > 0 && (
                <p className="text-[10px] text-zinc-400 mt-1 font-mono">
                  Avail: {formatCurrency(wallet.creditLimit + wallet.currentBalance, wallet.currency, currencySymbol)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Cash Flow 6-Month Trend */}
        <div className="lg:col-span-2 bg-[#121215] border border-zinc-800/80 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Cash Flow Trend</h3>
              <p className="text-xs text-zinc-400">Income vs. Expense over past 6 months</p>
            </div>
          </div>
          <CashFlowChart data={cashFlowHistory} currency={currency} currencySymbol={currencySymbol} />
        </div>

        {/* Expense Category Breakdown */}
        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-white">Expenses by Category</h3>
            <p className="text-xs text-zinc-400">Spending breakdown this month</p>
          </div>
          <CategoryPieChart data={categoryBreakdown} currency={currency} currencySymbol={currencySymbol} />
        </div>
      </div>

      {/* Two Column Section: Recent Transactions & Recurring Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Transactions List (2 Cols) */}
        <div className="lg:col-span-2 bg-[#121215] border border-zinc-800/80 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Recent Transactions</h3>
              <p className="text-xs text-zinc-400">Latest financial activities</p>
            </div>
            <Link
              href="/transactions"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-400">
              No transactions recorded yet. Tap <strong className="text-emerald-400">Quick Add</strong> to log your first transaction!
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: tx.categoryColor ? `${tx.categoryColor}25` : "#27272a",
                        color: tx.categoryColor || "#a1a1aa",
                      }}
                    >
                      <DynamicIcon name={tx.categoryIcon || "Tag"} className="w-4 h-4" />
                    </div>
                    <div className="truncate min-w-0">
                      <p className="text-xs font-semibold text-zinc-200 truncate">
                        {tx.note || tx.categoryName || (tx.type === "transfer" ? `Transfer to ${tx.destinationWalletName || "Wallet"}` : "Uncategorized")}
                      </p>
                      <p className="text-[10px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                        <span>{formatDate(tx.date)}</span>
                        <span>•</span>
                        <span className="truncate">{tx.walletName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className={`text-xs font-bold font-mono ${
                        tx.type === "income"
                          ? "text-emerald-400"
                          : tx.type === "expense"
                          ? "text-zinc-100"
                          : "text-blue-400"
                      }`}
                    >
                      {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}
                      {formatCurrency(tx.amount, currency, currencySymbol)}
                    </p>
                    <span className="text-[10px] uppercase font-bold text-zinc-400">
                      {tx.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Recurring Bills */}
        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Recurring Bills</h3>
                <p className="text-xs text-zinc-400">Monthly fixed commitments</p>
              </div>
              <Link
                href="/budgets"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
              >
                Budgets <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {recurringBills.slice(0, 4).map((bill) => {
                const todayDay = new Date().getDate();
                const daysUntil = bill.dueDay - todayDay;
                return (
                  <div
                    key={bill.id}
                    className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-semibold text-zinc-200">{bill.name}</p>
                      <p className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-zinc-400" />
                        Due on day {bill.dueDay} ({daysUntil === 0 ? "Today" : daysUntil > 0 ? `in ${daysUntil} days` : `passed`})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold font-mono text-zinc-100">
                        {formatCurrency(bill.amount, currency, currencySymbol)}
                      </p>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {bill.frequency}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/80 text-center">
            <Link
              href="/budgets"
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              View all monthly budgets & progress bars →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
