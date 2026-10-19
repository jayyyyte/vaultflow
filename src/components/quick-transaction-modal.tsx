"use client";

import React, { useState, useEffect } from "react";
import { createTransaction } from "@/actions/transactions";
import { DynamicIcon } from "./icon-helper";
import { formatCurrency } from "@/lib/utils";
import type { WalletWithBalance } from "@/lib/types";
import type { Category } from "@/db/schema";
import {
  X,
  Plus,
  ArrowRightLeft,
  TrendingDown,
  TrendingUp,
  Calendar,
  FileText,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletWithBalance[];
  categories: Category[];
  currencySymbol?: string;
  defaultType?: "expense" | "income" | "transfer";
  defaultWalletId?: string;
  onSuccess?: () => void;
}

export function QuickTransactionModal({
  isOpen,
  onClose,
  wallets,
  categories,
  currencySymbol = "$",
  defaultType = "expense",
  defaultWalletId,
  onSuccess,
}: QuickTransactionModalProps) {
  const [type, setType] = useState<"expense" | "income" | "transfer">(defaultType);
  const [amountStr, setAmountStr] = useState<string>("");
  const [selectedWalletId, setSelectedWalletId] = useState<string>(
    defaultWalletId || (wallets.length > 0 ? wallets[0].id : "")
  );
  const [destinationWalletId, setDestinationWalletId] = useState<string>(
    wallets.length > 1 ? wallets[1].id : ""
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when opened
  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setAmountStr("");
      setErrorMessage(null);
      setDate(new Date().toISOString().split("T")[0]);
      if (defaultWalletId) {
        setSelectedWalletId(defaultWalletId);
      } else if (wallets.length > 0 && !selectedWalletId) {
        setSelectedWalletId(wallets[0].id);
      }
      if (wallets.length > 1 && !destinationWalletId) {
        const other = wallets.find((w) => w.id !== (defaultWalletId || wallets[0].id));
        if (other) setDestinationWalletId(other.id);
      }
    }
  }, [isOpen, defaultType, defaultWalletId, wallets]);

  // Set default category when type changes
  useEffect(() => {
    const availableCategories = categories.filter((c) => c.type === type);
    if (availableCategories.length > 0) {
      setSelectedCategoryId(availableCategories[0].id);
    } else {
      setSelectedCategoryId("");
    }
  }, [type, categories]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleAddIncrement = (inc: number) => {
    const current = parseFloat(amountStr) || 0;
    setAmountStr((current + inc).toFixed(current % 1 === 0 && inc % 1 === 0 ? 0 : 2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amountStr);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage("Please enter a valid amount");
      return;
    }

    if (!selectedWalletId) {
      setErrorMessage("Please select a wallet");
      return;
    }

    if (type === "transfer" && !destinationWalletId) {
      setErrorMessage("Please select a destination wallet");
      return;
    }

    if (type === "transfer" && selectedWalletId === destinationWalletId) {
      setErrorMessage("Source and destination wallets must be different");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await createTransaction({
        amount: numericAmount,
        type,
        walletId: selectedWalletId,
        categoryId: type === "transfer" ? undefined : selectedCategoryId || undefined,
        destinationWalletId: type === "transfer" ? destinationWalletId : undefined,
        date,
        note: note.trim() || undefined,
      });

      if (res.success) {
        onSuccess?.();
        onClose();
      } else {
        setErrorMessage(res.error || "Failed to log transaction");
      }
    } catch {
      setErrorMessage("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      {/* Modal Card / Bottom Sheet on Mobile */}
      <div className="w-full max-w-lg bg-[#121215] border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-white">Log Transaction</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800/70 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* 1. Transaction Type Segmented Switcher */}
          <div className="grid grid-cols-3 gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800/80">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                type === "expense"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                type === "income"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Income
            </button>
            <button
              type="button"
              onClick={() => setType("transfer")}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                type === "transfer"
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Transfer
            </button>
          </div>

          {/* 2. Amount Input Section */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 text-center">
            <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 block mb-1">
              Amount
            </label>
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl font-bold text-zinc-400">{currencySymbol}</span>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                autoFocus
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-48 bg-transparent text-3xl font-extrabold text-white text-center focus:outline-none placeholder-zinc-700"
              />
            </div>

            {/* Quick Increment Chips for Mobile One-Thumb Speed */}
            <div className="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t border-zinc-800/50 flex-wrap">
              {[5, 10, 20, 50, 100].map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => handleAddIncrement(inc)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 active:scale-95 text-xs font-semibold text-zinc-300 transition-all border border-zinc-700/60"
                >
                  +{inc}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Category Picker (for Income & Expense) */}
          {type !== "transfer" && (
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-2">Category</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
                {filteredCategories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/10 text-white shadow-sm ring-1 ring-emerald-500/40"
                          : "border-zinc-800/80 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center mb-1"
                        style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                      >
                        <DynamicIcon name={cat.icon} className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-medium truncate w-full">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Wallet Picker */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2">
              {type === "transfer" ? "From Wallet" : "Account / Wallet"}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {wallets.map((w) => {
                const isSelected = selectedWalletId === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setSelectedWalletId(w.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10 text-white ring-1 ring-emerald-500/40"
                        : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${w.color}25`, color: w.color }}
                    >
                      <DynamicIcon name={w.icon} className="w-4 h-4" />
                    </div>
                    <div className="truncate min-w-0">
                      <p className="text-xs font-medium text-zinc-200 truncate">{w.name}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">
                        {formatCurrency(w.currentBalance, w.currency, currencySymbol)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Destination Wallet for Transfer */}
          {type === "transfer" && (
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-2">To Wallet</label>
              <div className="grid grid-cols-2 gap-2">
                {wallets.map((w) => {
                  const isSelected = destinationWalletId === w.id;
                  const isSource = selectedWalletId === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      disabled={isSource}
                      onClick={() => setDestinationWalletId(w.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                        isSource
                          ? "opacity-40 cursor-not-allowed border-zinc-800"
                          : isSelected
                          ? "border-blue-500 bg-blue-500/10 text-white ring-1 ring-blue-500/40"
                          : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${w.color}25`, color: w.color }}
                      >
                        <DynamicIcon name={w.icon} className="w-4 h-4" />
                      </div>
                      <div className="truncate min-w-0">
                        <p className="text-xs font-medium text-zinc-200 truncate">{w.name}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          {formatCurrency(w.currentBalance, w.currency, currencySymbol)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Date & Quick Shortcuts */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Date
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDate(todayStr)}
                  className={`text-[11px] px-2 py-0.5 rounded font-medium transition-colors ${
                    date === todayStr ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setDate(yesterdayStr)}
                  className={`text-[11px] px-2 py-0.5 rounded font-medium transition-colors ${
                    date === yesterdayStr ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Yesterday
                </button>
              </div>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 6. Note */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Trader Joe's groceries, client invoice..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-center gap-2 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${
                type === "expense"
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50"
                  : type === "income"
                  ? "bg-emerald-600 hover:bg-emerald-500 text-zinc-950 shadow-emerald-950/50"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/50"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  Log {type.charAt(0).toUpperCase() + type.slice(1)}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
