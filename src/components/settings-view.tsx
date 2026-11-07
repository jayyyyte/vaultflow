"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { exportDatabaseJson, exportTransactionsCsv, importDatabaseJson } from "@/actions/backup";
import { updateSetting } from "@/actions/settings";
import { changeMasterPin } from "@/actions/auth";
import { useToast } from "./toast-provider";
import { CategoryModal } from "./category-modal";
import { DynamicIcon } from "./icon-helper";
import { formatCurrency } from "@/lib/utils";
import type { Category } from "@/db/schema";
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
  CloudUpload,
  Copy,
  Plus,
  Edit2,
  Lock,
  Tag,
  TrendingDown,
  TrendingUp,
  Layers,
} from "lucide-react";

interface SettingsViewProps {
  settingsMap: Record<string, string>;
  isDefaultPin: boolean;
  categories?: Category[];
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

export function SettingsView({
  settingsMap,
  isDefaultPin,
  categories = [],
}: SettingsViewProps) {
  const router = useRouter();
  const { toast, confirm } = useToast();

  const [selectedCurrency, setSelectedCurrency] = useState(settingsMap.currency || "USD");
  const [currencySaving, setCurrencySaving] = useState(false);
  const [currencySuccess, setCurrencySuccess] = useState(false);

  const [isExportingJson, setIsExportingJson] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Change PIN state
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);

