import React from "react";
import { getCategoriesWithSpending } from "@/actions/categories";
import { getWalletsWithBalances } from "@/actions/wallets";
import { getRecurringBills } from "@/actions/recurring";
import { getSettingsMap } from "@/actions/settings";
import { getCurrentYearMonth } from "@/lib/utils";
import { BudgetView } from "@/components/budget-view";


export default async function BudgetsPage() {
  const currentMonth = getCurrentYearMonth();
  const [categoriesWithSpending, wallets, recurringBills, settingsMap] = await Promise.all([
    getCategoriesWithSpending(currentMonth),
    getWalletsWithBalances(),
    getRecurringBills(),
    getSettingsMap(),
  ]);

  const currencySymbol = settingsMap.currency_symbol || "$";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Budgets & Recurring Bills
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Monitor spending limits, progress bars, and scheduled fixed commitments
        </p>
      </div>

      <BudgetView
        categories={categoriesWithSpending}
        wallets={wallets}
        recurringBills={recurringBills}
        currencySymbol={currencySymbol}
        currentMonth={currentMonth}
      />
    </div>
  );
}
