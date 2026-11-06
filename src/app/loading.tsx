import React from "react";

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-zinc-800/70 rounded-xl" />
          <div className="h-4 w-64 bg-zinc-900 rounded-lg" />
        </div>
        <div className="h-10 w-28 bg-zinc-900 rounded-xl" />
      </div>

      {/* 4 Summary KPI Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-[#121215] border border-zinc-800/60 rounded-2xl p-4 sm:p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 bg-zinc-800 rounded" />
              <div className="w-8 h-8 rounded-xl bg-zinc-800/50" />
            </div>
            <div className="h-7 w-28 bg-zinc-800 rounded-lg" />
            <div className="h-3 w-20 bg-zinc-900 rounded" />
          </div>
        ))}
      </div>

      {/* Wallets Grid Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 bg-zinc-800 rounded" />
          <div className="h-4 w-16 bg-zinc-900 rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[#121215] border border-zinc-800/60 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-zinc-800" />
                <div className="h-4 w-12 bg-zinc-900 rounded-full" />
              </div>
              <div className="h-4 w-24 bg-zinc-800 rounded" />
              <div className="h-6 w-32 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-[#121215] border border-zinc-800/60 rounded-2xl p-5 h-72">
          <div className="h-4 w-32 bg-zinc-800 rounded mb-2" />
          <div className="h-3 w-48 bg-zinc-900 rounded mb-6" />
          <div className="h-48 w-full bg-zinc-900/60 rounded-xl" />
        </div>
        <div className="bg-[#121215] border border-zinc-800/60 rounded-2xl p-5 h-72">
          <div className="h-4 w-36 bg-zinc-800 rounded mb-2" />
          <div className="h-3 w-44 bg-zinc-900 rounded mb-6" />
          <div className="w-40 h-40 rounded-full border-8 border-zinc-800/80 mx-auto" />
        </div>
      </div>
    </div>
  );
}
