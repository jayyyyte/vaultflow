"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import type { MonthlyCashFlowPoint } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { getCashFlowHistoryByPeriod, type CashFlowPeriod } from "@/actions/dashboard";
import { Loader2 } from "lucide-react";

interface CashFlowChartProps {
  data: MonthlyCashFlowPoint[];
  currency?: string;
  currencySymbol?: string;
  referenceMonth?: string;
}

const PERIOD_OPTIONS: Array<{ id: CashFlowPeriod; label: string }> = [
  { id: "week", label: "7 ngày" },
  { id: "month", label: "Tháng này" },
  { id: "quarter", label: "Quý này" },
  { id: "6m", label: "6 Tháng" },
  { id: "year", label: "Năm nay" },
];

export function CashFlowChart({
  data,
  currency = "USD",
  currencySymbol = "$",
  referenceMonth,
}: CashFlowChartProps) {
  const [period, setPeriod] = useState<CashFlowPeriod>("6m");
  const [chartData, setChartData] = useState<MonthlyCashFlowPoint[]>(data);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setChartData(data);
  }, [data]);

  const handlePeriodChange = async (newPeriod: CashFlowPeriod) => {
    if (newPeriod === period) return;
    setPeriod(newPeriod);
    setIsLoading(true);
    try {
      const updated = await getCashFlowHistoryByPeriod(newPeriod, referenceMonth);
      setChartData(updated);
    } finally {
      setIsLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-700/80 p-3 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-zinc-200 mb-1">{label}</p>
          <div className="flex items-center justify-between gap-4">
            <span className="text-emerald-400 font-medium">Income:</span>
            <span className="font-mono text-zinc-100">
              {formatCurrency(payload[0]?.value || 0, currency, currencySymbol)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-rose-400 font-medium">Expense:</span>
            <span className="font-mono text-zinc-100">
              {formatCurrency(payload[1]?.value || 0, currency, currencySymbol)}
            </span>
          </div>
          {payload[0] && payload[1] && (
            <div className="pt-1 border-t border-zinc-800 flex items-center justify-between gap-4">
              <span className="text-zinc-400 font-medium">Net:</span>
              <span
                className={`font-mono font-bold ${
                  payload[0].value - payload[1].value >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatCurrency(payload[0].value - payload[1].value, currency, currencySymbol)}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-3">
      {/* Timeframe Filter Pills */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          Khoảng thời gian:
        </span>
        <div className="flex items-center bg-zinc-900/90 p-0.5 rounded-xl border border-zinc-800 text-xs">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handlePeriodChange(opt.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                period === opt.id
                  ? "bg-zinc-800 text-white shadow-sm font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-64 sm:h-72 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-[#121215]/60 backdrop-blur-xs flex items-center justify-center z-10 rounded-xl">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
          </div>
        )}

        {!chartData || chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-zinc-500">
            Chưa có dữ liệu giao dịch trong khoảng thời gian này
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: "#27272a" }}
              />
              <YAxis
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) =>
                  `${currencySymbol}${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                }
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ paddingBottom: 12, fontSize: 11 }}
              />
              <Bar
                name="Thu nhập"
                dataKey="income"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                name="Chi tiêu"
                dataKey="expense"
                fill="#f43f5e"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
