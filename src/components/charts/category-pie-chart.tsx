"use client";

import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import type { CategorySpendingPoint } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface CategoryPieChartProps {
  data: CategorySpendingPoint[];
  currencySymbol?: string;
}

export function CategoryPieChart({ data, currencySymbol = "$" }: CategoryPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-56 flex flex-col items-center justify-center text-xs text-zinc-500">
        <span>No expenses recorded for this month</span>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as CategorySpendingPoint;
      return (
        <div className="bg-zinc-900 border border-zinc-700/80 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-bold text-zinc-200">{item.name}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-400">Amount:</span>
            <span className="font-mono text-zinc-100 font-bold">
              {formatCurrency(item.amount, "USD", currencySymbol)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-400">Share:</span>
            <span className="font-mono text-emerald-400 font-medium">
              {item.percent.toFixed(1)}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Donut Chart */}
      <div className="w-48 h-48 relative shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={3}
              dataKey="amount"
              stroke="#09090b"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || "#10b981"} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] text-zinc-500 uppercase font-medium">Top Category</span>
          <span className="text-xs font-bold text-zinc-200 truncate max-w-[90px]">
            {data[0]?.name || "N/A"}
          </span>
        </div>
      </div>

      {/* Legend List */}
      <div className="flex-1 w-full space-y-2 max-h-48 overflow-y-auto pr-1">
        {data.slice(0, 5).map((item) => (
          <div key={item.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-zinc-300 truncate">{item.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 font-mono">
              <span className="text-zinc-200 font-medium">
                {formatCurrency(item.amount, "USD", currencySymbol)}
              </span>
              <span className="text-[11px] text-zinc-400 w-10 text-right">
                {item.percent.toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
