# 🏦 VaultFlow — Single-User Personal Finance Manager

A lightweight, blazing-fast, single-user Personal Finance Management application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Turso (libSQL / SQLite serverless)** with **Drizzle ORM**.

Designed for zero friction, near-zero overhead, single-user security via a master PIN code, and optimized for **Vercel** serverless deployment with **PWA** (Progressive Web App) mobile support.

---

## ⚡ Highlights

- **Near-Zero Latency & Cost:** Powered by Turso libSQL serverless SQLite. Cold starts are negligible, and Turso's free tier provides 9GB of storage and millions of read/write queries.
- **Single-User Master PIN Authentication:** Secured with an HMAC-SHA256 signed session cookie via Web Crypto API. No heavyweight Auth0 or NextAuth overhead.
- **Mobile One-Thumb Input:** Fast transaction logging modal with quick-increment amount chips (`+10`, `+50`, `+100`), instant type switching, category chips, and wallet pickers.
- **Real-Time Multi-Wallet Balance:** Real-time balance calculations across **Cash**, **Bank Accounts**, **E-Wallets**, and **Credit Cards** (with credit limit and utilization rate tracking).
- **Monthly Budgets & Fixed Recurring Bills:** Visual progress bars with budget alert thresholds (green `<75%`, yellow `75–99%`, red `≥100%`) and 1-click **"Pay Bill"** logging.
- **Interactive Financial Visualizations:** Cash flow trend charts (past 6 months) and category spending donut charts built with Recharts.
- **Data Portability & Offline Backup:** One-click full database **JSON export**, **CSV export** for spreadsheet analysis, and **JSON restore/import** for seamless backups.
- **Progressive Web App (PWA):** Installable directly to Home Screen on iOS and Android with standalone viewport, custom app icons, and offline manifest.

---

## 🏗️ Technical Architecture

| Layer | Technology | Rationale |
|---|---|---|
| **Framework** | Next.js 16 (App Router) + TypeScript | Modern Server Components & Server Actions for direct database mutation without boilerplate API routes. |
| **Styling** | Tailwind CSS + Lucide Icons | Deep obsidian dark-mode-first aesthetic with responsive mobile bottom bar and desktop top navigation. |
| **Database** | Turso (libSQL serverless) | Distributed SQLite at the edge. Automatically falls back to `file:local.db` for zero-setup local dev! |
| **ORM** | Drizzle ORM + Drizzle Kit | Lightweight SQL queries, type-safe schema definitions, and migration tooling. |
| **Authentication** | Web Crypto HMAC-SHA256 (`crypto.subtle`) | Fast edge cookie verification; protects routes with Next.js Proxy/Middleware. |
| **Charts** | Recharts | Responsive, clean SVG charts customized for dark mode. |
| **PWA** | Web App Manifest & Viewport Meta | Add to Home Screen support with `black-translucent` status bar. |

---

## 📦 Database Schema (`src/db/schema.ts`)

```typescript
// 1. Wallets (Cash, Bank, E-Wallet, Credit Card)
wallets: {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["cash", "bank", "e_wallet", "credit"] }),
  currency: text("currency").default("USD"),
  initialBalance: real("initial_balance").default(0),
  creditLimit: real("credit_limit").default(0),
  color: text("color"),
  icon: text("icon"),
  isArchived: integer("is_archived", { mode: "boolean" }),
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
}

// 2. Categories
categories: {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["expense", "income"] }),
  icon: text("icon"),
  color: text("color"),
  monthlyBudget: real("monthly_budget"),
  createdAt: integer("created_at"),
}

// 3. Transactions
transactions: {
  id: text("id").primaryKey(),
  amount: real("amount").notNull(),
  type: text("type", { enum: ["expense", "income", "transfer"] }),
  categoryId: text("category_id").references(() => categories.id),
  walletId: text("wallet_id").references(() => wallets.id),
  destinationWalletId: text("destination_wallet_id").references(() => wallets.id),
  date: text("date").notNull(), // ISO YYYY-MM-DD
  note: text("note"),
  isRecurring: integer("is_recurring", { mode: "boolean" }),
  createdAt: integer("created_at"),
}

// 4. Recurring Bills
recurringBills: {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  categoryId: text("category_id"),
  walletId: text("wallet_id"),
  frequency: text("frequency"),
  dueDay: integer("due_day").notNull(), // 1 - 31
  isActive: integer("is_active", { mode: "boolean" }),
  lastPaidDate: text("last_paid_date"),
  note: text("note"),
  createdAt: integer("created_at"),
}
```

---

## 🚀 Quick Start (Local Development)

The application includes an **automatic SQLite fallback**. You can run and test the app immediately without creating a Turso account first!

