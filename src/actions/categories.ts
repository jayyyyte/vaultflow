"use server";

import { db } from "@/db";
import { categories, transactions, wallets } from "@/db/schema";
import { eq, and, like, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentYearMonth } from "@/lib/utils";
import type {
  CategoryWithSpending,
  CategoryAnalytics,
  CategoryAnalyticsItem,
  NeedsWantsReport,
} from "@/lib/types";
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
  classification?: "needs" | "wants" | "savings";
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
      classification: data.classification || "needs",
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
    classification?: "needs" | "wants" | "savings";
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const updatePayload: any = {};
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.type !== undefined) updatePayload.type = data.type;
    if (data.icon !== undefined) updatePayload.icon = data.icon;
    if (data.color !== undefined) updatePayload.color = data.color;
    if (data.monthlyBudget !== undefined) updatePayload.monthlyBudget = Math.max(0, data.monthlyBudget);
    if (data.classification !== undefined) updatePayload.classification = data.classification;

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
        classification: (c.classification as any) || "needs",
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

export async function getNeedsWantsAnalysis(
  month: string = getCurrentYearMonth()
): Promise<NeedsWantsReport> {
  const [allCategories, monthTransactions] = await Promise.all([
    db.select().from(categories),
    db
      .select({
        categoryId: transactions.categoryId,
        type: transactions.type,
        amount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(like(transactions.date, `${month}%`))
      .groupBy(transactions.categoryId, transactions.type),
  ]);

  const catMap = new Map(allCategories.map((c) => [c.id, c]));

  let totalIncome = 0;
  let totalExpense = 0;
  let totalNeeds = 0;
  let totalWants = 0;
  let totalSavingsExpense = 0;

  const needsCats: Array<{ id: string; name: string; amount: number; color: string; icon: string; share: number }> = [];
  const wantsCats: Array<{ id: string; name: string; amount: number; color: string; icon: string; share: number }> = [];
  const savingsCats: Array<{ id: string; name: string; amount: number; color: string; icon: string; share: number }> = [];

  for (const row of monthTransactions) {
    const amt = Number(row.amount) || 0;
    if (row.type === "income") {
      totalIncome += amt;
    } else if (row.type === "expense") {
      totalExpense += amt;
      const cat = row.categoryId ? catMap.get(row.categoryId) : undefined;
      const classification = cat?.classification || "needs";
      const item = {
        id: cat?.id || "uncategorized",
        name: cat?.name || "Chưa phân loại",
        amount: amt,
        color: cat?.color || "#71717a",
        icon: cat?.icon || "Tag",
        share: 0,
      };

      if (classification === "needs") {
        totalNeeds += amt;
        needsCats.push(item);
      } else if (classification === "wants") {
        totalWants += amt;
        wantsCats.push(item);
      } else if (classification === "savings") {
        totalSavingsExpense += amt;
        savingsCats.push(item);
      }
    }
  }

  // Calculate shares within each bucket
  needsCats.forEach((c) => { c.share = totalNeeds > 0 ? (c.amount / totalNeeds) * 100 : 0; });
  needsCats.sort((a, b) => b.amount - a.amount);

  wantsCats.forEach((c) => { c.share = totalWants > 0 ? (c.amount / totalWants) * 100 : 0; });
  wantsCats.sort((a, b) => b.amount - a.amount);

  savingsCats.forEach((c) => { c.share = totalSavingsExpense > 0 ? (c.amount / totalSavingsExpense) * 100 : 0; });
  savingsCats.sort((a, b) => b.amount - a.amount);

  // Net Savings calculation (Cash flow surplus + category savings)
  const netCashFlow = Math.max(0, totalIncome - totalExpense);
  const totalSavings = netCashFlow + totalSavingsExpense;

  const baseDenominator = totalIncome > 0 ? totalIncome : totalExpense > 0 ? totalExpense : 1;
  const needsPercent = (totalNeeds / baseDenominator) * 100;
  const wantsPercent = (totalWants / baseDenominator) * 100;
  const savingsPercent = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

  // 50/30/20 Financial Health Score (0-100)
  let score = 100;
  if (needsPercent > 50) score -= Math.min(35, (needsPercent - 50) * 1.5);
  if (wantsPercent > 30) score -= Math.min(35, (wantsPercent - 30) * 1.5);
  if (totalIncome > 0 && savingsPercent < 20) score -= Math.min(30, (20 - savingsPercent) * 1.5);
  score = Math.max(10, Math.min(100, Math.round(score)));

  let assessmentStatus: "excellent" | "good" | "warning" | "danger" = "good";
  let title = "Cơ cấu chi tiêu ổn định";
  let description = "Chi tiêu thiết yếu và hưởng thụ đang ở mức kiểm soát được. Hãy tiếp tục duy trì tỷ lệ tích lũy hàng tháng.";

  if (score >= 85) {
    assessmentStatus = "excellent";
    title = "Cơ cấu tài chính rất xuất sắc!";
    description = "Bạn đang tuân thủ quy tắc 50/30/20 cực kỳ chuẩn xác. Tỷ lệ tiết kiệm và đầu tư trên 20% giúp tích lũy tài sản vững chắc.";
  } else if (score >= 70) {
    assessmentStatus = "good";
    title = "Cơ cấu tài chính khá tốt";
    description = "Chi tiêu trong tầm kiểm soát. Bạn có thể tối ưu thêm một vài chi phí hưởng thụ để tăng tỷ lệ tiết kiệm lên mức 20%.";
  } else if (score >= 50) {
    assessmentStatus = "warning";
    title = "Cần chú ý chi tiêu hưởng thụ hoặc chi phí cố định";
    description = wantsPercent > 35
      ? "Khoản chi hưởng thụ đang chiếm hơn 35% ngân sách. Cân nhắc xem xét lại ăn ngoài, mua sắm hoặc giải trí."
      : "Chi phí thiết yếu đang chiếm tỷ trọng khá cao so với thu nhập. Hãy rà soát các hóa đơn định kỳ để tiết kiệm thêm.";
  } else {
    assessmentStatus = "danger";
    title = "Cảnh báo thâm hụt ngân sách!";
    description = "Tổng chi tiêu đang vượt quá hoặc xấp xỉ toàn bộ thu nhập. Cần rà soát và cắt giảm ngay các khoản không thiết yếu.";
  }

  return {
    month,
    totalIncome,
    totalExpense,
    needs: {
      total: totalNeeds,
      percentOfIncome: totalIncome > 0 ? (totalNeeds / totalIncome) * 100 : 0,
      percentOfExpense: totalExpense > 0 ? (totalNeeds / totalExpense) * 100 : 0,
      targetPercent: 50,
      delta: needsPercent - 50,
      categories: needsCats,
    },
    wants: {
      total: totalWants,
      percentOfIncome: totalIncome > 0 ? (totalWants / totalIncome) * 100 : 0,
      percentOfExpense: totalExpense > 0 ? (totalWants / totalExpense) * 100 : 0,
      targetPercent: 30,
      delta: wantsPercent - 30,
      categories: wantsCats,
    },
    savings: {
      total: totalSavings,
      percentOfIncome: savingsPercent,
      targetPercent: 20,
      delta: savingsPercent - 20,
      categories: savingsCats,
    },
    healthScore: score,
    assessment: {
      title,
      description,
      status: assessmentStatus,
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
        { id: "cat_dining", name: "Ăn uống & Cà phê", type: "expense", icon: "Coffee", color: "#f97316", monthlyBudget: 3000000, classification: "wants" },
        { id: "cat_groceries", name: "Đi chợ & Siêu thị", type: "expense", icon: "ShoppingCart", color: "#10b981", monthlyBudget: 2500000, classification: "needs" },
        { id: "cat_rent", name: "Tiền nhà & Thuê phòng", type: "expense", icon: "Home", color: "#6366f1", monthlyBudget: 5000000, classification: "needs" },
        { id: "cat_utilities", name: "Hóa đơn & Tiện ích", type: "expense", icon: "Zap", color: "#eab308", monthlyBudget: 1000000, classification: "needs" },
        { id: "cat_transport", name: "Di chuyển & Xăng xe", type: "expense", icon: "Car", color: "#3b82f6", monthlyBudget: 800000, classification: "needs" },
        { id: "cat_shopping", name: "Mua sắm & Đồ dùng", type: "expense", icon: "ShoppingBag", color: "#ec4899", monthlyBudget: 1500000, classification: "wants" },
        { id: "cat_ent", name: "Giải trí & Sở thích", type: "expense", icon: "Film", color: "#a855f7", monthlyBudget: 800000, classification: "wants" },
        { id: "cat_health", name: "Sức khỏe & Y tế", type: "expense", icon: "HeartPulse", color: "#ef4444", monthlyBudget: 500000, classification: "needs" },
        { id: "cat_salary", name: "Tiền lương & Thù lao", type: "income", icon: "Briefcase", color: "#10b981", monthlyBudget: 0, classification: "needs" },
        { id: "cat_freelance", name: "Dự án ngoài & Thưởng", type: "income", icon: "Laptop", color: "#06b6d4", monthlyBudget: 0, classification: "needs" },
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
