"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTransaction, updateTransaction, deleteTransaction } from "@/actions/transactions";
import { seedDefaultCategoriesAndWallets } from "@/actions/categories";
import { CategoryModal } from "./category-modal";
import { DynamicIcon } from "./icon-helper";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "./toast-provider";
import type { WalletWithBalance, TransactionWithDetails } from "@/lib/types";
import type { Category } from "@/db/schema";
import {
  X,
  Plus,
  ArrowRightLeft,
  TrendingDown,
  TrendingUp,
  Calendar,
  FileText,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletWithBalance[];
  categories: Category[];
  currency?: string;
  currencySymbol?: string;
  defaultType?: "expense" | "income" | "transfer";
  defaultWalletId?: string;
  transactionToEdit?: TransactionWithDetails | null;
  onSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

export function QuickTransactionModal({
  isOpen,
  onClose,
  wallets,
  categories,
  currency = "USD",
  currencySymbol = "$",
  defaultType = "expense",
  defaultWalletId,
  transactionToEdit,
  onSuccess,
  onDeleteSuccess,
}: QuickTransactionModalProps) {
  const isEditing = !!transactionToEdit;
  const router = useRouter();
  const { toast, confirm } = useToast();

  const [type, setType] = useState<"expense" | "income" | "transfer">(
    transactionToEdit?.type || defaultType
  );
  const [amountStr, setAmountStr] = useState<string>(
    transactionToEdit ? String(transactionToEdit.amount) : ""
  );
  const [selectedWalletId, setSelectedWalletId] = useState<string>(
    transactionToEdit?.walletId || defaultWalletId || (wallets.length > 0 ? wallets[0].id : "")
  );
  const [destinationWalletId, setDestinationWalletId] = useState<string>(
    transactionToEdit?.destinationWalletId || (wallets.length > 1 ? wallets[1].id : "")
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    transactionToEdit?.categoryId || ""
  );
  const [date, setDate] = useState<string>(
    transactionToEdit?.date || new Date().toISOString().split("T")[0]
  );
  const [note, setNote] = useState<string>(transactionToEdit?.note || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Category Dropdown & Quick-Add States
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const isVnd =
    currency?.toUpperCase() === "VND" ||
    currencySymbol === "₫" ||
    currencySymbol === "đ";

  // Sync state when opened or when transactionToEdit changes
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (transactionToEdit) {
        setType(transactionToEdit.type);
        setAmountStr(String(transactionToEdit.amount));
        setSelectedWalletId(transactionToEdit.walletId);
        setDestinationWalletId(transactionToEdit.destinationWalletId || "");
        setSelectedCategoryId(transactionToEdit.categoryId || "");
        setDate(transactionToEdit.date);
        setNote(transactionToEdit.note || "");
      } else {
        setType(defaultType);
        setAmountStr("");
        setDate(new Date().toISOString().split("T")[0]);
        setNote("");
        if (defaultWalletId) {
          setSelectedWalletId(defaultWalletId);
        } else if (wallets.length > 0 && !selectedWalletId) {
          setSelectedWalletId(wallets[0].id);
        }
        if (wallets.length > 1 && !destinationWalletId) {
          const other = wallets.find((w) => w.id !== (defaultWalletId || wallets[0].id));
          if (other) setDestinationWalletId(other.id);
        }
      }
    }
  }, [isOpen, transactionToEdit, defaultType, defaultWalletId, wallets]);

  // Set default category when type changes (in create mode)
  useEffect(() => {
    if (!isEditing && type !== "transfer") {
      const availableCategories = localCategories.filter((c) => c.type === type);
      if (availableCategories.length > 0 && !availableCategories.some((c) => c.id === selectedCategoryId)) {
        setSelectedCategoryId(availableCategories[0].id);
      }
    }
  }, [type, localCategories, isEditing, selectedCategoryId]);

  if (!isOpen) return null;

  const filteredCategories = localCategories.filter((c) => c.type === type);
  const searchedCategories = filteredCategories.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase().trim())
  );
  const selectedCategory = localCategories.find((c) => c.id === selectedCategoryId);

  const handleCategoryCreated = (newCat: Category) => {
    setLocalCategories((prev) => [newCat, ...prev.filter((c) => c.id !== newCat.id)]);
    setSelectedCategoryId(newCat.id);
    setIsCategoryDropdownOpen(false);
    onSuccess?.();
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      await seedDefaultCategoriesAndWallets();
      router.refresh();
      onSuccess?.();
    } finally {
      setIsSeeding(false);
    }
  };

  const handleAddIncrement = (inc: number) => {
    const current = parseFloat(amountStr) || 0;
    const newVal = current + inc;
    setAmountStr(String(isVnd ? Math.round(newVal) : parseFloat(newVal.toFixed(2))));
  };

  const handleClearAmount = () => {
    setAmountStr("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amountStr);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage("Vui lòng nhập số tiền hợp lệ (> 0)");
      return;
    }

    if (!selectedWalletId) {
      setErrorMessage("Vui lòng chọn tài khoản / ví");
      return;
    }

    if (type === "transfer" && !destinationWalletId) {
      setErrorMessage("Vui lòng chọn ví nhận tiền chuyển");
      return;
    }

    if (type === "transfer" && selectedWalletId === destinationWalletId) {
      setErrorMessage("Ví chuyển và ví nhận phải khác nhau");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isEditing && transactionToEdit) {
        const res = await updateTransaction(transactionToEdit.id, {
          amount: numericAmount,
          type,
          walletId: selectedWalletId,
          categoryId: type === "transfer" ? undefined : selectedCategoryId || undefined,
          destinationWalletId: type === "transfer" ? destinationWalletId : undefined,
          date,
          note: note.trim() || undefined,
        });

        if (res.success) {
          toast.success("Đã cập nhật giao dịch thành công");
          onSuccess?.();
          onClose();
        } else {
          setErrorMessage(res.error || "Không thể cập nhật giao dịch");
        }
      } else {
        const res = await createTransaction({
          amount: numericAmount,
          type,
          walletId: selectedWalletId,
          categoryId: type === "transfer" ? undefined : selectedCategoryId || undefined,
          destinationWalletId: type === "transfer" ? destinationWalletId : undefined,
          date,
          note: note.trim() || undefined,
        });

        if (res.success) {
          toast.success("Đã ghi nhận giao dịch thành công");
          onSuccess?.();
          onClose();
        } else {
          setErrorMessage(res.error || "Không thể ghi nhận giao dịch");
        }
      }
    } catch {
      setErrorMessage("Đã xảy ra lỗi không mong muốn");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!transactionToEdit) return;
    const ok = await confirm({
      title: "Xác nhận xóa giao dịch",
      message: "Bạn có chắc chắn muốn xóa giao dịch này không? Hành động này không thể hoàn tác.",
      confirmText: "Xóa",
      isDestructive: true,
    });
    if (!ok) return;

    setIsDeleting(true);
    try {
      const res = await deleteTransaction(transactionToEdit.id);
      if (res.success) {
        toast.success("Đã xóa giao dịch thành công");
        onDeleteSuccess ? onDeleteSuccess() : onSuccess?.();
        onClose();
      } else {
        setErrorMessage(res.error || "Không thể xóa giao dịch");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Smart chips based on currency
  const chips = isVnd
    ? [
        { label: "+20k", val: 20000 },
        { label: "+50k", val: 50000 },
        { label: "+100k", val: 100000 },
        { label: "+200k", val: 200000 },
        { label: "+500k", val: 500000 },
      ]
    : [
        { label: "+5", val: 5 },
        { label: "+10", val: 10 },
        { label: "+20", val: 20 },
        { label: "+50", val: 50 },
        { label: "+100", val: 100 },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      {/* Modal Card / Bottom Sheet on Mobile */}
      <div className="w-full max-w-lg bg-[#121215] border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden animate-slideUp">
        {/* Mobile Drag Indicator Handle */}
        <div className="pt-2 sm:hidden flex justify-center">
          <div className="w-12 h-1 bg-zinc-700/80 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-white">
              {isEditing ? "Chỉnh sửa Giao dịch" : "Ghi nhận Giao dịch"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-zinc-800/70 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-4">
          {/* 1. Transaction Type Segmented Switcher */}
          <div className="grid grid-cols-3 gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800/80">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                type === "expense"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              Chi tiêu
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                type === "income"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Thu nhập
            </button>
            <button
              type="button"
              onClick={() => setType("transfer")}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                type === "transfer"
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Chuyển tiền
            </button>
          </div>

          {/* 2. Amount Input Section */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-between mb-1 px-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Số tiền ({currency})
              </label>
              {amountStr && (
                <button
                  type="button"
                  onClick={handleClearAmount}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5"
                >
                  <RotateCcw className="w-3 h-3" /> Xóa
                </button>
              )}
            </div>

            <div className="flex items-center justify-center gap-1 py-1">
              {!isVnd && <span className="text-2xl font-bold text-zinc-400">{currencySymbol}</span>}
              <input
                type="number"
                step="any"
                inputMode="decimal"
                autoFocus={!isEditing}
                placeholder="0"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full max-w-[240px] bg-transparent text-3xl font-extrabold text-white text-center focus:outline-none placeholder-zinc-700 font-mono"
              />
              {isVnd && <span className="text-xl font-bold text-emerald-400">₫</span>}
            </div>

            {/* Quick Increment Chips for Mobile One-Thumb Speed */}
            <div className="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t border-zinc-800/50 flex-wrap">
              {chips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleAddIncrement(chip.val)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 active:scale-95 text-xs font-semibold text-zinc-200 transition-all border border-zinc-700/60 font-mono"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Category Picker Dropdown (for Income & Expense) */}
          {type !== "transfer" && (
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-300">Danh mục</label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Tự thêm danh mục</span>
                </button>
              </div>

              {/* Dropdown Select Trigger Button */}
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border flex items-center justify-between gap-3 text-left transition-all ${
                  isCategoryDropdownOpen
                    ? "border-emerald-500 bg-zinc-900 ring-1 ring-emerald-500/40 text-white"
                    : "border-zinc-800/80 bg-zinc-900/60 text-zinc-200 hover:border-zinc-700"
                }`}
              >
                {selectedCategory ? (
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${selectedCategory.color}25`,
                        color: selectedCategory.color,
                      }}
                    >
                      <DynamicIcon name={selectedCategory.icon} className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <span className="text-sm font-semibold text-white truncate block">
                        {selectedCategory.name}
                      </span>
                      {selectedCategory.monthlyBudget && selectedCategory.monthlyBudget > 0 ? (
                        <span className="text-[10px] text-zinc-400 font-mono">
                          Hạn mức: {formatCurrency(selectedCategory.monthlyBudget, currency, currencySymbol)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-zinc-400 text-sm">
                    <Tag className="w-4 h-4 text-zinc-500" />
                    <span>
                      {filteredCategories.length === 0
                        ? "Chưa có danh mục (Bấm để thêm mới)"
                        : "Chọn danh mục..."}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 shrink-0 text-zinc-400">
                  {isCategoryDropdownOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              {/* Dropdown Menu Popup */}
              {isCategoryDropdownOpen && (
                <div className="mt-1.5 w-full bg-[#18181b] border border-zinc-700/80 rounded-2xl shadow-2xl p-2.5 space-y-2 animate-fadeIn z-20">
                  {/* Search box & Add button */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Tìm danh mục..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        className="w-full h-9 pl-8 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                        autoFocus
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCategoryDropdownOpen(false);
                        setIsCategoryModalOpen(true);
                      }}
                      className="h-9 px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm</span>
                    </button>
                  </div>

                  {/* Categories List */}
                  <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                    {searchedCategories.length === 0 ? (
                      <div className="py-4 text-center space-y-2">
                        <p className="text-xs text-zinc-400">
                          {filteredCategories.length === 0
                            ? "Chưa có danh mục nào"
                            : "Không tìm thấy danh mục phù hợp"}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCategoryDropdownOpen(false);
                            setIsCategoryModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 font-bold text-xs"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          Tạo danh mục mới
                        </button>
                      </div>
                    ) : (
                      searchedCategories.map((cat) => {
                        const isSelected = selectedCategoryId === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategoryId(cat.id);
                              setIsCategoryDropdownOpen(false);
                            }}
                            className={`w-full min-h-[44px] px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-left transition-all ${
                              isSelected
                                ? "bg-emerald-500/15 border border-emerald-500/40 text-white"
                                : "hover:bg-zinc-800/80 text-zinc-300 border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                style={{
                                  backgroundColor: `${cat.color}25`,
                                  color: cat.color,
                                }}
                              >
                                <DynamicIcon name={cat.icon} className="w-4 h-4" />
                              </div>
                              <div className="truncate">
                                <span className="text-xs font-medium truncate block">{cat.name}</span>
                                {cat.monthlyBudget && cat.monthlyBudget > 0 ? (
                                  <span className="text-[10px] text-zinc-400 font-mono">
                                    Hạn mức: {formatCurrency(cat.monthlyBudget, currency, currencySymbol)}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            {isSelected && (
                              <Check className="w-4 h-4 text-emerald-400 stroke-[3] shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Wallet Picker */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2">
              {type === "transfer" ? "Từ ví (Nguồn)" : "Tài khoản / Ví"}
            </label>
            {wallets.length === 0 ? (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-dashed border-amber-500/30 text-center space-y-2">
                <p className="text-xs text-amber-300 font-medium">⚠️ Chưa có tài khoản hoặc ví nào</p>
                <p className="text-[11px] text-zinc-400">
                  Bạn cần có ít nhất 1 ví để ghi nhận giao dịch.
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSeedData}
                    disabled={isSeeding}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors"
                  >
                    {isSeeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>⚡ Nạp dữ liệu ví & danh mục mẫu</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {wallets.map((w) => {
                  const isSelected = selectedWalletId === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWalletId(w.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/10 text-white ring-1 ring-emerald-500/40"
                          : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${w.color}25`, color: w.color }}
                      >
                        <DynamicIcon name={w.icon} className="w-4 h-4" />
                      </div>
                      <div className="truncate min-w-0">
                        <p className="text-xs font-medium text-zinc-200 truncate">{w.name}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          {formatCurrency(w.currentBalance, w.currency, currencySymbol)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Destination Wallet for Transfer */}
          {type === "transfer" && (
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-2">Đến ví (Đích)</label>
              <div className="grid grid-cols-2 gap-2">
                {wallets.map((w) => {
                  const isSelected = destinationWalletId === w.id;
                  const isSource = selectedWalletId === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      disabled={isSource}
                      onClick={() => setDestinationWalletId(w.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                        isSource
                          ? "opacity-40 cursor-not-allowed border-zinc-800"
                          : isSelected
                          ? "border-blue-500 bg-blue-500/10 text-white ring-1 ring-blue-500/40"
                          : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${w.color}25`, color: w.color }}
                      >
                        <DynamicIcon name={w.icon} className="w-4 h-4" />
                      </div>
                      <div className="truncate min-w-0">
                        <p className="text-xs font-medium text-zinc-200 truncate">{w.name}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          {formatCurrency(w.currentBalance, w.currency, currencySymbol)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Date & Quick Shortcuts */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Ngày giao dịch
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDate(todayStr)}
                  className={`text-[11px] px-2 py-0.5 rounded font-medium transition-colors ${
                    date === todayStr ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => setDate(yesterdayStr)}
                  className={`text-[11px] px-2 py-0.5 rounded font-medium transition-colors ${
                    date === yesterdayStr ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Hôm qua
                </button>
              </div>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* 6. Note */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              Ghi chú (Tùy chọn)
            </label>
            <input
              type="text"
              placeholder="VD: Ăn trưa bún bò, tiền xăng, thanh toán hóa đơn..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-center gap-2 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons: Save & Optional Delete */}
          <div className="pt-2 pb-2 flex items-center gap-2">
            {isEditing && (
              <button
                type="button"
                disabled={isDeleting || isSubmitting}
                onClick={handleDelete}
                title="Xóa giao dịch này"
                className="px-4 py-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-400 hover:bg-rose-900/60 active:scale-95 transition-all flex items-center justify-center font-bold text-xs"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isDeleting}
              className={`flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${
                type === "expense"
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50"
                  : type === "income"
                  ? "bg-emerald-600 hover:bg-emerald-500 text-zinc-950 shadow-emerald-950/50"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/50"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang lưu...
                </>
              ) : isEditing ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  Cập nhật Giao dịch
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  Ghi {type === "expense" ? "Chi tiêu" : type === "income" ? "Thu nhập" : "Chuyển tiền"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Inline Quick Category Creator Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        defaultType={type === "transfer" ? "expense" : type}
        currencySymbol={currencySymbol}
        onSuccess={handleCategoryCreated}
      />
    </div>
  );
}
