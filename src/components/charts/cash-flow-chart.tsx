"use client";

import React from "react";
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

interface CashFlowChartProps {
  data: MonthlyCashFlowPoint[];
  currency?: string;
  currencySymbol?: string;
}

export function CashFlowChart({ data, currency = "USD", currencySymbol = "$" }: CashFlowChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-zinc-500">
        No transaction history available yet
      </div>
    );
  }

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
    <div className="w-full h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="#71717a"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#27272a" }}
          />
          <YAxis
            stroke="#71717a"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${currencySymbol}${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
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
            name="Income"
            dataKey="income"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            name="Expense"
            dataKey="expense"
            fill="#f43f5e"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
