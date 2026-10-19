"use server";

import { db } from "@/db";
import { wallets, transactions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { WalletWithBalance } from "@/lib/types";

export async function getWalletsWithBalances(): Promise<WalletWithBalance[]> {
  const allWallets = await db
    .select()
    .from(wallets)
    .where(eq(wallets.isArchived, false))
    .orderBy(wallets.createdAt);

  const allTx = await db
    .select({
      walletId: transactions.walletId,
      destinationWalletId: transactions.destinationWalletId,
      amount: transactions.amount,
      type: transactions.type,
    })
    .from(transactions);

  return allWallets.map((w) => {
    let balance = w.initialBalance;
    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of allTx) {
      if (tx.walletId === w.id) {
        if (tx.type === "income") {
          balance += tx.amount;
          totalIncome += tx.amount;
        } else if (tx.type === "expense") {
          balance -= tx.amount;
          totalExpense += tx.amount;
        } else if (tx.type === "transfer") {
          balance -= tx.amount;
        }
      }
      if (tx.destinationWalletId === w.id && tx.type === "transfer") {
        balance += tx.amount;
      }
    }

    return {
      ...w,
      currentBalance: balance,
      totalIncome,
      totalExpense,
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
