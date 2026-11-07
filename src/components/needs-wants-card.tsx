"use client";

import React, { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { DynamicIcon } from "./icon-helper";
import type { NeedsWantsReport } from "@/lib/types";
import {
  PieChart as PieIcon,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingDown,
  TrendingUp,
  PiggyBank,
  Home,
  PartyPopper,
} from "lucide-react";

interface NeedsWantsCardProps {
  report: NeedsWantsReport;
  currency?: string;
  currencySymbol?: string;
}

export function NeedsWantsCard({
  report,
  currency = "VND",
  currencySymbol = "₫",
}: NeedsWantsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { needs, wants, savings, healthScore, assessment } = report;

  const scoreColor =
    healthScore >= 80
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
      : healthScore >= 60
      ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
      : "text-rose-400 bg-rose-500/10 border-rose-500/30";

  return (
    <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-5 space-y-5 shadow-sm animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              Quy tắc Tài chính 50/30/20 (Needs vs. Wants)
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Phân bổ thu nhập vào Thiết yếu (50%), Hưởng thụ (30%) & Tích lũy (20%)
          </p>
        </div>

        {/* Health Score Badge */}
        <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 self-start sm:self-auto ${scoreColor}`}>
          <ShieldCheck className="w-4 h-4" />
          <span className="text-xs font-black font-mono">Điểm sức khỏe: {healthScore}/100</span>
        </div>
      </div>

      {/* 3 Progress Bars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Needs Card */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
              <Home className="w-3.5 h-3.5" />
              <span>Thiết yếu (Needs)</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300">
              Mục tiêu 50%
            </span>
          </div>

          <div className="flex items-baseline justify-between font-mono">
            <span className="text-lg font-black text-white">
              {formatCurrency(needs.total, currency, currencySymbol)}
            </span>
            <span
              className={`text-xs font-bold ${
                needs.percentOfIncome > 55
                  ? "text-rose-400"
                  : needs.percentOfIncome > 50
                  ? "text-amber-400"
                  : "text-blue-400"
              }`}
            >
              {needs.percentOfIncome.toFixed(0)}%
            </span>
          </div>

          {/* Bar with 50% Target Marker */}
          <div className="space-y-1">
            <div className="relative w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  needs.percentOfIncome > 55
                    ? "bg-rose-500"
                    : needs.percentOfIncome > 50
                    ? "bg-amber-500"
                    : "bg-blue-500"
                }`}
                style={{ width: `${Math.min(100, needs.percentOfIncome)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>0%</span>
              <span className="text-zinc-400">| Chuẩn 50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* 2. Wants Card */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
              <PartyPopper className="w-3.5 h-3.5" />
              <span>Hưởng thụ (Wants)</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300">
              Mục tiêu 30%
            </span>
          </div>

          <div className="flex items-baseline justify-between font-mono">
            <span className="text-lg font-black text-white">
              {formatCurrency(wants.total, currency, currencySymbol)}
            </span>
            <span
              className={`text-xs font-bold ${
                wants.percentOfIncome > 35
                  ? "text-rose-400"
                  : wants.percentOfIncome > 30
                  ? "text-amber-400"
                  : "text-purple-400"
              }`}
            >
              {wants.percentOfIncome.toFixed(0)}%
            </span>
          </div>

          {/* Bar with 30% Target Marker */}
          <div className="space-y-1">
            <div className="relative w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  wants.percentOfIncome > 35
                    ? "bg-rose-500"
                    : wants.percentOfIncome > 30
                    ? "bg-amber-500"
                    : "bg-purple-500"
                }`}
                style={{ width: `${Math.min(100, wants.percentOfIncome)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>0%</span>
              <span className="text-zinc-400">| Chuẩn 30%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* 3. Savings Card */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <PiggyBank className="w-3.5 h-3.5" />
              <span>Tích lũy & Dư (Savings)</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
              Mục tiêu 20%
            </span>
          </div>

          <div className="flex items-baseline justify-between font-mono">
            <span className="text-lg font-black text-white">
              {formatCurrency(savings.total, currency, currencySymbol)}
            </span>
            <span
              className={`text-xs font-bold ${
                savings.percentOfIncome >= 20 ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {savings.percentOfIncome.toFixed(0)}%
            </span>
          </div>

          {/* Bar with 20% Target Marker */}
          <div className="space-y-1">
            <div className="relative w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(100, savings.percentOfIncome)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>0%</span>
              <span className="text-zinc-400">| Chuẩn 20%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assessment Advice Banner */}
      <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-zinc-100">{assessment.title}</h4>
          <p className="text-xs text-zinc-400 leading-relaxed">{assessment.description}</p>
        </div>
      </div>

      {/* Toggle Details Breakdown */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-semibold transition-colors"
        >
          <span>{isExpanded ? "Thu gọn danh mục phân bổ" : "Xem chi tiết các danh mục thuộc mỗi nhóm"}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 mt-3 border-t border-zinc-800/60 animate-fadeIn">
            {/* Needs List */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-blue-400 block uppercase tracking-wider">
                Khoản chi Thiết yếu ({needs.categories.length})
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {needs.categories.map((c) => (
                  <div
                    key={c.id}
                    className="p-2 rounded-lg bg-zinc-900/50 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${c.color}25`, color: c.color }}
                      >
                        <DynamicIcon name={c.icon} className="w-3 h-3" />
                      </div>
                      <span className="truncate text-zinc-200">{c.name}</span>
                    </div>
                    <span className="font-mono text-zinc-300 font-semibold shrink-0">
                      {formatCurrency(c.amount, currency, currencySymbol)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Wants List */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-purple-400 block uppercase tracking-wider">
                Khoản chi Hưởng thụ ({wants.categories.length})
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {wants.categories.map((c) => (
                  <div
                    key={c.id}
                    className="p-2 rounded-lg bg-zinc-900/50 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${c.color}25`, color: c.color }}
                      >
                        <DynamicIcon name={c.icon} className="w-3 h-3" />
                      </div>
                      <span className="truncate text-zinc-200">{c.name}</span>
                    </div>
                    <span className="font-mono text-zinc-300 font-semibold shrink-0">
                      {formatCurrency(c.amount, currency, currencySymbol)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
