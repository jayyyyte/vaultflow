import React from "react";
import {
  getCategoriesWithSpending,
  getCategoryAnalytics,
  getNeedsWantsAnalysis,
} from "@/actions/categories";
import { getWalletsWithBalances } from "@/actions/wallets";
import { getRecurringBills } from "@/actions/recurring";
import { getSettingsMap } from "@/actions/settings";
import { getCurrentYearMonth } from "@/lib/utils";
import { BudgetView } from "@/components/budget-view";

export default async function BudgetsPage() {
  const currentMonth = getCurrentYearMonth();
  const [
    categoriesWithSpending,
    wallets,
    recurringBills,
    settingsMap,
    categoryAnalytics,
    needsWantsReport,
  ] = await Promise.all([
    getCategoriesWithSpending(currentMonth),
    getWalletsWithBalances(),
    getRecurringBills(),
    getSettingsMap(),
    getCategoryAnalytics(currentMonth),
    getNeedsWantsAnalysis(currentMonth),
  ]);

  const currencySymbol = settingsMap.currency_symbol || "$";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Ngân sách & Báo cáo Nâng cao
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Quy tắc tài chính 50/30/20, hạn mức ngân sách tháng & hóa đơn định kỳ
        </p>
      </div>

      <BudgetView
        categories={categoriesWithSpending}
        wallets={wallets}
        recurringBills={recurringBills}
        analytics={categoryAnalytics}
        needsWantsReport={needsWantsReport}
        currency={settingsMap.currency || "USD"}
        currencySymbol={currencySymbol}
        currentMonth={currentMonth}
      />
    </div>
  );
}
