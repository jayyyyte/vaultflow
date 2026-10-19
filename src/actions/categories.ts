"use server";

import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { eq, and, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentYearMonth } from "@/lib/utils";
import type { CategoryWithSpending } from "@/lib/types";
import type { Category } from "@/db/schema";

export async function getCategories(): Promise<Category[]> {
  return await db.select().from(categories).orderBy(categories.name);
}

export async function getCategoriesWithSpending(
  month: string = getCurrentYearMonth()
): Promise<CategoryWithSpending[]> {
  const allCategories = await db.select().from(categories).orderBy(categories.name);

  const monthTx = await db
    .select({
      categoryId: transactions.categoryId,
      amount: transactions.amount,
      type: transactions.type,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, "expense"),
        like(transactions.date, `${month}%`)
      )
    );

  const spendingMap = new Map<string, { total: number; count: number }>();
  for (const tx of monthTx) {
    if (!tx.categoryId) continue;
    const current = spendingMap.get(tx.categoryId) || { total: 0, count: 0 };
    spendingMap.set(tx.categoryId, {
      total: current.total + tx.amount,
      count: current.count + 1,
    });
  }

  return allCategories.map((cat) => {
    const stats = spendingMap.get(cat.id) || { total: 0, count: 0 };
    const budget = cat.monthlyBudget || 0;
    const percentUsed = budget > 0 ? (stats.total / budget) * 100 : 0;
    const remainingBudget = budget > 0 ? Math.max(0, budget - stats.total) : 0;

    return {
      ...cat,
      spentThisMonth: stats.total,
      remainingBudget,
      percentUsed,
      transactionCount: stats.count,
    };
  });
}

export async function updateCategoryBudget(
  id: string,
  monthlyBudget: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(categories)
      .set({ monthlyBudget: Math.max(0, monthlyBudget) })
      .where(eq(categories.id, id));

    revalidatePath("/");
    revalidatePath("/budgets");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update budget" };
  }
}

export async function createCategory(data: {
  name: string;
  type: "expense" | "income";
  icon?: string;
  color?: string;
  monthlyBudget?: number;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!data.name || data.name.trim() === "") {
      return { success: false, error: "Category name is required" };
    }

    const id = `cat_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    await db.insert(categories).values({
      id,
      name: data.name.trim(),
      type: data.type,
      icon: data.icon || "Tag",
      color: data.color || (data.type === "income" ? "#10b981" : "#f43f5e"),
      monthlyBudget: data.monthlyBudget || 0,
    });

    revalidatePath("/");
    revalidatePath("/budgets");
    revalidatePath("/transactions");
    return { success: true, id };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create category" };
  }
}

export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(categories).where(eq(categories.id, id));
    revalidatePath("/");
    revalidatePath("/budgets");
    revalidatePath("/transactions");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete category" };
  }
}
