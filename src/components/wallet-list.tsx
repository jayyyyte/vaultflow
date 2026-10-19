"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { archiveWallet } from "@/actions/wallets";
import { DynamicIcon } from "./icon-helper";
import { formatCurrency } from "@/lib/utils";
import { WalletModal } from "./wallet-modal";
import { TransferModal } from "./transfer-modal";
import type { WalletWithBalance } from "@/lib/types";
import {
  Plus,
  ArrowRightLeft,
  Edit2,
  Archive,
  CreditCard,
  Building2,
  Banknote,
  Smartphone,
  TrendingUp,
  TrendingDown,
  Shield,
  Layers,
} from "lucide-react";

interface WalletListProps {
  initialWallets: WalletWithBalance[];
  currencySymbol?: string;
}

export function WalletList({ initialWallets, currencySymbol = "$" }: WalletListProps) {
  const router = useRouter();
  const [wallets, setWallets] = useState(initialWallets);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletWithBalance | null>(null);
  const [transferSourceWalletId, setTransferSourceWalletId] = useState<string | null>(null);

  // Compute overall aggregates
  let totalLiquid = 0;
  let totalCreditDebt = 0;

  for (const w of initialWallets) {
    if (w.type === "credit") {
      if (w.currentBalance < 0) totalCreditDebt += Math.abs(w.currentBalance);
    } else {
      totalLiquid += Math.max(0, w.currentBalance);
    }
  }

  const netWorth = totalLiquid - totalCreditDebt;

  const handleArchive = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to archive wallet "${name}"?`)) return;
    await archiveWallet(id);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Aggregates Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Total Liquid Balance
          </span>
          <p className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
            {formatCurrency(totalLiquid, "USD", currencySymbol)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">Across Cash, Bank & E-Wallets</p>
        </div>

        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Total Credit Debt
          </span>
          <p className="text-xl sm:text-2xl font-black text-amber-400 font-mono mt-1">
            {formatCurrency(totalCreditDebt, "USD", currencySymbol)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">Outstanding credit card balance</p>
        </div>

        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Net Assets
          </span>
          <p
            className={`text-xl sm:text-2xl font-black font-mono mt-1 ${
              netWorth >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {formatCurrency(netWorth, "USD", currencySymbol)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">Liquid minus credit liabilities</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-white">Active Accounts ({initialWallets.length})</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTransferSourceWalletId(initialWallets[0]?.id || null)}
            disabled={initialWallets.length < 2}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 active:scale-95 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition-all disabled:opacity-40"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
            Transfer
          </button>
          <button
            onClick={() => {
              setEditingWallet(null);
              setIsAddOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-xs font-bold text-zinc-950 flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-950"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            New Wallet
          </button>
        </div>
      </div>

      {/* Wallet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {initialWallets.map((wallet) => {
          const isCredit = wallet.type === "credit";
          const creditLimit = wallet.creditLimit || 0;
          const debt = Math.abs(Math.min(0, wallet.currentBalance));
          const availableCredit = isCredit && creditLimit > 0 ? Math.max(0, creditLimit - debt) : 0;
          const utilizationRate = isCredit && creditLimit > 0 ? (debt / creditLimit) * 100 : 0;

          return (
            <div
              key={wallet.id}
              className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-5 hover:border-zinc-700 transition-all space-y-4 group relative overflow-hidden"
            >
              {/* Wallet Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                    style={{ backgroundColor: `${wallet.color}25`, color: wallet.color }}
                  >
                    <DynamicIcon name={wallet.icon} className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">{wallet.name}</h3>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 mt-0.5 inline-block">
                      {wallet.type.replace("_", "-")}
                    </span>
                  </div>
                </div>

                {/* Edit & Archive actions */}
                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingWallet(wallet);
                      setIsAddOpen(true);
                    }}
                    title="Edit Wallet"
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleArchive(wallet.id, wallet.name)}
                    title="Archive Wallet"
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition-colors"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Balance Section */}
              <div className="pt-1">
                <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                  {isCredit ? "Current Balance / Debt" : "Current Balance"}
                </p>
                <p
                  className={`text-2xl font-black font-mono tracking-tight ${
                    isCredit && wallet.currentBalance < 0
                      ? "text-amber-400"
                      : wallet.currentBalance < 0
                      ? "text-rose-400"
                      : "text-white"
                  }`}
                >
                  {formatCurrency(wallet.currentBalance, wallet.currency, currencySymbol)}
                </p>
              </div>

              {/* Credit Card Utilization Bar */}
              {isCredit && creditLimit > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-zinc-800/60">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400">
                      Avail: {formatCurrency(availableCredit, wallet.currency, currencySymbol)}
                    </span>
                    <span className="text-zinc-400">
                      Limit: {formatCurrency(creditLimit, wallet.currency, currencySymbol)}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        utilizationRate > 80
                          ? "bg-rose-500"
                          : utilizationRate > 50
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, utilizationRate)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-400 text-right font-mono">
                    {utilizationRate.toFixed(1)}% limit utilized
                  </p>
                </div>
              )}

              {/* Card Footer Quick Actions */}
              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px]">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +{formatCurrency(wallet.totalIncome, wallet.currency, currencySymbol)}
                  </span>
                  <span className="text-rose-400 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    -{formatCurrency(wallet.totalExpense, wallet.currency, currencySymbol)}
                  </span>
                </div>

                <button
                  onClick={() => setTransferSourceWalletId(wallet.id)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-semibold text-zinc-300 hover:text-white flex items-center gap-1 transition-colors border border-zinc-800"
                >
                  <ArrowRightLeft className="w-3 h-3 text-blue-400" />
                  Transfer
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Wallet Modal */}
      <WalletModal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setEditingWallet(null);
        }}
        walletToEdit={editingWallet}
        currencySymbol={currencySymbol}
      />

      {/* Transfer Modal */}
      {transferSourceWalletId && (
        <TransferModal
          isOpen={!!transferSourceWalletId}
          onClose={() => setTransferSourceWalletId(null)}
          wallets={initialWallets}
          defaultSourceId={transferSourceWalletId}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
}
