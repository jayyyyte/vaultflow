"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { exportDatabaseJson, exportTransactionsCsv, importDatabaseJson } from "@/actions/backup";
import { updateSetting } from "@/actions/settings";
import {
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Loader2,
  Shield,
  KeyRound,
  ExternalLink,
  Terminal,
  Database,
  CloudUpload,
  Copy,
} from "lucide-react";

interface SettingsViewProps {
  settingsMap: Record<string, string>;
  isDefaultPin: boolean;
}

const CURRENCIES = [
  { code: "USD", symbol: "$", label: "USD ($) - US Dollar" },
  { code: "EUR", symbol: "€", label: "EUR (€) - Euro" },
  { code: "GBP", symbol: "£", label: "GBP (£) - British Pound" },
  { code: "JPY", symbol: "¥", label: "JPY (¥) - Japanese Yen" },
  { code: "CAD", symbol: "$", label: "CAD ($) - Canadian Dollar" },
  { code: "AUD", symbol: "$", label: "AUD ($) - Australian Dollar" },
  { code: "VND", symbol: "₫", label: "VND (₫) - Vietnamese Dong" },
  { code: "SGD", symbol: "$", label: "SGD ($) - Singapore Dollar" },
  { code: "INR", symbol: "₹", label: "INR (₹) - Indian Rupee" },
];

