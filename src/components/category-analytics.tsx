"use client";

import React, { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { DynamicIcon } from "./icon-helper";
import type { CategoryAnalytics, CategoryAnalyticsItem } from "@/lib/types";
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  PieChart as PieIcon,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Edit2,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";

interface CategoryAnalyticsViewProps {
  analytics: CategoryAnalytics;
  currency?: string;
  currencySymbol?: string;
  onEditCategory?: (category: any) => void;
  onAddCategory?: (type: "expense" | "income") => void;
}

export function CategoryAnalyticsView({
  analytics,
  currency = "VND",
  currencySymbol = "₫",
  onEditCategory,
  onAddCategory,
}: CategoryAnalyticsViewProps) {
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");

  const categories =
    activeTab === "expense"
      ? analytics.expenseCategories
      : analytics.incomeCategories;

  const totalCurrent =
    activeTab === "expense"
      ? analytics.totalExpenseCurrent
      : analytics.totalIncomeCurrent;

  const totalPrevious =
    activeTab === "expense"
      ? analytics.totalExpensePrevious
      : analytics.totalIncomePrevious;

  const totalMoM =
    totalPrevious > 0
      ? ((totalCurrent - totalPrevious) / totalPrevious) * 100
      : totalCurrent > 0
      ? 100
      : 0;

  const { insights } = analytics;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header & Type Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121215] border border-zinc-800/80 rounded-2xl p-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              Phân tích Dữ liệu Danh mục
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            So sánh chi tiêu, biến động theo tháng & mức độ sử dụng ngân sách
          </p>
        </div>

        {/* Toggle Expense vs Income */}
        <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("expense")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === "expense"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            Chi tiêu ({analytics.expenseCategories.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("income")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === "income"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Thu nhập ({analytics.incomeCategories.length})
          </button>
        </div>
      </div>

      {/* 2. Top Analytical KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Total & MoM */}
        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Tổng {activeTab === "expense" ? "Chi tiêu" : "Thu nhập"} Tháng này
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black font-mono text-white">
              {formatCurrency(totalCurrent, currency, currencySymbol)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs pt-1">
            {totalMoM >= 0 ? (
              <span
                className={`font-semibold flex items-center ${
                  activeTab === "expense" ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                +{totalMoM.toFixed(1)}%
              </span>
            ) : (
              <span
                className={`font-semibold flex items-center ${
                  activeTab === "expense" ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                {totalMoM.toFixed(1)}%
              </span>
            )}
            <span className="text-zinc-500 text-[11px]">
              so với tháng trước ({formatCurrency(totalPrevious, currency, currencySymbol)})
            </span>
          </div>
        </div>

        {/* Card 2: Top Category */}
        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            {activeTab === "expense" ? "Chi tiêu lớn nhất" : "Nguồn thu lớn nhất"}
          </span>
          {categories[0] && categories[0].currentAmount > 0 ? (
            <div>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: `${categories[0].color}25`,
                    color: categories[0].color,
                  }}
                >
                  <DynamicIcon name={categories[0].icon} className="w-3.5 h-3.5" />
                </div>
                <span className="text-base font-bold text-zinc-100 truncate">
                  {categories[0].name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono mt-1 text-zinc-400">
                <span className="text-white font-bold">
                  {formatCurrency(categories[0].currentAmount, currency, currencySymbol)}
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">
                  {categories[0].shareOfTotal.toFixed(1)}% tổng số
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 pt-2">Chưa có giao dịch tháng này</p>
          )}
        </div>

        {/* Card 3: Budget Health (for Expenses) / Transaction Volume (for Income) */}
        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            {activeTab === "expense" ? "Sức khỏe Ngân sách" : "Tần suất giao dịch"}
          </span>
          {activeTab === "expense" ? (
            <div className="pt-1 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Vượt hạn mức:</span>
                <span
                  className={`font-mono font-bold ${
                    insights.overBudgetCount > 0 ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {insights.overBudgetCount} danh mục
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Sắp chạm trần (≥80%):</span>
                <span
                  className={`font-mono font-bold ${
                    insights.nearLimitCount > 0 ? "text-amber-400" : "text-zinc-300"
                  }`}
                >
                  {insights.nearLimitCount} danh mục
                </span>
              </div>
            </div>
          ) : (
            <div className="pt-1">
              <span className="text-xl font-black font-mono text-white">
                {categories.reduce((acc, c) => acc + c.transactionCount, 0)}
              </span>
              <p className="text-xs text-zinc-400 mt-1">Giao dịch thu nhập được ghi nhận</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Visual Distribution Bar */}
      {totalCurrent > 0 && (
        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-200">
              Tỷ trọng Phân bổ {activeTab === "expense" ? "Chi tiêu" : "Thu nhập"}
            </span>
            <span className="text-[11px] text-zinc-400 font-mono">100%</span>
          </div>

          {/* Segmented Colorful Bar */}
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-zinc-900 border border-zinc-800">
            {categories
              .filter((c) => c.shareOfTotal > 0)
              .map((cat) => (
                <div
                  key={cat.id}
                  style={{
                    width: `${cat.shareOfTotal}%`,
                    backgroundColor: cat.color,
                  }}
                  title={`${cat.name}: ${cat.shareOfTotal.toFixed(1)}%`}
                  className="h-full transition-all hover:opacity-85"
                />
              ))}
          </div>

          {/* Top 4 Legend Badges */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {categories.slice(0, 4).map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: c.color }}
                />
                <span className="text-zinc-300 truncate max-w-[120px]">{c.name}</span>
                <span className="text-zinc-500 font-mono text-[11px]">
                  ({c.shareOfTotal.toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Detailed Category Analytics List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-white">
            Chi tiết từng Danh mục ({categories.length})
          </h3>
          <button
            type="button"
            onClick={() => onAddCategory?.(activeTab)}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            Thêm danh mục
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="p-8 text-center bg-[#121215] border border-dashed border-zinc-800 rounded-2xl space-y-3">
            <p className="text-xs text-zinc-400">
              Chưa có danh mục {activeTab === "expense" ? "chi tiêu" : "thu nhập"} nào
            </p>
            <button
              type="button"
              onClick={() => onAddCategory?.(activeTab)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Tạo danh mục đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categories.map((cat) => {
              const isOver = cat.status === "over_budget";
              const isWarn = cat.status === "warning";
              const momChange = cat.momGrowth;

              return (
                <div
                  key={cat.id}
                  className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-4 hover:border-zinc-700 transition-all space-y-3 group"
                >
                  {/* Category Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                      >
                        <DynamicIcon name={cat.icon} className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-bold text-zinc-100 truncate">
                            {cat.name}
                          </h4>
                          {isOver && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              Vượt NS
                            </span>
                          )}
                          {isWarn && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Sắp chạm
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                          {cat.transactionCount} giao dịch • TB:{" "}
                          {formatCurrency(cat.avgPerTransaction, currency, currencySymbol)}
                        </p>
                      </div>
                    </div>

                    {/* Edit Category Button */}
                    <button
                      type="button"
                      onClick={() => onEditCategory?.(cat)}
                      className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
                      title="Chỉnh sửa danh mục"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Amounts & MoM Growth */}
                  <div className="flex items-center justify-between text-xs font-mono pt-1">
                    <div>
                      <span className="text-zinc-400 text-[11px] block">
                        {activeTab === "expense" ? "Đã chi" : "Đã nhận"}
                      </span>
                      <span className="text-sm font-bold text-white">
                        {formatCurrency(cat.currentAmount, currency, currencySymbol)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-zinc-400 text-[11px] block">So với tháng trước</span>
                      <div className="flex items-center justify-end gap-1 font-semibold">
                        {cat.previousAmount === 0 && cat.currentAmount === 0 ? (
                          <span className="text-zinc-500">0%</span>
                        ) : momChange >= 0 ? (
                          <span
                            className={`flex items-center ${
                              activeTab === "expense" ? "text-rose-400" : "text-emerald-400"
                            }`}
                          >
                            <ArrowUpRight className="w-3 h-3" />
                            +{momChange.toFixed(0)}%
                          </span>
                        ) : (
                          <span
                            className={`flex items-center ${
                              activeTab === "expense" ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            <ArrowDownRight className="w-3 h-3" />
                            {momChange.toFixed(0)}%
                          </span>
                        )}
                        <span className="text-zinc-500 text-[10px]">
                          ({formatCurrency(cat.previousAmount, currency, currencySymbol)})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Budget Bar if Budget is set */}
                  {activeTab === "expense" && cat.monthlyBudget > 0 && (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-zinc-400">
                          Hạn mức: {formatCurrency(cat.monthlyBudget, currency, currencySymbol)}
                        </span>
                        <span
                          className={
                            isOver
                              ? "text-rose-400 font-bold"
                              : isWarn
                              ? "text-amber-400 font-bold"
                              : "text-emerald-400"
                          }
                        >
                          {cat.budgetUtilization.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOver
                              ? "bg-rose-500"
                              : isWarn
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(100, cat.budgetUtilization)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
