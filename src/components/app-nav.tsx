"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/actions/auth";
import { getWalletsWithBalances } from "@/actions/wallets";
import { getCategories } from "@/actions/categories";
import { QuickTransactionModal } from "./quick-transaction-modal";
import type { WalletWithBalance } from "@/lib/types";
import type { Category } from "@/db/schema";
import {
  LayoutDashboard,
  Receipt,
  WalletCards,
  PieChart,
  Settings,
  Plus,
  Lock,
  LogOut,
  Shield,
  CircleDollarSign,
} from "lucide-react";

export function AppNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<"expense" | "income" | "transfer">("expense");
  const [quickAddWalletId, setQuickAddWalletId] = useState<string | undefined>();
  const [wallets, setWallets] = useState<WalletWithBalance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Load wallets and categories for global modal
  const refreshModalData = async () => {
    try {
      const [w, c] = await Promise.all([getWalletsWithBalances(), getCategories()]);
      setWallets(w);
      setCategories(c);
    } catch {
      // Ignored if on unauthenticated route
    }
  };

  useEffect(() => {
    if (pathname !== "/login") {
      refreshModalData();
    }
  }, [pathname]);

  // Global event listener to trigger Quick Add modal from any page
  useEffect(() => {
    const handleOpen = (e: any) => {
      if (e.detail?.type) setQuickAddType(e.detail.type);
      if (e.detail?.walletId) setQuickAddWalletId(e.detail.walletId);
      setIsQuickAddOpen(true);
      refreshModalData();
    };

    window.addEventListener("open-quick-add", handleOpen);
    return () => window.removeEventListener("open-quick-add", handleOpen);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };

  if (pathname === "/login") {
    return <>{children}</>;
  }

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/transactions", label: "Transactions", icon: Receipt },
    { href: "/wallets", label: "Wallets", icon: WalletCards },
    { href: "/budgets", label: "Budgets", icon: PieChart },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100 pb-20 md:pb-6">
      {/* Desktop Top Header Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-[#09090b]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-zinc-950 font-black shadow-md shadow-emerald-950/40 group-hover:scale-105 transition-transform">
              <CircleDollarSign className="w-5 h-5 text-zinc-950" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                VaultFlow
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </span>
              <span className="text-[10px] text-zinc-400 font-mono -mt-0.5">libSQL • Single-User</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                    isActive
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-zinc-400"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            {/* Quick Add Button */}
            <button
              onClick={() => {
                refreshModalData();
                setIsQuickAddOpen(true);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-bold text-xs transition-all shadow-sm shadow-emerald-950"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Quick Add
            </button>

            {/* Lock / Logout */}
            <button
              onClick={handleLogout}
              title="Lock Vault"
              className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 flex items-center justify-center transition-colors"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 animate-fadeIn">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar (iOS / Android One-Thumb Optimized) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0f0f12]/95 backdrop-blur-lg border-t border-zinc-800/80 px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16">
          <Link
            href="/"
            className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${
              pathname === "/" ? "text-emerald-400" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>

          <Link
            href="/transactions"
            className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${
              pathname === "/transactions" ? "text-emerald-400" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Receipt className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">Activity</span>
          </Link>

          {/* Elevated Floating (+) Action Button in Center */}
          <div className="flex items-center justify-center -mt-6">
            <button
              type="button"
              onClick={() => {
                refreshModalData();
                setIsQuickAddOpen(true);
              }}
              className="w-13 h-13 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 flex items-center justify-center shadow-lg shadow-emerald-950/70 border-4 border-[#09090b] transition-all"
              aria-label="Quick Add Transaction"
            >
              <Plus className="w-7 h-7 stroke-[2.8]" />
            </button>
          </div>

          <Link
            href="/wallets"
            className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${
              pathname === "/wallets" ? "text-emerald-400" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <WalletCards className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">Wallets</span>
          </Link>

          <Link
            href="/budgets"
            className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${
              pathname === "/budgets" ? "text-emerald-400" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <PieChart className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">Budgets</span>
          </Link>
        </div>
      </nav>

      {/* Global Quick Add Transaction Modal */}
      <QuickTransactionModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        wallets={wallets}
        categories={categories}
        defaultType={quickAddType}
        defaultWalletId={quickAddWalletId}
        onSuccess={() => {
          router.refresh();
          refreshModalData();
        }}
      />
    </div>
  );
}
