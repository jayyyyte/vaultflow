import React from "react";
import { getWalletsWithBalances } from "@/actions/wallets";
import { getSettingsMap } from "@/actions/settings";
import { WalletList } from "@/components/wallet-list";


export default async function WalletsPage() {
  const [wallets, settingsMap] = await Promise.all([
    getWalletsWithBalances(),
    getSettingsMap(),
  ]);

  const currencySymbol = settingsMap.currency_symbol || "$";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Wallets & Accounts
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time multi-account tracking: Cash, Checking, E-Wallets & Credit Cards
          </p>
        </div>
      </div>

      <WalletList
        initialWallets={wallets}
        currency={settingsMap.currency || "USD"}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}
