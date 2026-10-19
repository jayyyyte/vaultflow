"use server";

import { db } from "@/db";
import { recurringBills, transactions, wallets, categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface RecurringBillWithDetails {
  id: string;
  name: string;
  amount: number;
  categoryId: string | null;
  walletId: string | null;
  frequency: "monthly" | "yearly" | "weekly";
  dueDay: number;
  isActive: boolean;
  lastPaidDate: string | null;
  note: string | null;
  categoryName?: string | null;
  categoryColor?: string | null;
  walletName?: string | null;
}

export async function getRecurringBills(): Promise<RecurringBillWithDetails[]> {
  const bills = await db
    .select({
      id: recurringBills.id,
      name: recurringBills.name,
      amount: recurringBills.amount,
      categoryId: recurringBills.categoryId,
      walletId: recurringBills.walletId,
      frequency: recurringBills.frequency,
      dueDay: recurringBills.dueDay,
      isActive: recurringBills.isActive,
      lastPaidDate: recurringBills.lastPaidDate,
      note: recurringBills.note,
      categoryName: categories.name,
      categoryColor: categories.color,
      walletName: wallets.name,
    })
    .from(recurringBills)
    .leftJoin(categories, eq(recurringBills.categoryId, categories.id))
    .leftJoin(wallets, eq(recurringBills.walletId, wallets.id))
    .orderBy(recurringBills.dueDay);

  return bills as RecurringBillWithDetails[];
}

export async function createRecurringBill(data: {
  name: string;
  amount: number;
  categoryId?: string;
  walletId?: string;
  dueDay: number;
  frequency?: "monthly" | "yearly" | "weekly";
  note?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!data.name || data.name.trim() === "") {
      return { success: false, error: "Bill name is required" };
    }
    if (!data.amount || data.amount <= 0) {
      return { success: false, error: "Amount must be greater than 0" };
    }
    if (!data.dueDay || data.dueDay < 1 || data.dueDay > 31) {
      return { success: false, error: "Due day must be between 1 and 31" };
    }

    const id = `rb_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    await db.insert(recurringBills).values({
      id,
      name: data.name.trim(),
      amount: data.amount,
      categoryId: data.categoryId || null,
      walletId: data.walletId || null,
      frequency: data.frequency || "monthly",
      dueDay: data.dueDay,
      isActive: true,
      note: data.note?.trim() || null,
    });

    revalidatePath("/");
    revalidatePath("/budgets");
    return { success: true, id };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create recurring bill" };
  }
}

export async function payRecurringBill(
  billId: string,
  walletIdOverride?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const [bill] = await db
      .select()
      .from(recurringBills)
      .where(eq(recurringBills.id, billId));

    if (!bill) {
      return { success: false, error: "Bill not found" };
    }

    // Determine target wallet
    let targetWalletId = walletIdOverride || bill.walletId;
    if (!targetWalletId) {
      const [firstWallet] = await db.select({ id: wallets.id }).from(wallets).limit(1);
      if (!firstWallet) {
        return { success: false, error: "No wallet found to deduct bill payment from" };
      }
      targetWalletId = firstWallet.id;
    }

    const today = new Date().toISOString().split("T")[0];
    const txId = `tx_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Insert transaction
    await db.insert(transactions).values({
      id: txId,
      amount: bill.amount,
      type: "expense",
      categoryId: bill.categoryId,
      walletId: targetWalletId,
      date: today,
      note: `Recurring: ${bill.name}`,
      isRecurring: true,
    });

    // 2. Update lastPaidDate on recurring bill
    await db
      .update(recurringBills)
      .set({ lastPaidDate: today })
      .where(eq(recurringBills.id, billId));

    revalidatePath("/");
    revalidatePath("/budgets");
    revalidatePath("/transactions");
    revalidatePath("/wallets");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to log bill payment" };
  }
}

export async function deleteRecurringBill(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(recurringBills).where(eq(recurringBills.id, id));
    revalidatePath("/");
    revalidatePath("/budgets");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete recurring bill" };
  }
}
