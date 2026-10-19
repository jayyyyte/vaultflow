import { db, client } from "../src/db";
import { wallets, categories, transactions, recurringBills, settings } from "../src/db/schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
}

function formatDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // 1. Settings
    console.log("- Seeding settings...");
    await db.insert(settings).values([
      { key: "currency", value: "USD" },
      { key: "currency_symbol", value: "$" },
      { key: "app_name", value: "VaultFlow" },
    ]).onConflictDoNothing();

    // 2. Wallets
    console.log("- Seeding default wallets...");
    const walletCashId = "w_cash_01";
    const walletBankId = "w_bank_01";
    const walletEWalletId = "w_ewallet_01";
    const walletCreditId = "w_credit_01";

    await db.insert(wallets).values([
      {
        id: walletBankId,
        name: "Main Checking (Chase)",
        type: "bank",
        currency: "USD",
        initialBalance: 4250.0,
        creditLimit: 0,
        color: "#3b82f6", // Blue
        icon: "Building2",
        isArchived: false,
      },
      {
        id: walletCashId,
        name: "Cash Wallet",
        type: "cash",
        currency: "USD",
        initialBalance: 320.0,
        creditLimit: 0,
        color: "#10b981", // Emerald
        icon: "Banknote",
        isArchived: false,
      },
      {
        id: walletEWalletId,
        name: "Apple Pay / E-Wallet",
        type: "e_wallet",
        currency: "USD",
        initialBalance: 185.0,
        creditLimit: 0,
        color: "#8b5cf6", // Purple
        icon: "Smartphone",
        isArchived: false,
      },
      {
        id: walletCreditId,
        name: "Sapphire Reserve Card",
        type: "credit",
        currency: "USD",
        initialBalance: -450.0,
        creditLimit: 8000.0,
        color: "#f59e0b", // Amber
        icon: "CreditCard",
        isArchived: false,
      },
    ]).onConflictDoNothing();

    // 3. Categories
    console.log("- Seeding categories...");
    const catSalary = "cat_salary";
    const catFreelance = "cat_freelance";
    const catRent = "cat_rent";
    const catGroceries = "cat_groceries";
    const catDining = "cat_dining";
    const catUtilities = "cat_utilities";
    const catTransport = "cat_transport";
    const catShopping = "cat_shopping";
    const catEntertainment = "cat_ent";

    await db.insert(categories).values([
      // Income
      { id: catSalary, name: "Salary & Wages", type: "income", icon: "Briefcase", color: "#10b981", monthlyBudget: 0 },
      { id: catFreelance, name: "Freelance & Projects", type: "income", icon: "Laptop", color: "#06b6d4", monthlyBudget: 0 },
      // Expense
      { id: catRent, name: "Rent & Housing", type: "expense", icon: "Home", color: "#6366f1", monthlyBudget: 1400 },
      { id: catGroceries, name: "Groceries & Market", type: "expense", icon: "ShoppingCart", color: "#10b981", monthlyBudget: 450 },
      { id: catDining, name: "Dining & Cafes", type: "expense", icon: "Coffee", color: "#f97316", monthlyBudget: 300 },
      { id: catUtilities, name: "Bills & Utilities", type: "expense", icon: "Zap", color: "#eab308", monthlyBudget: 180 },
      { id: catTransport, name: "Transport & Fuel", type: "expense", icon: "Car", color: "#3b82f6", monthlyBudget: 200 },
      { id: catShopping, name: "Shopping & Tech", type: "expense", icon: "ShoppingBag", color: "#ec4899", monthlyBudget: 250 },
      { id: catEntertainment, name: "Entertainment & Subs", type: "expense", icon: "Film", color: "#a855f7", monthlyBudget: 100 },
    ]).onConflictDoNothing();

    // 4. Sample Transactions
    console.log("- Seeding sample transactions...");
    const sampleTx = [
      {
        id: generateId("tx"),
        amount: 3800.0,
        type: "income" as const,
        categoryId: catSalary,
        walletId: walletBankId,
        date: formatDate(18),
        note: "Tech Corp Bi-weekly Payroll",
      },
      {
        id: generateId("tx"),
        amount: 650.0,
        type: "income" as const,
        categoryId: catFreelance,
        walletId: walletBankId,
        date: formatDate(7),
        note: "Client web design milestone payment",
      },
      {
        id: generateId("tx"),
        amount: 1400.0,
        type: "expense" as const,
        categoryId: catRent,
        walletId: walletBankId,
        date: formatDate(17),
        note: "Apartment Rent - November",
        isRecurring: true,
      },
      {
        id: generateId("tx"),
        amount: 112.5,
        type: "expense" as const,
        categoryId: catGroceries,
        walletId: walletCreditId,
        date: formatDate(12),
        note: "Trader Joe's organic weekly groceries",
      },
      {
        id: generateId("tx"),
        amount: 68.2,
        type: "expense" as const,
        categoryId: catGroceries,
        walletId: walletCreditId,
        date: formatDate(4),
        note: "Whole Foods fresh produce",
      },
      {
        id: generateId("tx"),
        amount: 34.5,
        type: "expense" as const,
        categoryId: catDining,
        walletId: walletCreditId,
        date: formatDate(3),
        note: "Dinner with team at Ramen Bar",
      },
      {
        id: generateId("tx"),
        amount: 14.8,
        type: "expense" as const,
        categoryId: catDining,
        walletId: walletCashId,
        date: formatDate(1),
        note: "Espresso & matcha at artisan bakery",
      },
      {
        id: generateId("tx"),
        amount: 79.99,
        type: "expense" as const,
        categoryId: catUtilities,
        walletId: walletBankId,
        date: formatDate(14),
        note: "High-speed Gigabit Fiber Internet",
        isRecurring: true,
      },
      {
        id: generateId("tx"),
        amount: 45.0,
        type: "expense" as const,
        categoryId: catTransport,
        walletId: walletCreditId,
        date: formatDate(8),
        note: "Shell Gasoline station fill-up",
      },
      {
        id: generateId("tx"),
        amount: 19.99,
        type: "expense" as const,
        categoryId: catEntertainment,
        walletId: walletCreditId,
        date: formatDate(10),
        note: "Netflix 4K Ultra HD & Spotify Duo",
        isRecurring: true,
      },
      {
        id: generateId("tx"),
        amount: 200.0,
        type: "transfer" as const,
        walletId: walletBankId,
        destinationWalletId: walletCashId,
        date: formatDate(6),
        note: "ATM cash withdrawal for weekend trip",
      },
    ];

    for (const tx of sampleTx) {
      await db.insert(transactions).values(tx).onConflictDoNothing();
    }

    // 5. Recurring Bills
    console.log("- Seeding recurring bills...");
    await db.insert(recurringBills).values([
      {
        id: "rb_01",
        name: "Apartment Rent",
        amount: 1400.0,
        categoryId: catRent,
        walletId: walletBankId,
        frequency: "monthly",
        dueDay: 1,
        isActive: true,
        note: "Automatic ACH bank debit",
      },
      {
        id: "rb_02",
        name: "Fiber Internet",
        amount: 79.99,
        categoryId: catUtilities,
        walletId: walletBankId,
        frequency: "monthly",
        dueDay: 15,
        isActive: true,
        note: "AT&T Fiber 1000Mbps",
      },
      {
        id: "rb_03",
        name: "Streaming Subscriptions",
        amount: 19.99,
        categoryId: catEntertainment,
        walletId: walletCreditId,
        frequency: "monthly",
        dueDay: 22,
        isActive: true,
        note: "Netflix & Spotify Premium",
      },
      {
        id: "rb_04",
        name: "Equinox Gym Fitness",
        amount: 65.0,
        categoryId: catUtilities,
        walletId: walletCreditId,
        frequency: "monthly",
        dueDay: 28,
        isActive: true,
        note: "Monthly fitness membership",
      },
    ]).onConflictDoNothing();

    console.log("✅ Database successfully seeded with production-grade sample data!");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

seed();
