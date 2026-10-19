"use server";

import { db } from "@/db";
import { wallets, categories, transactions, recurringBills, settings } from "@/db/schema";
import { revalidatePath } from "next/cache";

export interface DatabaseBackup {
  version: number;
  exportedAt: string;
  wallets: (typeof wallets.$inferSelect)[];
  categories: (typeof categories.$inferSelect)[];
  transactions: (typeof transactions.$inferSelect)[];
  recurringBills: (typeof recurringBills.$inferSelect)[];
  settings: (typeof settings.$inferSelect)[];
}

export async function exportDatabaseJson(): Promise<DatabaseBackup> {
  const [allWallets, allCategories, allTransactions, allRecurring, allSettings] = await Promise.all([
    db.select().from(wallets),
    db.select().from(categories),
    db.select().from(transactions),
    db.select().from(recurringBills),
    db.select().from(settings),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    wallets: allWallets,
    categories: allCategories,
    transactions: allTransactions,
    recurringBills: allRecurring,
    settings: allSettings,
  };
}

export async function exportTransactionsCsv(): Promise<string> {
  const allTx = await db.select().from(transactions);
  const allCats = await db.select().from(categories);
  const allWallets = await db.select().from(wallets);

  const catMap = new Map(allCats.map((c) => [c.id, c.name]));
  const walletMap = new Map(allWallets.map((w) => [w.id, w.name]));

  const headers = ["ID", "Date", "Type", "Amount", "Category", "Wallet", "Destination Wallet", "Note", "Is Recurring"];
  
  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return "";
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = allTx.map((tx) => [
    escapeCsv(tx.id),
    escapeCsv(tx.date),
    escapeCsv(tx.type),
    escapeCsv(tx.amount),
    escapeCsv(tx.categoryId ? catMap.get(tx.categoryId) || "" : ""),
    escapeCsv(walletMap.get(tx.walletId) || tx.walletId),
    escapeCsv(tx.destinationWalletId ? walletMap.get(tx.destinationWalletId) || "" : ""),
    escapeCsv(tx.note || ""),
    escapeCsv(tx.isRecurring ? "Yes" : "No"),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export async function importDatabaseJson(backup: DatabaseBackup): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    if (!backup || !backup.version) {
      return { success: false, error: "Invalid backup file format" };
    }

    // Insert or update wallets
    if (backup.wallets && backup.wallets.length > 0) {
      for (const w of backup.wallets) {
        await db.insert(wallets).values(w).onConflictDoUpdate({
          target: wallets.id,
          set: w,
        });
      }
    }

    // Categories
    if (backup.categories && backup.categories.length > 0) {
      for (const c of backup.categories) {
        await db.insert(categories).values(c).onConflictDoUpdate({
          target: categories.id,
          set: c,
        });
      }
    }

    // Transactions
    if (backup.transactions && backup.transactions.length > 0) {
      for (const tx of backup.transactions) {
        await db.insert(transactions).values(tx).onConflictDoUpdate({
          target: transactions.id,
          set: tx,
        });
      }
    }

    // Recurring bills
    if (backup.recurringBills && backup.recurringBills.length > 0) {
      for (const rb of backup.recurringBills) {
        await db.insert(recurringBills).values(rb).onConflictDoUpdate({
          target: recurringBills.id,
          set: rb,
        });
      }
    }

    // Settings
    if (backup.settings && backup.settings.length > 0) {
      for (const s of backup.settings) {
        await db.insert(settings).values(s).onConflictDoUpdate({
          target: settings.key,
          set: s,
        });
      }
    }

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/wallets");
    revalidatePath("/budgets");

    const totalCount =
      (backup.transactions?.length || 0) +
      (backup.wallets?.length || 0) +
      (backup.categories?.length || 0);

    return { success: true, count: totalCount };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to restore backup" };
  }
}
