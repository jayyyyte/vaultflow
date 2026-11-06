"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createWallet, updateWallet } from "@/actions/wallets";
import { DynamicIcon, WALLET_ICONS } from "./icon-helper";
import { X, Check, Loader2 } from "lucide-react";
import type { WalletWithBalance } from "@/lib/types";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletToEdit?: WalletWithBalance | null;
  currencySymbol?: string;
}

const PRESET_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#8b5cf6", // Purple
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f43f5e", // Rose
  "#64748b", // Slate
];

export function WalletModal({ isOpen, onClose, walletToEdit, currencySymbol = "$" }: WalletModalProps) {
  const router = useRouter();

  const [name, setName] = useState(walletToEdit?.name || "");
  const [type, setType] = useState<"cash" | "bank" | "e_wallet" | "credit">(
    walletToEdit?.type || "bank"
  );
  const [initialBalance, setInitialBalance] = useState<string>(
    walletToEdit ? String(walletToEdit.initialBalance) : "0"
  );
  const [creditLimit, setCreditLimit] = useState<string>(
    walletToEdit?.creditLimit ? String(walletToEdit.creditLimit) : "0"
  );
  const [color, setColor] = useState(walletToEdit?.color || "#3b82f6");
  const [icon, setIcon] = useState(walletToEdit?.icon || "Building2");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Please enter a wallet name");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (walletToEdit) {
        await updateWallet(walletToEdit.id, {
          name: name.trim(),
          type,
          color,
          icon,
          creditLimit: type === "credit" ? parseFloat(creditLimit) || 0 : 0,
        });
      } else {
        await createWallet({
          name: name.trim(),
          type,
          initialBalance: parseFloat(initialBalance) || 0,
          creditLimit: type === "credit" ? parseFloat(creditLimit) || 0 : 0,
          color,
          icon,
        });
      }
      router.refresh();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save wallet");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#121215] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-slideUp">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-base font-bold text-white">
            {walletToEdit ? "Edit Wallet" : "Add New Wallet"}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Wallet Name */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Wallet Name
            </label>
            <input
              type="text"
              placeholder="e.g. Chase Sapphire, Cash Stash, PayPal..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
          </div>

          {/* Wallet Type */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Type</label>
            <div className="grid grid-cols-4 gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              {(
                [
                  { id: "cash", label: "Cash" },
                  { id: "bank", label: "Bank" },
                  { id: "e_wallet", label: "E-Wallet" },
                  { id: "credit", label: "Credit" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setType(t.id);
                    if (t.id === "cash") setIcon("Banknote");
                    if (t.id === "bank") setIcon("Building2");
                    if (t.id === "e_wallet") setIcon("Smartphone");
                    if (t.id === "credit") setIcon("CreditCard");
                  }}
                  className={`py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                    type === t.id
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Initial Balance (only for new wallets) */}
          {!walletToEdit && (
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                {type === "credit" ? "Current Balance / Debt (Negative or 0)" : "Initial Balance"}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="any"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Credit Limit (for Credit Card type) */}
          {type === "credit" && (
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Credit Limit
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="any"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Color Selection */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-zinc-900" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Icon Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-300">Biểu tượng ví</label>
              <span className="text-[11px] text-zinc-400 font-medium">
                {icon}
              </span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {WALLET_ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  title={i}
                  onClick={() => setIcon(i)}
                  className={`h-11 min-w-[44px] rounded-xl flex items-center justify-center transition-all ${
                    icon === i
                      ? "bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500 shadow-sm"
                      : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 active:scale-95"
                  }`}
                >
                  <DynamicIcon name={i} className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>

          {errorMessage && (
            <p className="text-xs text-rose-400 font-medium">{errorMessage}</p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4 stroke-[3]" />
              )}
              {walletToEdit ? "Update Wallet" : "Create Wallet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