```bash
# 1. Clone repository
git clone <your-repo-url>
cd personal-finance-management

# 2. Install dependencies
pnpm install

# 3. Seed initial sample data (wallets, categories, sample transactions)
pnpm db:seed

# 4. Start local development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000). The default Master PIN is:
```
123456
```

---

## 🌐 Step-by-Step Turso Database Setup

[Turso](https://turso.tech) provides serverless SQLite databases with a generous free tier (no credit card required).

### Option A: Using the Turso CLI

1. **Install the Turso CLI:**
   - **macOS / Linux:** `curl -sSfL https://get.tur.so/install.sh | bash`
   - **Windows (PowerShell):** `irm https://get.tur.so/install.ps1 | iex`

2. **Authenticate & Create Database:**
   ```bash
   turso auth signup   # or turso auth login
   turso db create vaultflow
   ```

3. **Get your Database URL & Auth Token:**
   ```bash
   # Get URL (e.g., libsql://vaultflow-your-user.turso.io)
   turso db show vaultflow --url

   # Generate Auth Token
   turso db tokens create vaultflow
   ```

### Option B: Using the Turso Web Console

1. Navigate to [https://turso.tech](https://turso.tech) and log in.
2. Click **Create Database**, name it `vaultflow`, and select the region closest to your Vercel deployment.
3. Click **Generate Token** in the database dashboard.
4. Copy the **Database URL** (`libsql://...`) and the **Auth Token**.

---

## 🛠️ Pushing Schema to Turso

Once you have your Turso credentials, configure `.env.local`:

```env
TURSO_DATABASE_URL="libsql://vaultflow-your-org.turso.io"
TURSO_AUTH_TOKEN="eyJhbGciOi..."
VERCEL_APP_PIN="your-secret-6-digit-pin"
AUTH_SECRET="generate-any-random-32-character-secret"
```

Push the database schema directly to Turso:

```bash
# Push schema tables to Turso
pnpm db:push

# (Optional) Seed with production starter wallets & categories
pnpm db:seed
```

You can also run Drizzle Studio locally to visually view or edit rows:
```bash
pnpm db:studio
```

---

## 🚢 Deploying to Vercel via GitHub

### Step 1: Push Repository to GitHub

```bash
git add .
git commit -m "feat: initial VaultFlow setup"
git branch -M main
git remote add origin https://github.com/<your-username>/vaultflow.git
git push -u origin main
```

### Step 2: Import on Vercel

1. Log in to [Vercel](https://vercel.com) and click **Add New... → Project**.
2. Select your `vaultflow` GitHub repository.
3. Under **Environment Variables**, configure the following 4 keys:

| Key | Example Value | Description |
|---|---|---|
| `TURSO_DATABASE_URL` | `libsql://vaultflow-username.turso.io` | Your Turso DB connection endpoint. |
| `TURSO_AUTH_TOKEN` | `eyJhbGciOi...` | Turso secret authentication token. |
| `VERCEL_APP_PIN` | `749281` | Your private master PIN code to unlock the app. |
| `AUTH_SECRET` | `a39d8e7b1c4f5290a84e6...` | 32+ character random string for signing cookies. |

4. Click **Deploy**. Vercel will build and deploy your app in ~30 seconds!

---

## 📱 Mobile PWA Installation Guide

### iOS (Safari)
1. Open your deployed Vercel URL in **Safari**.
2. Tap the **Share** button (box with upward arrow at bottom).
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add**. The app will now open full-screen without Safari browser address bars.

### Android (Chrome)
1. Open your deployed Vercel URL in **Chrome**.
2. Tap the three dots menu in the top right.
3. Tap **"Install app"** or **"Add to Home screen"**.
4. Launch VaultFlow directly from your app drawer.

---

## 🛡️ Security Model

- **No Remote Credential Leaks:** No third-party OAuth callbacks or tracking scripts.
- **HMAC Cookie Signing:** Sessions are signed with Web Crypto HMAC-SHA256 and stored in an `httpOnly`, `SameSite=Lax`, `Secure` cookie.
- **Zero Public Data:** All pages and server actions verify the session token through the Next.js `proxy.ts` middleware before executing database queries.
- **Offline Data Ownership:** Full database JSON export allows instant disaster recovery or self-hosting on any SQLite/libSQL provider.

---

## 📜 Available Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Run local development server |
| `pnpm build` | Compile Next.js production build |
| `pnpm db:push` | Synchronize Drizzle schema directly to Turso / local DB |
| `pnpm db:generate` | Generate SQL migration files in `drizzle/` |
| `pnpm db:migrate` | Programmatically run SQL migrations using `@libsql/client` |
| `pnpm db:seed` | Seed default wallets, categories, bills, and transactions |
| `pnpm db:studio` | Launch Drizzle Studio Web GUI |
