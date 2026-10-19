"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentYearMonth, getMonthYearLabel } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

export function DashboardClientControls({ currentMonth }: { currentMonth: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleMonthChange = (offset: number) => {
    const [y, m] = currentMonth.split("-").map(Number);
    const date = new Date(y, m - 1 + offset, 1);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, "0");
    const newMonthStr = `${newY}-${newM}`;

    const params = new URLSearchParams(searchParams.toString());
    params.set("month", newMonthStr);
    router.push(`/?${params.toString()}`);
  };

  const handleOpenQuickAdd = () => {
    window.dispatchEvent(new CustomEvent("open-quick-add", { detail: { type: "expense" } }));
  };

  return (
    <div className="flex items-center gap-2">
      {/* Month Navigator */}
      <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 shadow-sm">
        <button
          onClick={() => handleMonthChange(-1)}
          className="w-7 h-7 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          title="Previous Month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold px-2 text-zinc-200 min-w-[100px] text-center">
          {getMonthYearLabel(currentMonth)}
        </span>
        <button
          onClick={() => handleMonthChange(1)}
          className="w-7 h-7 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          title="Next Month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Add Button */}
      <button
        onClick={handleOpenQuickAdd}
        className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
        <span>Add Transaction</span>
      </button>
    </div>
  );
}
