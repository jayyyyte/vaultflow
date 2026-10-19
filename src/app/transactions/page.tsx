import React from "react";
import { getTransactions } from "@/actions/transactions";
import { getWalletsWithBalances } from "@/actions/wallets";
import { getCategories } from "@/actions/categories";
import { getSettingsMap } from "@/actions/settings";
import { TransactionFeed } from "@/components/transaction-feed";
import { Plus } from "lucide-react";


export default async function TransactionsPage() {
  const [allTransactions, wallets, categories, settingsMap] = await Promise.all([
    getTransactions(),
    getWalletsWithBalances(),
    getCategories(),
    getSettingsMap(),
  ]);

  const currencySymbol = settingsMap.currency_symbol || "$";

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Transactions
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Complete transaction ledger with filters and instant search
          </p>
        </div>
      </div>

      <TransactionFeed
        initialTransactions={allTransactions}
        wallets={wallets}
        categories={categories}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}
