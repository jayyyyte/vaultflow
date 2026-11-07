"use server";

import { db } from "@/db";
import { wallets, transactions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { WalletWithBalance } from "@/lib/types";

export async function getWalletsWithBalances(): Promise<WalletWithBalance[]> {
  const allWallets = await db
    .select()
    .from(wallets)
    .where(eq(wallets.isArchived, false))
    .orderBy(wallets.createdAt);

  if (allWallets.length === 0) return [];

  // SQL aggregation for outgoing/source transactions (grouped by walletId)
  const sourceStats = await db
    .select({
      walletId: transactions.walletId,
      income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
      expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
      transferOut: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'transfer' THEN ${transactions.amount} ELSE 0 END), 0)`,
    })
    .from(transactions)
    .groupBy(transactions.walletId);

  // SQL aggregation for incoming transfers (grouped by destinationWalletId)
  const destStats = await db
    .select({
      walletId: sql<string>`${transactions.destinationWalletId}`,
      transferIn: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, "transfer"),
        sql`${transactions.destinationWalletId} IS NOT NULL`
      )
    )
    .groupBy(transactions.destinationWalletId);

  const sourceMap = new Map(sourceStats.map((s) => [s.walletId, s]));
  const destMap = new Map(destStats.map((d) => [d.walletId, Number(d.transferIn) || 0]));

  return allWallets.map((w) => {
    const src = sourceMap.get(w.id);
    const income = Number(src?.income) || 0;
    const expense = Number(src?.expense) || 0;
    const transferOut = Number(src?.transferOut) || 0;
    const transferIn = destMap.get(w.id) || 0;

    const currentBalance = w.initialBalance + income - expense - transferOut + transferIn;

    return {
      ...w,
      currentBalance,
      totalIncome: income,
      totalExpense: expense,
    };
  });
}

export async function createWallet(data: {
  name: string;
  type: "cash" | "bank" | "e_wallet" | "credit";
  initialBalance: number;
  creditLimit?: number;
  color?: string;
  icon?: string;
  currency?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!data.name || data.name.trim() === "") {
      return { success: false, error: "Wallet name is required" };
    }

    const id = `w_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    await db.insert(wallets).values({
      id,
      name: data.name.trim(),
      type: data.type,
      initialBalance: data.initialBalance || 0,
      creditLimit: data.type === "credit" ? data.creditLimit || 0 : 0,
      color: data.color || "#3b82f6",
      icon: data.icon || "Wallet",
      currency: data.currency || "USD",
      isArchived: false,
    });

    revalidatePath("/");
    revalidatePath("/wallets");
    revalidatePath("/transactions");
    return { success: true, id };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create wallet" };
  }
}

export async function updateWallet(
  id: string,
  data: {
    name?: string;
    type?: "cash" | "bank" | "e_wallet" | "credit";
    color?: string;
    icon?: string;
    creditLimit?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(wallets)
      .set({
        ...data,
        updatedAt: Date.now(),
      })
      .where(eq(wallets.id, id));

    revalidatePath("/");
    revalidatePath("/wallets");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update wallet" };
  }
}

export async function archiveWallet(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(wallets)
      .set({ isArchived: true, updatedAt: Date.now() })
      .where(eq(wallets.id, id));

    revalidatePath("/");
    revalidatePath("/wallets");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to archive wallet" };
  }
}

export async function transferBetweenWallets(data: {
  sourceWalletId: string;
  destinationWalletId: string;
  amount: number;
  date?: string;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (data.sourceWalletId === data.destinationWalletId) {
    return { success: false, error: "Cannot transfer to the same wallet" };
  }
  if (!data.amount || data.amount <= 0) {
    return { success: false, error: "Amount must be greater than 0" };
  }

  const id = `tx_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    await db.insert(transactions).values({
      id,
      amount: data.amount,
      type: "transfer",
      walletId: data.sourceWalletId,
      destinationWalletId: data.destinationWalletId,
      date: data.date || new Date().toISOString().split("T")[0],
      note: data.note || "Transfer between accounts",
    });

    revalidatePath("/");
    revalidatePath("/wallets");
    revalidatePath("/transactions");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Transfer failed" };
  }
}
