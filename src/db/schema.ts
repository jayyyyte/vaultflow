import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const wallets = sqliteTable("wallets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["cash", "bank", "e_wallet", "credit"] }).notNull().default("bank"),
  currency: text("currency").notNull().default("USD"),
  initialBalance: real("initial_balance").notNull().default(0),
  creditLimit: real("credit_limit").default(0), // Applicable for credit card wallets
  color: text("color").notNull().default("#3b82f6"),
  icon: text("icon").notNull().default("Wallet"),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer("updated_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["expense", "income"] }).notNull().default("expense"),
  icon: text("icon").notNull().default("Tag"),
  color: text("color").notNull().default("#10b981"),
  monthlyBudget: real("monthly_budget").default(0),
  createdAt: integer("created_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  amount: real("amount").notNull(),
  type: text("type", { enum: ["expense", "income", "transfer"] }).notNull(),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  walletId: text("wallet_id").notNull().references(() => wallets.id, { onDelete: "cascade" }),
  destinationWalletId: text("destination_wallet_id").references(() => wallets.id, { onDelete: "set null" }), // For transfers
  date: text("date").notNull(), // ISO YYYY-MM-DD
  note: text("note"),
  isRecurring: integer("is_recurring", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export const recurringBills = sqliteTable("recurring_bills", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  walletId: text("wallet_id").references(() => wallets.id, { onDelete: "set null" }),
  frequency: text("frequency", { enum: ["monthly", "yearly", "weekly"] }).notNull().default("monthly"),
  dueDay: integer("due_day").notNull(), // 1 - 31
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastPaidDate: text("last_paid_date"), // ISO YYYY-MM-DD
  note: text("note"),
  createdAt: integer("created_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type RecurringBill = typeof recurringBills.$inferSelect;
export type NewRecurringBill = typeof recurringBills.$inferInsert;
export type Setting = typeof settings.$inferSelect;
