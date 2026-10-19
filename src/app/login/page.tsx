import React, { Suspense } from "react";
import { isDefaultPinInUse } from "@/lib/auth";
import { PinKeypad } from "@/components/pin-keypad";

export default function LoginPage() {
  const isDefaultPin = isDefaultPinInUse();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#09090b] px-4 py-8 relative overflow-hidden">
      {/* Subtle radial ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[340px] h-[340px] bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 w-[280px] h-[280px] bg-blue-600/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        <Suspense fallback={<div className="h-64 flex items-center justify-center text-zinc-500 text-xs">Loading secure keypad...</div>}>
          <PinKeypad isDefaultPin={isDefaultPin} />
        </Suspense>
      </div>
    </div>
  );
}
