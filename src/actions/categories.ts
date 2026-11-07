"use server";

import { db } from "@/db";
import { categories, transactions, wallets } from "@/db/schema";
import { eq, and, like, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentYearMonth } from "@/lib/utils";
import type { CategoryWithSpending, CategoryAnalytics, CategoryAnalyticsItem } from "@/lib/types";
import type { Category } from "@/db/schema";

export async function getCategories(): Promise<Category[]> {
  return await db.select().from(categories).orderBy(categories.name);
}

export async function getCategoriesWithSpending(
  month: string = getCurrentYearMonth()
): Promise<CategoryWithSpending[]> {
  const [allCategories, spendingStats] = await Promise.all([
    db.select().from(categories).orderBy(categories.name),
    db
      .select({
        categoryId: transactions.categoryId,
        total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "expense"),
          like(transactions.date, `${month}%`),
          sql`${transactions.categoryId} IS NOT NULL`
        )
      )
      .groupBy(transactions.categoryId),
  ]);

  const spendingMap = new Map(
    spendingStats.map((s) => [
      s.categoryId!,
      { total: Number(s.total) || 0, count: Number(s.count) || 0 },
    ])
  );

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
    revalidatePath("/transactions");
    revalidatePath("/wallets");
    revalidatePath("/settings");
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
    revalidatePath("/wallets");
    revalidatePath("/settings");
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
    revalidatePath("/wallets");
    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete category" };
  }
}

export async function updateCategory(
  id: string,
  data: {
    name?: string;
    type?: "expense" | "income";
    icon?: string;
    color?: string;
    monthlyBudget?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const updatePayload: any = {};
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.type !== undefined) updatePayload.type = data.type;
    if (data.icon !== undefined) updatePayload.icon = data.icon;
    if (data.color !== undefined) updatePayload.color = data.color;
    if (data.monthlyBudget !== undefined) updatePayload.monthlyBudget = Math.max(0, data.monthlyBudget);

    await db.update(categories).set(updatePayload).where(eq(categories.id, id));

    revalidatePath("/");
    revalidatePath("/budgets");
    revalidatePath("/transactions");
    revalidatePath("/wallets");
    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update category" };
  }
}

