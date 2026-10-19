"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTransaction } from "@/actions/transactions";
import { DynamicIcon } from "./icon-helper";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { TransactionWithDetails, WalletWithBalance } from "@/lib/types";
import type { Category } from "@/db/schema";
import {
  Search,
  Filter,
  Trash2,
  Plus,
  ArrowRightLeft,
  TrendingDown,
  TrendingUp,
  Tag,
  Wallet,
  Calendar,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface TransactionFeedProps {
  initialTransactions: TransactionWithDetails[];
  wallets: WalletWithBalance[];
  categories: Category[];
  currencySymbol?: string;
}

export function TransactionFeed({
  initialTransactions,
  wallets,
  categories,
  currencySymbol = "$",
}: TransactionFeedProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "expense" | "income" | "transfer">("all");
  const [selectedWalletId, setSelectedWalletId] = useState<string>("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter transactions in client for instant responsive search
  const filtered = initialTransactions.filter((tx) => {
    // Type filter
    if (selectedType !== "all" && tx.type !== selectedType) return false;

    // Wallet filter
    if (
      selectedWalletId !== "all" &&
      tx.walletId !== selectedWalletId &&
      tx.destinationWalletId !== selectedWalletId
    ) {
      return false;
    }

    // Category filter
    if (selectedCategoryId !== "all" && tx.categoryId !== selectedCategoryId) return false;

    // Search query filter
    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      const noteMatch = tx.note?.toLowerCase().includes(q);
      const catMatch = tx.categoryName?.toLowerCase().includes(q);
      const walletMatch = tx.walletName?.toLowerCase().includes(q);
      if (!noteMatch && !catMatch && !walletMatch) return false;
    }

    return true;
  });

  // Calculate filtered totals
  let totalIncome = 0;
  let totalExpense = 0;
  for (const tx of filtered) {
    if (tx.type === "income") totalIncome += tx.amount;
    if (tx.type === "expense") totalExpense += tx.amount;
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    setDeletingId(id);
    try {
      await deleteTransaction(id);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenAdd = () => {
    window.dispatchEvent(new CustomEvent("open-quick-add", { detail: { type: "expense" } }));
  };

  return (
    <div className="space-y-5">
      {/* Search and Filters Bar */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-4 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search transactions by note, category, or wallet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Filter Pills Grid */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Type Selector */}
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-0.5 text-xs">
            {(["all", "expense", "income", "transfer"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1 rounded-lg font-medium capitalize transition-all ${
                  selectedType === t
                    ? "bg-zinc-800 text-white shadow-sm font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Wallet Dropdown */}
          <select
            value={selectedWalletId}
            onChange={(e) => setSelectedWalletId(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Wallets</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          {/* Category Dropdown */}
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Summary Metrics */}
        <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400 font-mono">
          <span>{filtered.length} transactions</span>
          <div className="flex items-center gap-4">
            <span className="text-emerald-400">
              +{formatCurrency(totalIncome, "USD", currencySymbol)}
            </span>
            <span className="text-rose-400">
              -{formatCurrency(totalExpense, "USD", currencySymbol)}
            </span>
          </div>
        </div>
      </div>

      {/* Transactions Feed */}
      {filtered.length === 0 ? (
        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-zinc-600 flex items-center justify-center mx-auto">
            <Tag className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-zinc-300">No transactions found</p>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            Try adjusting your search filters or tap Quick Add to log a new entry.
          </p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs hover:bg-emerald-400 transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Log Transaction
          </button>
        </div>
      ) : (
        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl overflow-hidden divide-y divide-zinc-800/60 shadow-sm">
          {filtered.map((tx) => (
            <div
              key={tx.id}
              className="p-4 flex items-center justify-between gap-3 hover:bg-zinc-900/40 transition-colors group"
            >
              {/* Left Details */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                  style={{
                    backgroundColor: tx.categoryColor ? `${tx.categoryColor}25` : "#27272a",
                    color: tx.categoryColor || "#a1a1aa",
                  }}
                >
                  <DynamicIcon name={tx.categoryIcon || "Tag"} className="w-5 h-5" />
                </div>
                <div className="truncate min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-zinc-100 truncate">
                      {tx.note || tx.categoryName || (tx.type === "transfer" ? "Transfer" : "Uncategorized")}
                    </p>
                    {tx.isRecurring && (
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        Recurring
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                    <span>{formatDate(tx.date)}</span>
                    <span>•</span>
                    {tx.type === "transfer" ? (
                      <span className="text-blue-400 truncate">
                        {tx.walletName} → {tx.destinationWalletName || "Wallet"}
                      </span>
                    ) : (
                      <span className="truncate">{tx.walletName}</span>
                    )}
                    {tx.categoryName && tx.type !== "transfer" && (
                      <>
                        <span>•</span>
                        <span className="text-zinc-400 truncate">{tx.categoryName}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Amount & Actions */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p
                    className={`text-sm font-bold font-mono tracking-tight ${
                      tx.type === "income"
                        ? "text-emerald-400"
                        : tx.type === "expense"
                        ? "text-white"
                        : "text-blue-400"
                    }`}
                  >
                    {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}
                    {formatCurrency(tx.amount, "USD", currencySymbol)}
                  </p>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    {tx.type}
                  </span>
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  disabled={deletingId === tx.id}
                  onClick={() => handleDelete(tx.id)}
                  title="Delete transaction"
                  className="opacity-0 group-hover:opacity-100 sm:opacity-70 hover:opacity-100 p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-900/60 transition-all"
                >
                  {deletingId === tx.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