  // Category management state
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [categoryTab, setCategoryTab] = useState<"expense" | "income">("expense");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  React.useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const handleCurrencyChange = async (newCode: string) => {
    const cur = CURRENCIES.find((c) => c.code === newCode);
    if (!cur) return;

    setSelectedCurrency(newCode);
    setCurrencySaving(true);
    try {
      await updateSetting("currency", cur.code);
      await updateSetting("currency_symbol", cur.symbol);
      setCurrencySuccess(true);
      toast.success(`Đã cập nhật tiền tệ thành ${cur.label}`);
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
      toast.success("Đã tải xuống file sao lưu JSON thành công!");
    } catch {
      toast.error("Không thể xuất file sao lưu JSON");
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
      toast.success("Đã tải xuống file CSV giao dịch thành công!");
    } catch {
      toast.error("Không thể xuất file CSV");
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ok = await confirm({
      title: "Xác nhận phục hồi dữ liệu",
      message: "Khôi phục bản sao lưu này sẽ cập nhật hoặc bổ sung các bản ghi hiện có. Bạn có muốn tiếp tục?",
      confirmText: "Phục hồi",
      isDestructive: false,
    });
    if (!ok) {
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
        const msg = `Đã khôi phục thành công ${res.count} bản ghi!`;
        setImportStatus(msg);
        toast.success(msg);
        router.refresh();
      } else {
        const msg = `Lỗi: ${res.error || "Không thể khôi phục bản sao lưu"}`;
        setImportStatus(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      const msg = `File JSON không hợp lệ: ${err.message || ""}`;
      setImportStatus(msg);
      toast.error(msg);
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError(null);

    if (!currentPin) {
      setPinChangeError("Vui lòng nhập mã PIN hiện tại");
      return;
    }

    if (!newPin || !/^\d{6}$/.test(newPin.trim())) {
      setPinChangeError("Mã PIN mới phải bao gồm đúng 6 chữ số (chỉ bao gồm số từ 0-9)");
      return;
    }

    if (newPin !== confirmNewPin) {
      setPinChangeError("Xác nhận mã PIN mới không trùng khớp");
      return;
    }

    setIsChangingPin(true);
    try {
      const res = await changeMasterPin(currentPin, newPin);
      if (res.success) {
        toast.success("Đã cập nhật mã Master PIN thành công!");
        setCurrentPin("");
        setNewPin("");
        setConfirmNewPin("");
        router.refresh();
      } else {
        setPinChangeError(res.error || "Không thể đổi mã PIN");
      }
    } catch {
      setPinChangeError("Đã xảy ra lỗi không mong muốn");
    } finally {
      setIsChangingPin(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    toast.success("Đã sao chép vào clipboard!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredCategories = localCategories.filter((c) => c.type === categoryTab);

  return (
    <div className="space-y-8 max-w-4xl">
      {/* 1. Category Management Section */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Tag className="w-5 h-5 text-emerald-400" />
              Quản lý Danh mục (Categories)
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Thêm mới, đổi tên, biểu tượng, màu sắc và hạn mức ngân sách tháng cho từng danh mục
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingCategory(null);
              setIsCategoryModalOpen(true);
            }}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-950 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Thêm danh mục
          </button>
        </div>

        {/* Tab Toggle: Expense vs Income */}
        <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 self-start w-fit">
          <button
            type="button"
            onClick={() => setCategoryTab("expense")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
              categoryTab === "expense"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            Chi tiêu ({localCategories.filter((c) => c.type === "expense").length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryTab("income")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
              categoryTab === "income"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Thu nhập ({localCategories.filter((c) => c.type === "income").length})
          </button>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => {
                setEditingCategory(cat);
                setIsCategoryModalOpen(true);
              }}
              role="button"
              tabIndex={0}
              className="p-3 bg-zinc-900/70 hover:bg-zinc-800/80 active:scale-[0.98] border border-zinc-800 rounded-xl flex items-center justify-between gap-3 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                  style={{
                    backgroundColor: `${cat.color}25`,
                    color: cat.color,
                  }}
                >
                  <DynamicIcon name={cat.icon} className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="text-xs font-bold text-zinc-100 truncate block">
                    {cat.name}
                  </span>
                  {cat.type === "expense" && cat.monthlyBudget && cat.monthlyBudget > 0 ? (
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Hạn mức: {formatCurrency(cat.monthlyBudget, settingsMap.currency, settingsMap.currency_symbol)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-500">
                      {cat.type === "income" ? "Khoản thu" : "Chưa đặt ngân sách"}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-1 rounded-md text-zinc-500 group-hover:text-zinc-300 transition-colors">
                <Edit2 className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Security & Master PIN Management */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-5 sm:p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            Bảo mật & Quản lý Master PIN
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Mã PIN bảo vệ toàn bộ kho lưu trữ dữ liệu cá nhân của bạn với cơ chế chống Brute-force
          </p>
        </div>

        {/* PIN Security Status Badge */}
        <div className="space-y-2">
          {isDefaultPin ? (
            <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Đang sử dụng mã PIN mặc định: 123456
              </div>
              <p className="text-xs text-zinc-300">
                Hãy đổi mã PIN mới bên dưới ngay để bảo vệ tài khoản tài chính cá nhân của bạn.
              </p>
            </div>
          ) : (
            <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3.5 flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <Check className="w-4 h-4 stroke-[3]" />
              Mã Master PIN riêng tư đã được kích hoạt và mã hóa bảo mật an toàn.
            </div>
          )}

          {/* Brute-force notice */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-zinc-400">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Bảo vệ Brute-force:</strong> Hệ thống sẽ tự động khóa tạm 60 giây nếu nhập sai mã PIN quá 5 lần liên tiếp.
            </span>
          </div>
        </div>

        {/* Change Master PIN Form */}
        <form onSubmit={handleChangePin} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            Đổi mã Master PIN
          </h3>

          {pinChangeError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pinChangeError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">
                Mã PIN hiện tại
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">
                Mã PIN mới (6 chữ số)
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">
                Xác nhận PIN mới
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmNewPin}
                onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isChangingPin || !currentPin || !newPin || !confirmNewPin}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-40 disabled:pointer-events-none shadow-sm shadow-emerald-950"
            >
              {isChangingPin ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              )}
              Lưu mã PIN mới
            </button>
          </div>
        </form>

        {/* Currency Selector */}
        <div className="pt-3 border-t border-zinc-800/80">
          <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
            Đơn vị tiền tệ mặc định
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
                <Check className="w-3.5 h-3.5" /> Đã lưu
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Data Backup & Export Section */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-5 sm:p-6 space-y-5">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            Sao lưu & Xuất Dữ liệu
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Sao lưu ngoại tuyến toàn bộ hồ sơ tài chính mọi lúc, hoàn toàn không bị phụ thuộc nền tảng
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* JSON Full Backup */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm">
                <FileJson className="w-4 h-4 text-emerald-400" />
                Sao lưu Full Database JSON
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Xuất tất cả ví, danh mục, giao dịch, hóa đơn định kỳ và cài đặt vào một file JSON duy nhất.
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
              Tải bản sao lưu (.json)
            </button>
          </div>

          {/* Transactions CSV */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Sổ giao dịch Excel/CSV
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Định dạng chuẩn cho Excel, Google Sheets với các cột ngày, loại, số tiền, danh mục và ví.
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
              Tải sổ giao dịch (.csv)
            </button>
          </div>
        </div>

        {/* Restore Section */}
        <div className="pt-3 border-t border-zinc-800/80">
          <label className="text-xs font-semibold text-zinc-300 block mb-1">
            Phục hồi / Nhập bản sao lưu JSON
          </label>
          <p className="text-[11px] text-zinc-400 mb-3">
            Tải lên bản sao lưu JSON đã xuất trước đó để khôi phục hoặc đồng bộ dữ liệu vào VaultFlow.
          </p>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-2 transition-all">
              {isImporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Chọn file sao lưu (.json)
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

      {/* 4. Turso DB & Vercel Deployment Instructions */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-5 sm:p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CloudUpload className="w-5 h-5 text-purple-400" />
            Hướng dẫn Triển khai Turso & Vercel
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            3 bước đơn giản để tạo cơ sở dữ liệu serverless Turso miễn phí và deploy lên Vercel.
          </p>
        </div>

        {/* Step 1 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h3 className="text-sm font-bold text-zinc-200">
              Tạo cơ sở dữ liệu Turso (libSQL) miễn phí
            </h3>
          </div>
          <p className="text-xs text-zinc-400 pl-8">
            Cài đặt Turso CLI hoặc tạo trực tiếp trên giao diện Web Console tại{" "}
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
              <code>tursodb auth signup<br />tursodb db create vaultflow<br />tursodb db show vaultflow --url<br />tursodb db tokens create vaultflow</code>
              <button
                onClick={() =>
                  copyToClipboard(
                    "tursodb auth signup\ntursodb db create vaultflow\ntursodb db show vaultflow --url\ntursodb db tokens create vaultflow",
                    "turso-cli"
                  )
                }
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                title="Sao chép lệnh"
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
              Đồng bộ Schema vào Turso
            </h3>
          </div>
          <p className="text-xs text-zinc-400 pl-8">
            Điền thông tin kết nối vào file <code className="text-zinc-200 font-mono">.env.local</code>, sau đó chạy lệnh đẩy schema:
          </p>
          <div className="pl-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 font-mono text-xs text-zinc-300 relative group">
              <code>pnpm db:push<br />pnpm db:seed</code>
              <button
                onClick={() => copyToClipboard("pnpm db:push\npnpm db:seed", "push-seed")}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                title="Sao chép lệnh"
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
              Deploy lên Vercel với Environment Variables
            </h3>
          </div>
          <p className="text-xs text-zinc-400 pl-8">
            Đẩy repo lên GitHub và import vào Vercel. Trong Project Settings → Environment Variables, khai báo:
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

      {/* Category Modal for Edit / Create */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        categoryToEdit={editingCategory}
        defaultType={categoryTab}
        currencySymbol={settingsMap.currency_symbol || "$"}
        onSuccess={(saved) => {
          setLocalCategories((prev) => [
            saved,
            ...prev.filter((c) => c.id !== saved.id),
          ]);
          router.refresh();
        }}
        onDeleteSuccess={() => {
          if (editingCategory) {
            setLocalCategories((prev) => prev.filter((c) => c.id !== editingCategory.id));
          }
          router.refresh();
        }}
      />
    </div>
  );
}
