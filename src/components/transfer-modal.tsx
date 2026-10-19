"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { transferBetweenWallets } from "@/actions/wallets";
import { DynamicIcon } from "./icon-helper";
import { formatCurrency } from "@/lib/utils";
import { X, ArrowRightLeft, Check, Loader2 } from "lucide-react";
import type { WalletWithBalance } from "@/lib/types";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletWithBalance[];
  defaultSourceId?: string;
  currencySymbol?: string;
}

export function TransferModal({
  isOpen,
  onClose,
  wallets,
  defaultSourceId,
  currencySymbol = "$",
}: TransferModalProps) {
  const router = useRouter();

  const [sourceId, setSourceId] = useState<string>(
    defaultSourceId || (wallets.length > 0 ? wallets[0].id : "")
  );
  const [destId, setDestId] = useState<string>(() => {
    const candidate = wallets.find((w) => w.id !== (defaultSourceId || wallets[0]?.id));
    return candidate ? candidate.id : "";
  });
  const [amountStr, setAmountStr] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage("Please enter an amount greater than 0");
      return;
    }
    if (!sourceId || !destId || sourceId === destId) {
      setErrorMessage("Source and destination must be different wallets");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await transferBetweenWallets({
        sourceWalletId: sourceId,
        destinationWalletId: destId,
        amount,
        note: note.trim() || undefined,
      });

      if (res.success) {
        router.refresh();
        onClose();
      } else {
        setErrorMessage(res.error || "Transfer failed");
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
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-blue-400" />
            <h2 className="text-base font-bold text-white">Transfer Funds</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Source Wallet */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">From Wallet</label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({formatCurrency(w.currentBalance, w.currency, currencySymbol)})
                </option>
              ))}
            </select>
          </div>

          {/* Destination Wallet */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">To Wallet</label>
            <select
              value={destId}
              onChange={(e) => setDestId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              {wallets
                .filter((w) => w.id !== sourceId)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatCurrency(w.currentBalance, w.currency, currencySymbol)})
                  </option>
                ))}
            </select>
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
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                autoFocus
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Note</label>
            <input
              type="text"
              placeholder="e.g. ATM withdrawal, Card payment..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          {errorMessage && (
            <p className="text-xs text-rose-400 font-medium">{errorMessage}</p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-950"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4 stroke-[3]" />
              )}
              Confirm Transfer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
