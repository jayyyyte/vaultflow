<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 🏦 VaultFlow Developer & AI Agent Guidelines

## 1. Project Overview & Architecture
VaultFlow is a lightweight, ultra-fast personal finance management application designed for a single user, with primary usage on **Mobile (PWA)** and full desktop support.

- **Framework:** Next.js 16 (App Router) + TypeScript + React 19.
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss";` in `globals.css`) + Lucide Icons.
- **Database:** Turso (libSQL serverless SQLite). Automatically falls back to `file:local.db` for local dev if credentials are not configured.
- **ORM:** Drizzle ORM (`src/db/schema.ts`, `src/db/index.ts`).
- **Auth:** Web Crypto HMAC-SHA256 session cookie verified via Next.js Proxy (`src/proxy.ts`). Single-user Master PIN.
- **Deployment:** Vercel serverless.

---

## 2. Mobile-First Engineering Rules
Because VaultFlow is primarily accessed from smartphones:
1. **Touch Targets & Thumb Reachability:**
   - Interactive elements (buttons, chips, list items) must have a minimum touch target size of 44x44px.
   - Primary actions must be within easy reach of the thumb (bottom bar, bottom sheets).
2. **Virtual Keyboard & Safe Area Insets:**
   - Modals and Bottom Sheets must use dynamic viewport units (`dvh` or `max-h-[90dvh]`).
   - Always account for iOS Safari bottom navigation bar and home indicator with `pb-[env(safe-area-inset-bottom)]`.
   - Never place submit buttons where they can be hidden behind virtual keyboards.
3. **No Hover-Only Affordances:**
   - Touch devices do not have `hover`. Avoid using `opacity-0 group-hover:opacity-100` for critical actions (such as Edit or Delete buttons). Use explicit tap actions, action sheets, or touch-friendly icon buttons.
4. **Localization & Currency Formatting:**
   - Always use the helper `formatCurrency()` from `src/lib/utils.ts`.
   - Never hardcode decimals `.00` for zero-decimal currencies like VND or JPY.
   - Increment chips on mobile must be currency-aware (e.g. +50k, +100k for VND vs. +10, +50 for USD).

---

## 3. Database & Server Actions Rules
1. **Never load unbounded transaction rows into memory:**
   - Avoid `await db.select().from(transactions)` and doing JavaScript filtering/calculations in memory.
   - Use SQLite aggregation (`sql<number>\`SUM(CASE WHEN ...)\``) and `GROUP BY` to push calculations to the database engine.
2. **Always revalidate affected paths on mutation:**
   - When a transaction, wallet, or category is modified, call `revalidatePath("/")`, `revalidatePath("/transactions")`, `revalidatePath("/wallets")`, and `revalidatePath("/budgets")`.
3. **Keep Client/Server Boundaries Clean:**
   - Server Actions live in `src/actions/` and must declare `"use server";`.
   - Interactive UI components live in `src/components/` and must declare `"use client";`.

---

## 4. Commands Reference
- `pnpm dev` - Start development server.
- `pnpm build` - Run production build and verify TypeScript/Turbopack compliance.
- `pnpm db:push` - Synchronize Drizzle schema to the database.
- `pnpm db:seed` - Seed demo data.
