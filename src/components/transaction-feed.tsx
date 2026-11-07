"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTransaction } from "@/actions/transactions";
import { DynamicIcon } from "./icon-helper";
import { formatCurrency, formatDate } from "@/lib/utils";
import { QuickTransactionModal } from "./quick-transaction-modal";
import { useToast } from "./toast-provider";
import type { TransactionWithDetails, WalletWithBalance } from "@/lib/types";
import type { Category } from "@/db/schema";
import {
  Search,
  Filter,
  Trash2,
  Edit2,
  Plus,
  ArrowRightLeft,
  TrendingDown,
  TrendingUp,
  Tag,
  Wallet,
  Calendar,
  AlertTriangle,
  Loader2,
  ChevronRight,
} from "lucide-react";

interface TransactionFeedProps {
  initialTransactions: TransactionWithDetails[];
  wallets: WalletWithBalance[];
  categories: Category[];
  currency?: string;
  currencySymbol?: string;
}

export function TransactionFeed({
  initialTransactions,
  wallets,
  categories,
  currency = "USD",
  currencySymbol = "$",
}: TransactionFeedProps) {
  const router = useRouter();
  const { toast, confirm } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "expense" | "income" | "transfer">("all");
  const [selectedWalletId, setSelectedWalletId] = useState<string>("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit modal state
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithDetails | null>(null);

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

  // Group filtered transactions by date
  interface DateGroup {
    date: string;
    items: TransactionWithDetails[];
    dayExpense: number;
    dayIncome: number;
  }

  const groupedByDate: DateGroup[] = [];
  const dateMap = new Map<string, DateGroup>();

  for (const tx of filtered) {
    let group = dateMap.get(tx.date);
    if (!group) {
      group = { date: tx.date, items: [], dayExpense: 0, dayIncome: 0 };
      dateMap.set(tx.date, group);
      groupedByDate.push(group);
    }
    group.items.push(tx);
    if (tx.type === "expense") group.dayExpense += tx.amount;
    if (tx.type === "income") group.dayIncome += tx.amount;
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent opening edit modal
    const ok = await confirm({
      title: "Xác nhận xóa giao dịch",
      message: "Bạn có chắc chắn muốn xóa giao dịch này không? Hành động này sẽ cập nhật lại số dư ví.",
      confirmText: "Xóa",
      isDestructive: true,
    });
    if (!ok) return;

    setDeletingId(id);
    try {
      const res = await deleteTransaction(id);
      if (res.success) {
        toast.success("Đã xóa giao dịch thành công");
        router.refresh();
      } else {
        toast.error(res.error || "Không thể xóa giao dịch");
      }
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
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-4 space-y-3 shadow-sm">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo ghi chú, danh mục, hoặc ví..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Filter Pills Grid */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Type Selector */}
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-0.5 text-xs">
            {[
              { id: "all", label: "Tất cả" },
              { id: "expense", label: "Chi tiêu" },
              { id: "income", label: "Thu nhập" },
              { id: "transfer", label: "Chuyển tiền" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id as any)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  selectedType === t.id
                    ? "bg-zinc-800 text-white shadow-sm font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Wallet Dropdown */}
          <select
            value={selectedWalletId}
            onChange={(e) => setSelectedWalletId(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Tất cả ví ({wallets.length})</option>
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
            <option value="all">Tất cả danh mục ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Summary Metrics */}
        <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400 font-mono">
          <span>{filtered.length} giao dịch</span>
          <div className="flex items-center gap-3">
            {totalIncome > 0 && (
              <span className="text-emerald-400">
                +{formatCurrency(totalIncome, currency, currencySymbol)}
              </span>
            )}
            {totalExpense > 0 && (
              <span className="text-rose-400">
                -{formatCurrency(totalExpense, currency, currencySymbol)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Transactions Feed - Grouped by Date */}
      {filtered.length === 0 ? (
        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-zinc-600 flex items-center justify-center mx-auto">
            <Tag className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-zinc-300">Không tìm thấy giao dịch nào</p>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            Thử điều chỉnh bộ lọc tìm kiếm hoặc bấm nút bên dưới để ghi giao dịch mới.
          </p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs hover:bg-emerald-400 transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Thêm Giao dịch
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map((group) => (
            <div
              key={group.date}
              className="bg-[#121215] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Date Header Strip */}
              <div className="px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800/60 flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  {formatDate(group.date)}
                </span>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  {group.dayIncome > 0 && (
                    <span className="text-emerald-400">
                      +{formatCurrency(group.dayIncome, currency, currencySymbol)}
                    </span>
                  )}
                  {group.dayExpense > 0 && (
                    <span className="text-zinc-400">
                      -{formatCurrency(group.dayExpense, currency, currencySymbol)}
                    </span>
                  )}
                </div>
              </div>

              {/* Transactions in this Date Group */}
              <div className="divide-y divide-zinc-800/50">
                {group.items.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => setEditingTransaction(tx)}
                    role="button"
                    tabIndex={0}
                    className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-zinc-900/50 active:bg-zinc-900/70 transition-colors cursor-pointer group"
                  >
                    {/* Left Icon & Details */}
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
                            {tx.note || tx.categoryName || (tx.type === "transfer" ? "Chuyển tiền" : "Chưa phân loại")}
                          </p>
                          {tx.isRecurring && (
                            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              Định kỳ
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
                          {tx.type === "transfer" ? (
                            <span className="text-blue-400 truncate">
                              {tx.walletName} → {tx.destinationWalletName || "Ví nhận"}
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

                    {/* Right Amount & Quick Actions */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
                          {formatCurrency(tx.amount, currency, currencySymbol)}
                        </p>
                        <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                          {tx.type === "expense" ? "Chi" : tx.type === "income" ? "Thu" : "Chuyển"}
                        </span>
                      </div>

                      {/* Quick Delete Action */}
                      <button
                        type="button"
                        disabled={deletingId === tx.id}
                        onClick={(e) => handleDelete(e, tx.id)}
                        title="Xóa giao dịch"
                        className="p-1.5 sm:p-2 rounded-lg bg-zinc-900 border border-zinc-800/80 text-zinc-500 hover:text-rose-400 hover:border-rose-900/60 active:scale-95 transition-all"
                      >
                        {deletingId === tx.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Tap Arrow Indicator */}
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <QuickTransactionModal
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
          wallets={wallets}
          categories={categories}
          currency={currency}
          currencySymbol={currencySymbol}
          transactionToEdit={editingTransaction}
          onSuccess={() => {
            setEditingTransaction(null);
            router.refresh();
          }}
          onDeleteSuccess={() => {
            setEditingTransaction(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