export function SettingsView({ settingsMap, isDefaultPin }: SettingsViewProps) {
  const router = useRouter();

  const [selectedCurrency, setSelectedCurrency] = useState(settingsMap.currency || "USD");
  const [currencySaving, setCurrencySaving] = useState(false);
  const [currencySuccess, setCurrencySuccess] = useState(false);

  const [isExportingJson, setIsExportingJson] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCurrencyChange = async (newCode: string) => {
    const cur = CURRENCIES.find((c) => c.code === newCode);
    if (!cur) return;

    setSelectedCurrency(newCode);
    setCurrencySaving(true);
    try {
      await updateSetting("currency", cur.code);
      await updateSetting("currency_symbol", cur.symbol);
      setCurrencySuccess(true);
      setTimeout(() => setCurrencySuccess(false), 2000);
      router.refresh();
    } finally {
      setCurrencySaving(false);
    }
  };

  const handleExportJson = async () => {
    setIsExportingJson(true);
    try {
      const data = await exportDatabaseJson();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vaultflow-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export JSON backup");
    } finally {
      setIsExportingJson(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const csvStr = await exportTransactionsCsv();
      const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vaultflow-transactions-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export CSV");
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Restoring this backup will merge or update existing data. Continue?")) {
      e.target.value = "";
      return;
    }

    setIsImporting(true);
    setImportStatus(null);

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await importDatabaseJson(json);
      if (res.success) {
        setImportStatus(`Successfully restored ${res.count} records!`);
        router.refresh();
      } else {
        setImportStatus(`Error: ${res.error || "Failed to restore backup"}`);
      }
    } catch (err: any) {
      setImportStatus(`Import failed: ${err.message || "Invalid JSON file"}`);
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* 1. Data Backup & Export Section */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-5 sm:p-6 space-y-5">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            Data Backup & One-Click Export
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Safeguard your financial records offline anytime with zero vendor lock-in.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* JSON Full Backup */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm">
                <FileJson className="w-4 h-4 text-emerald-400" />
                Full Database JSON Backup
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Exports all wallets, categories, transactions, recurring bills, and settings into a single JSON file.
              </p>
            </div>
            <button
              onClick={handleExportJson}
              disabled={isExportingJson}
              className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all border border-zinc-700/60"
            >
              {isExportingJson ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Download Backup (.json)
            </button>
          </div>

          {/* Transactions CSV */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Transactions Spreadsheet (.csv)
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Formatted for Excel, Google Sheets, or Numbers with columns for date, type, amount, category, and wallet.
              </p>
            </div>
            <button
              onClick={handleExportCsv}
              disabled={isExportingCsv}
              className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all border border-zinc-700/60"
            >
              {isExportingCsv ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Download Ledger (.csv)
            </button>
          </div>
        </div>

        {/* Restore Section */}
        <div className="pt-3 border-t border-zinc-800/80">
          <label className="text-xs font-semibold text-zinc-300 block mb-1">
            Restore / Import JSON Backup
          </label>
          <p className="text-[11px] text-zinc-400 mb-3">
            Upload a previously exported VaultFlow JSON backup to restore or migrate all data.
          </p>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-2 transition-all">
              {isImporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Select Backup File
              <input
                type="file"
                accept=".json"
                onChange={handleImportJsonFile}
                disabled={isImporting}
                className="hidden"
              />
            </label>
            {importStatus && (
              <span className="text-xs text-zinc-300 font-medium">{importStatus}</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. App Preferences (Currency & PIN) */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-5 sm:p-6 space-y-5">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          Security & Currency Settings
        </h2>

        {/* Currency Selector */}
        <div>
          <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
            Default Display Currency
          </label>
          <div className="flex items-center gap-3">
            <select
              value={selectedCurrency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 max-w-xs"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            {currencySaving && <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />}
            {currencySuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>
        </div>

        {/* PIN Security Status */}
        <div className="pt-3 border-t border-zinc-800/80">
          <label className="text-xs font-semibold text-zinc-300 block mb-1">
            Master PIN Security
          </label>
          {isDefaultPin ? (
            <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Default PIN Active: 123456
              </div>
              <p className="text-xs text-zinc-300">
                You are currently running with the default PIN. When deploying to production on Vercel, set the environment variable <code className="text-emerald-400 font-mono">VERCEL_APP_PIN</code> to your private PIN.
              </p>
            </div>
          ) : (
            <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3.5 flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <Check className="w-4 h-4 stroke-[3]" />
              Private Master PIN is configured and active via environment variable.
            </div>
          )}
        </div>
      </div>

      {/* 3. Turso DB & Vercel Deployment Instructions */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-5 sm:p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CloudUpload className="w-5 h-5 text-purple-400" />
            Turso & Vercel Deployment Guide
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Follow this 3-step guide to create a free Turso serverless database and deploy to Vercel.
          </p>
        </div>

        {/* Step 1 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h3 className="text-sm font-bold text-zinc-200">
              Create a free Turso (libSQL) Database
            </h3>
          </div>
          <p className="text-xs text-zinc-400 pl-8">
            Install the Turso CLI or create a database in the Turso Web Console at{" "}
            <a
              href="https://turso.tech"
              target="_blank"
              rel="noreferrer"
              className="text-purple-400 underline inline-flex items-center gap-1"
            >
              turso.tech <ExternalLink className="w-3 h-3" />
            </a>
            :
          </p>
          <div className="pl-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 font-mono text-xs text-zinc-300 relative group">
              <code>turso auth signup<br />turso db create vaultflow<br />turso db show vaultflow --url<br />turso db tokens create vaultflow</code>
              <button
                onClick={() =>
                  copyToClipboard(
                    "turso auth signup\nturso db create vaultflow\nturso db show vaultflow --url\nturso db tokens create vaultflow",
                    "turso-cli"
                  )
                }
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                title="Copy Commands"
              >
                {copiedCode === "turso-cli" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold flex items-center justify-center">
              2
            </span>
            <h3 className="text-sm font-bold text-zinc-200">
              Push Database Schema to Turso
            </h3>
          </div>
          <p className="text-xs text-zinc-400 pl-8">
            In your local <code className="text-zinc-200 font-mono">.env.local</code> file, add your Turso credentials, then push the schema:
          </p>
          <div className="pl-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 font-mono text-xs text-zinc-300 relative group">
              <code>pnpm db:push<br />pnpm db:seed</code>
              <button
                onClick={() => copyToClipboard("pnpm db:push\npnpm db:seed", "push-seed")}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                title="Copy Commands"
              >
                {copiedCode === "push-seed" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold flex items-center justify-center">
              3
            </span>
            <h3 className="text-sm font-bold text-zinc-200">
              Deploy to Vercel with Environment Variables
            </h3>
          </div>
          <p className="text-xs text-zinc-400 pl-8">
            Push this repository to GitHub and import it on Vercel. In Vercel Project Settings → Environment Variables, add:
          </p>
          <div className="pl-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 font-mono text-xs text-zinc-300 space-y-1">
              <div><span className="text-emerald-400">TURSO_DATABASE_URL</span>=libsql://vaultflow-[org].turso.io</div>
              <div><span className="text-emerald-400">TURSO_AUTH_TOKEN</span>=eyJhbGci...</div>
              <div><span className="text-emerald-400">VERCEL_APP_PIN</span>=654321</div>
              <div><span className="text-emerald-400">AUTH_SECRET</span>=your-random-32-char-secret</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