export async function getCategoryAnalytics(
  month: string = getCurrentYearMonth()
): Promise<CategoryAnalytics> {
  const [currY, currM] = month.split("-").map(Number);
  const prevDate = new Date(currY, currM - 2, 1);
  const prevY = prevDate.getFullYear();
  const prevM = String(prevDate.getMonth() + 1).padStart(2, "0");
  const previousMonth = `${prevY}-${prevM}`;

  const twoMonthsAgoKey = `${previousMonth}-01`;

  const [
    allCategories,
    currentMonthGrouped,
    prevMonthGrouped,
  ] = await Promise.all([
    db.select().from(categories).orderBy(categories.name),
    db
      .select({
        categoryId: transactions.categoryId,
        type: transactions.type,
        total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(transactions)
      .where(like(transactions.date, `${month}%`))
      .groupBy(transactions.categoryId, transactions.type),
    db
      .select({
        categoryId: transactions.categoryId,
        type: transactions.type,
        total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(transactions)
      .where(like(transactions.date, `${previousMonth}%`))
      .groupBy(transactions.categoryId, transactions.type),
  ]);

  let totalExpenseCurrent = 0;
  let totalExpensePrevious = 0;
  let totalIncomeCurrent = 0;
  let totalIncomePrevious = 0;

  const currentExpenseMap = new Map<string, { total: number; count: number }>();
  const prevExpenseMap = new Map<string, { total: number; count: number }>();
  const currentIncomeMap = new Map<string, { total: number; count: number }>();
  const prevIncomeMap = new Map<string, { total: number; count: number }>();

  for (const row of currentMonthGrouped) {
    const total = Number(row.total) || 0;
    const count = Number(row.count) || 0;
    if (row.type === "expense") {
      totalExpenseCurrent += total;
      if (row.categoryId) {
        currentExpenseMap.set(row.categoryId, { total, count });
      }
    } else if (row.type === "income") {
      totalIncomeCurrent += total;
      if (row.categoryId) {
        currentIncomeMap.set(row.categoryId, { total, count });
      }
    }
  }

  for (const row of prevMonthGrouped) {
    const total = Number(row.total) || 0;
    const count = Number(row.count) || 0;
    if (row.type === "expense") {
      totalExpensePrevious += total;
      if (row.categoryId) {
        prevExpenseMap.set(row.categoryId, { total, count });
      }
    } else if (row.type === "income") {
      totalIncomePrevious += total;
      if (row.categoryId) {
        prevIncomeMap.set(row.categoryId, { total, count });
      }
    }
  }

  let overBudgetCount = 0;
  let nearLimitCount = 0;
  let totalBudgeted = 0;

  const expenseCategories: CategoryAnalyticsItem[] = allCategories
    .filter((c) => c.type === "expense")
    .map((c) => {
      const cur = currentExpenseMap.get(c.id) || { total: 0, count: 0 };
      const prev = prevExpenseMap.get(c.id) || { total: 0, count: 0 };
      const budget = c.monthlyBudget || 0;
      totalBudgeted += budget;

      const momGrowth =
        prev.total > 0
          ? ((cur.total - prev.total) / prev.total) * 100
          : cur.total > 0
          ? 100
          : 0;

      const shareOfTotal = totalExpenseCurrent > 0 ? (cur.total / totalExpenseCurrent) * 100 : 0;
      const budgetUtilization = budget > 0 ? (cur.total / budget) * 100 : 0;

      let status: "over_budget" | "warning" | "good" | "unbudgeted" = "unbudgeted";
      if (budget > 0) {
        if (cur.total > budget) {
          status = "over_budget";
          overBudgetCount++;
        } else if (budgetUtilization >= 80) {
          status = "warning";
          nearLimitCount++;
        } else {
          status = "good";
        }
      }

      return {
        id: c.id,
        name: c.name,
        type: "expense" as const,
        icon: c.icon,
        color: c.color,
        monthlyBudget: budget,
        currentAmount: cur.total,
        previousAmount: prev.total,
        momGrowth,
        shareOfTotal,
        transactionCount: cur.count,
        avgPerTransaction: cur.count > 0 ? cur.total / cur.count : 0,
        budgetUtilization,
        status,
      };
    })
    .sort((a, b) => b.currentAmount - a.currentAmount);

  const incomeCategories: CategoryAnalyticsItem[] = allCategories
    .filter((c) => c.type === "income")
    .map((c) => {
      const cur = currentIncomeMap.get(c.id) || { total: 0, count: 0 };
      const prev = prevIncomeMap.get(c.id) || { total: 0, count: 0 };

      const momGrowth =
        prev.total > 0
          ? ((cur.total - prev.total) / prev.total) * 100
          : cur.total > 0
          ? 100
          : 0;

      const shareOfTotal = totalIncomeCurrent > 0 ? (cur.total / totalIncomeCurrent) * 100 : 0;

      return {
        id: c.id,
        name: c.name,
        type: "income" as const,
        icon: c.icon,
        color: c.color,
        monthlyBudget: 0,
        currentAmount: cur.total,
        previousAmount: prev.total,
        momGrowth,
        shareOfTotal,
        transactionCount: cur.count,
        avgPerTransaction: cur.count > 0 ? cur.total / cur.count : 0,
        budgetUtilization: 0,
        status: "unbudgeted" as const,
      };
    })
    .sort((a, b) => b.currentAmount - a.currentAmount);

  const topExpenseCategory = expenseCategories[0]?.currentAmount > 0 ? expenseCategories[0] : undefined;
  const fastestGrowingExpense = [...expenseCategories]
    .filter((c) => c.currentAmount > 0 && c.momGrowth > 0)
    .sort((a, b) => b.momGrowth - a.momGrowth)[0];
  const mostFrequentExpense = [...expenseCategories]
    .filter((c) => c.transactionCount > 0)
    .sort((a, b) => b.transactionCount - a.transactionCount)[0];

  return {
    currentMonth: month,
    previousMonth,
    totalExpenseCurrent,
    totalExpensePrevious,
    totalIncomeCurrent,
    totalIncomePrevious,
    expenseCategories,
    incomeCategories,
    insights: {
      topExpenseCategory,
      fastestGrowingExpense,
      mostFrequentExpense,
      overBudgetCount,
      nearLimitCount,
      totalBudgeted,
    },
  };
}

export async function seedDefaultCategoriesAndWallets(): Promise<{ success: boolean; error?: string }> {
  try {
    const existingWallets = await db.select().from(wallets);
    if (existingWallets.length === 0) {
      await db.insert(wallets).values([
        {
          id: "w_cash_01",
          name: "Tiền mặt (Cash)",
          type: "cash",
          currency: "VND",
          initialBalance: 500000,
          creditLimit: 0,
          color: "#10b981",
          icon: "Banknote",
          isArchived: false,
        },
        {
          id: "w_bank_01",
          name: "Tài khoản Ngân hàng",
          type: "bank",
          currency: "VND",
          initialBalance: 2000000,
          creditLimit: 0,
          color: "#3b82f6",
          icon: "Building2",
          isArchived: false,
        },
        {
          id: "w_ewallet_01",
          name: "Ví MoMo / E-Wallet",
          type: "e_wallet",
          currency: "VND",
          initialBalance: 500000,
          creditLimit: 0,
          color: "#8b5cf6",
          icon: "Smartphone",
          isArchived: false,
        },
      ]);
    }

    const existingCats = await db.select().from(categories);
    if (existingCats.length === 0) {
      await db.insert(categories).values([
        { id: "cat_dining", name: "Ăn uống & Cà phê", type: "expense", icon: "Coffee", color: "#f97316", monthlyBudget: 3000000 },
        { id: "cat_groceries", name: "Đi chợ & Siêu thị", type: "expense", icon: "ShoppingCart", color: "#10b981", monthlyBudget: 2500000 },
        { id: "cat_rent", name: "Tiền nhà & Thuê phòng", type: "expense", icon: "Home", color: "#6366f1", monthlyBudget: 5000000 },
        { id: "cat_utilities", name: "Hóa đơn & Tiện ích", type: "expense", icon: "Zap", color: "#eab308", monthlyBudget: 1000000 },
        { id: "cat_transport", name: "Di chuyển & Xăng xe", type: "expense", icon: "Car", color: "#3b82f6", monthlyBudget: 800000 },
        { id: "cat_shopping", name: "Mua sắm & Đồ dùng", type: "expense", icon: "ShoppingBag", color: "#ec4899", monthlyBudget: 1500000 },
        { id: "cat_ent", name: "Giải trí & Sở thích", type: "expense", icon: "Film", color: "#a855f7", monthlyBudget: 800000 },
        { id: "cat_health", name: "Sức khỏe & Y tế", type: "expense", icon: "HeartPulse", color: "#ef4444", monthlyBudget: 500000 },
        { id: "cat_salary", name: "Tiền lương & Thù lao", type: "income", icon: "Briefcase", color: "#10b981", monthlyBudget: 0 },
        { id: "cat_freelance", name: "Dự án ngoài & Thưởng", type: "income", icon: "Laptop", color: "#06b6d4", monthlyBudget: 0 },
      ]);
    }

    revalidatePath("/");
    revalidatePath("/budgets");
    revalidatePath("/transactions");
    revalidatePath("/wallets");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to seed default data" };
  }
}
