"use server";

import { db } from "@/db";
import { transactions, wallets, categories } from "@/db/schema";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { TransactionWithDetails } from "@/lib/types";

export interface TransactionFilter {
  walletId?: string;
  categoryId?: string;
  type?: "income" | "expense" | "transfer";
  month?: string; // YYYY-MM
  search?: string;
  limit?: number;
}

export async function getTransactions(filter: TransactionFilter = {}): Promise<TransactionWithDetails[]> {
  const query = db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      type: transactions.type,
      categoryId: transactions.categoryId,
      walletId: transactions.walletId,
      destinationWalletId: transactions.destinationWalletId,
      date: transactions.date,
      note: transactions.note,
      isRecurring: transactions.isRecurring,
      createdAt: transactions.createdAt,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      walletName: wallets.name,
      walletColor: wallets.color,
      walletIcon: wallets.icon,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(wallets, eq(transactions.walletId, wallets.id))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));

  const conditions = [];

  if (filter.walletId) {
    conditions.push(
      sql`(${transactions.walletId} = ${filter.walletId} OR ${transactions.destinationWalletId} = ${filter.walletId})`
    );
  }

  if (filter.categoryId) {
    conditions.push(eq(transactions.categoryId, filter.categoryId));
  }

  if (filter.type) {
    conditions.push(eq(transactions.type, filter.type));
  }

  if (filter.month) {
    // filter.month is "YYYY-MM"
    conditions.push(like(transactions.date, `${filter.month}%`));
  }

  if (filter.search && filter.search.trim() !== "") {
    const s = `%${filter.search.trim()}%`;
    conditions.push(
      sql`(${transactions.note} LIKE ${s} OR ${categories.name} LIKE ${s})`
    );
  }

  const finalQuery = conditions.length > 0
    ? query.where(and(...conditions))
    : query;

  const results = filter.limit
    ? await finalQuery.limit(filter.limit)
    : await finalQuery;

  // For transfers, also fetch destination wallet names
  const allWallets = await db.select({ id: wallets.id, name: wallets.name }).from(wallets);
  const walletMap = new Map(allWallets.map((w) => [w.id, w.name]));

  return results.map((row) => ({
    ...row,
    destinationWalletName: row.destinationWalletId ? walletMap.get(row.destinationWalletId) || null : null,
  })) as TransactionWithDetails[];
}

export async function createTransaction(data: {
  amount: number;
  type: "income" | "expense" | "transfer";
  walletId: string;
  categoryId?: string;
  destinationWalletId?: string;
  date: string;
  note?: string;
  isRecurring?: boolean;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!data.amount || data.amount <= 0) {
      return { success: false, error: "Amount must be greater than 0" };
    }
    if (!data.walletId) {
      return { success: false, error: "Please select a wallet" };
    }
    if (data.type === "transfer" && !data.destinationWalletId) {
      return { success: false, error: "Destination wallet is required for transfer" };
    }
    if (data.type === "transfer" && data.walletId === data.destinationWalletId) {
      return { success: false, error: "Source and destination wallets must be different" };
    }

    const id = `tx_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

    await db.insert(transactions).values({
      id,
      amount: data.amount,
      type: data.type,
      walletId: data.walletId,
      categoryId: data.type === "transfer" ? null : data.categoryId || null,
      destinationWalletId: data.type === "transfer" ? data.destinationWalletId : null,
      date: data.date || new Date().toISOString().split("T")[0],
      note: data.note?.trim() || null,
      isRecurring: data.isRecurring || false,
    });

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/wallets");
    revalidatePath("/budgets");

    return { success: true, id };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create transaction" };
  }
}

export async function deleteTransaction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(transactions).where(eq(transactions.id, id));
    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/wallets");
    revalidatePath("/budgets");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete transaction" };
  }
}
