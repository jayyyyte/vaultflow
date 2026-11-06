import React from "react";
import { getCategoriesWithSpending, getCategoryAnalytics } from "@/actions/categories";
import { getWalletsWithBalances } from "@/actions/wallets";
import { getRecurringBills } from "@/actions/recurring";
import { getSettingsMap } from "@/actions/settings";
import { getCurrentYearMonth } from "@/lib/utils";
import { BudgetView } from "@/components/budget-view";

export default async function BudgetsPage() {
  const currentMonth = getCurrentYearMonth();
  const [categoriesWithSpending, wallets, recurringBills, settingsMap, categoryAnalytics] = await Promise.all([
    getCategoriesWithSpending(currentMonth),
    getWalletsWithBalances(),
    getRecurringBills(),
    getSettingsMap(),
    getCategoryAnalytics(currentMonth),
  ]);

  const currencySymbol = settingsMap.currency_symbol || "$";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Ngân sách & Phân tích Danh mục
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Theo dõi hạn mức ngân sách, phân tích biến động chi tiêu và hóa đơn cố định
        </p>
      </div>

      <BudgetView
        categories={categoriesWithSpending}
        wallets={wallets}
        recurringBills={recurringBills}
        analytics={categoryAnalytics}
        currency={settingsMap.currency || "USD"}
        currencySymbol={currencySymbol}
        currentMonth={currentMonth}
      />
    </div>
  );
}
