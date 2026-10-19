"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCategoryBudget } from "@/actions/categories";
import { payRecurringBill, deleteRecurringBill } from "@/actions/recurring";
import { DynamicIcon } from "./icon-helper";
import { formatCurrency } from "@/lib/utils";
import { RecurringBillModal } from "./recurring-bill-modal";
import type { CategoryWithSpending, WalletWithBalance } from "@/lib/types";
import type { RecurringBillWithDetails } from "@/actions/recurring";
import {
  PieChart,
  Plus,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Check,
  X,
  Trash2,
  Loader2,
  Zap,
} from "lucide-react";

interface BudgetViewProps {
  categories: CategoryWithSpending[];
  wallets: WalletWithBalance[];
  recurringBills: RecurringBillWithDetails[];
  currencySymbol?: string;
  currentMonth: string;
}

export function BudgetView({
  categories,
  wallets,
  recurringBills,
  currencySymbol = "$",
  currentMonth,
}: BudgetViewProps) {
  const router = useRouter();
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState<string>("");
  const [payingBillId, setPayingBillId] = useState<string | null>(null);
  const [successPaidMsg, setSuccessPaidMsg] = useState<string | null>(null);

  // Expense categories only for budgeting
  const expenseCategories = categories.filter((c) => c.type === "expense");

  // Aggregates
  let totalBudget = 0;
  let totalSpent = 0;

  for (const c of expenseCategories) {
    totalBudget += c.monthlyBudget || 0;
    totalSpent += c.spentThisMonth;
  }

  const overallPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const remainingTotal = Math.max(0, totalBudget - totalSpent);

  const handleStartEdit = (catId: string, currentBudget: number | null) => {
    setEditingBudgetId(catId);
    setBudgetInput(currentBudget ? String(currentBudget) : "0");
  };

  const handleSaveBudget = async (catId: string) => {
    const val = parseFloat(budgetInput) || 0;
    await updateCategoryBudget(catId, val);
    setEditingBudgetId(null);
    router.refresh();
  };

  const handlePayBill = async (billId: string, billName: string) => {
    setPayingBillId(billId);
    try {
      const res = await payRecurringBill(billId);
      if (res.success) {
        setSuccessPaidMsg(`Logged payment for "${billName}"!`);
        setTimeout(() => setSuccessPaidMsg(null), 3000);
        router.refresh();
      }
    } finally {
      setPayingBillId(null);
    }
  };

  const handleDeleteBill = async (id: string, name: string) => {
    if (!confirm(`Delete recurring bill "${name}"?`)) return;
    await deleteRecurringBill(id);
    router.refresh();
  };

  const todayDay = new Date().getDate();

  return (
    <div className="space-y-8">
      {/* Overall Budget Overview Card */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Monthly Budget Progress
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                {formatCurrency(totalSpent, "USD", currencySymbol)}
              </span>
              <span className="text-sm font-semibold text-zinc-400 font-mono">
                / {formatCurrency(totalBudget, "USD", currencySymbol)}
              </span>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                overallPercent > 100
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  : overallPercent > 75
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              }`}
            >
              {overallPercent.toFixed(0)}% Utilized
            </span>
            <p className="text-xs text-zinc-400 mt-1.5 font-mono">
              Remaining: {formatCurrency(remainingTotal, "USD", currencySymbol)}
            </p>
          </div>
        </div>

        {/* Master Progress Bar */}
        <div className="w-full h-3 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              overallPercent > 100
                ? "bg-rose-500"
                : overallPercent > 75
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(100, overallPercent)}%` }}
          />
        </div>
      </div>

      {/* Category Budgets Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">
            Category Budgets ({expenseCategories.length})
          </h2>
          <span className="text-xs text-zinc-400">Click budget to edit</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {expenseCategories.map((cat) => {
            const budget = cat.monthlyBudget || 0;
            const spent = cat.spentThisMonth;
            const isEditing = editingBudgetId === cat.id;
            const isOver = budget > 0 && spent > budget;
            const pct = budget > 0 ? (spent / budget) * 100 : 0;

            return (
              <div
                key={cat.id}
                className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 hover:border-zinc-700 transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                    >
                      <DynamicIcon name={cat.icon} className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-zinc-100">{cat.name}</h3>
                      <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                        {cat.transactionCount} transactions this month
                      </p>
                    </div>
                  </div>

                  {/* Inline Budget Editor */}
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="any"
                        value={budgetInput}
                        onChange={(e) => setBudgetInput(e.target.value)}
                        className="w-20 bg-zinc-900 border border-emerald-500 rounded-lg px-2 py-1 text-xs text-white font-mono"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveBudget(cat.id)}
                        className="p-1 rounded-lg bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                      <button
                        onClick={() => setEditingBudgetId(null)}
                        className="p-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartEdit(cat.id, cat.monthlyBudget)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white transition-colors"
                      title="Edit Monthly Budget"
                    >
                      <span>
                        Budget: {budget > 0 ? formatCurrency(budget, "USD", currencySymbol) : "Set"}
                      </span>
                      <Edit2 className="w-3 h-3 text-zinc-500" />
                    </button>
                  )}
                </div>

                {/* Spending Amounts */}
                <div className="flex items-center justify-between text-xs font-mono pt-1">
                  <span className="text-zinc-400">
                    Spent:{" "}
                    <strong className="text-white">
                      {formatCurrency(spent, "USD", currencySymbol)}
                    </strong>
                  </span>
                  <span
                    className={
                      isOver
                        ? "text-rose-400 font-bold"
                        : pct > 75
                        ? "text-amber-400 font-medium"
                        : "text-emerald-400 font-medium"
                    }
                  >
                    {budget > 0 ? `${pct.toFixed(0)}%` : "No limit set"}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isOver
                        ? "bg-rose-500"
                        : pct > 75
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>

                {isOver && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Exceeded budget by {formatCurrency(spent - budget, "USD", currencySymbol)}!
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recurring Bills Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Monthly Fixed Recurring Bills</h2>
            <p className="text-xs text-zinc-400">
              Commitments with due date countdown & 1-click payment logging
            </p>
          </div>
          <button
            onClick={() => setIsBillModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-sm shadow-purple-950"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            Add Bill
          </button>
        </div>

        {successPaidMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-400 flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successPaidMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recurringBills.map((bill) => {
            const daysRemaining = bill.dueDay - todayDay;
            const isDueSoon = daysRemaining >= 0 && daysRemaining <= 3;
            const isPastDue = daysRemaining < 0;
            const isToday = daysRemaining === 0;

            return (
              <div
                key={bill.id}
                className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-zinc-700 transition-all group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-zinc-100 truncate">
                      {bill.name}
                    </h4>
                    <span
                      className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                        isToday
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : isDueSoon
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {isToday ? "Due Today" : daysRemaining > 0 ? `In ${daysRemaining}d` : `Passed`}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-1">
                    <Calendar className="w-3 h-3 text-zinc-500" />
                    <span>Day {bill.dueDay} of month</span>
                    <span>•</span>
                    <span className="truncate">{bill.walletName || "Main Wallet"}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-right">
                    <p className="text-xs sm:text-sm font-bold font-mono text-white">
                      {formatCurrency(bill.amount, "USD", currencySymbol)}
                    </p>
                    <span className="text-[10px] text-zinc-400 uppercase font-mono">
                      {bill.frequency}
                    </span>
                  </div>

                  {/* 1-Click Pay Now Button */}
                  <button
                    onClick={() => handlePayBill(bill.id, bill.name)}
                    disabled={payingBillId === bill.id}
                    title="Mark as Paid (logs transaction)"
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 font-semibold text-xs flex items-center gap-1 transition-all active:scale-95"
                  >
                    {payingBillId === bill.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                    <span>Pay</span>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteBill(bill.id, bill.name)}
                    title="Delete Bill"
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <RecurringBillModal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
        wallets={wallets}
        categories={categories}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}
