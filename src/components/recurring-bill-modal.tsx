"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createRecurringBill } from "@/actions/recurring";
import { X, Check, Calendar, Loader2 } from "lucide-react";
import type { WalletWithBalance } from "@/lib/types";
import type { Category } from "@/db/schema";

interface RecurringBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletWithBalance[];
  categories: Category[];
  currencySymbol?: string;
}

export function RecurringBillModal({
  isOpen,
  onClose,
  wallets,
  categories,
  currencySymbol = "$",
}: RecurringBillModalProps) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [dueDay, setDueDay] = useState(1);
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [walletId, setWalletId] = useState(wallets[0]?.id || "");
  const [frequency, setFrequency] = useState<"monthly" | "yearly" | "weekly">("monthly");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr);
    if (!name.trim()) {
      setErrorMessage("Please enter a bill name");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage("Amount must be greater than 0");
      return;
    }
    if (dueDay < 1 || dueDay > 31) {
      setErrorMessage("Due day must be between 1 and 31");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await createRecurringBill({
        name: name.trim(),
        amount,
        categoryId: categoryId || undefined,
        walletId: walletId || undefined,
        dueDay,
        frequency,
        note: note.trim() || undefined,
      });

      if (res.success) {
        router.refresh();
        onClose();
      } else {
        setErrorMessage(res.error || "Failed to create recurring bill");
      }
    } catch {
      setErrorMessage("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#121215] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-slideUp">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-base font-bold text-white">Add Recurring Bill</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Bill Name */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Bill Name</label>
            <input
              type="text"
              placeholder="e.g. Rent, Fiber Internet, Netflix, Gym..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Due Day of Month */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Due Day of Month (1 - 31)
            </label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
              <input
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(parseInt(e.target.value) || 1)}
                className="w-24 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono text-center"
              />
              <span className="text-xs text-zinc-400">every month</span>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Target Wallet */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Pay From Wallet</label>
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {errorMessage && (
            <p className="text-xs text-rose-400 font-medium">{errorMessage}</p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-950"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4 stroke-[3]" />
              )}
              Save Recurring Bill
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
