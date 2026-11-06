"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createCategory, updateCategory, deleteCategory } from "@/actions/categories";
import { DynamicIcon } from "./icon-helper";
import { X, Check, Trash2, Loader2, Plus, TrendingDown, TrendingUp } from "lucide-react";
import type { Category } from "@/db/schema";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: Category | null;
  defaultType?: "expense" | "income";
  currencySymbol?: string;
  onSuccess?: (savedCategory: Category) => void;
  onDeleteSuccess?: () => void;
}

const PRESET_COLORS = [
  "#f97316", // Orange
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#eab308", // Yellow
  "#ef4444", // Red
  "#06b6d4", // Cyan
  "#6366f1", // Indigo
  "#64748b", // Slate
];

const PRESET_ICONS = [
  "Coffee",
  "ShoppingCart",
  "ShoppingBag",
  "Home",
  "Zap",
  "Car",
  "Film",
  "HeartPulse",
  "Plane",
  "Gift",
  "Briefcase",
  "Laptop",
  "Banknote",
  "Wallet",
  "Tag",
  "CreditCard",
];

export function CategoryModal({
  isOpen,
  onClose,
  categoryToEdit,
  defaultType = "expense",
  currencySymbol = "₫",
  onSuccess,
  onDeleteSuccess,
}: CategoryModalProps) {
  const router = useRouter();

  const [name, setName] = useState(categoryToEdit?.name || "");
  const [type, setType] = useState<"expense" | "income">(
    categoryToEdit?.type || defaultType
  );
  const [icon, setIcon] = useState(categoryToEdit?.icon || "Tag");
  const [color, setColor] = useState(
    categoryToEdit?.color || (defaultType === "income" ? "#10b981" : "#f97316")
  );
  const [monthlyBudget, setMonthlyBudget] = useState<string>(
    categoryToEdit?.monthlyBudget ? String(categoryToEdit.monthlyBudget) : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (categoryToEdit) {
        setName(categoryToEdit.name);
        setType(categoryToEdit.type);
        setIcon(categoryToEdit.icon || "Tag");
        setColor(categoryToEdit.color || "#f97316");
        setMonthlyBudget(
          categoryToEdit.monthlyBudget ? String(categoryToEdit.monthlyBudget) : ""
        );
      } else {
        setName("");
        setType(defaultType);
        setIcon(defaultType === "income" ? "Briefcase" : "Coffee");
        setColor(defaultType === "income" ? "#10b981" : "#f97316");
        setMonthlyBudget("");
      }
    }
  }, [isOpen, categoryToEdit, defaultType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Vui lòng nhập tên danh mục");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const numericBudget = parseFloat(monthlyBudget) || 0;

    try {
      if (categoryToEdit) {
        const res = await updateCategory(categoryToEdit.id, {
          name: trimmedName,
          type,
          icon,
          color,
          monthlyBudget: type === "expense" ? numericBudget : 0,
        });

        if (res.success) {
          const updated: Category = {
            ...categoryToEdit,
            name: trimmedName,
            type,
            icon,
            color,
            monthlyBudget: type === "expense" ? numericBudget : 0,
          };
          onSuccess?.(updated);
          router.refresh();
          onClose();
        } else {
          setErrorMessage(res.error || "Không thể cập nhật danh mục");
        }
      } else {
        const res = await createCategory({
          name: trimmedName,
          type,
          icon,
          color,
          monthlyBudget: type === "expense" ? numericBudget : 0,
        });

        if (res.success && res.id) {
          const newCat: Category = {
            id: res.id,
            name: trimmedName,
            type,
            icon,
            color,
            monthlyBudget: type === "expense" ? numericBudget : 0,
            createdAt: Date.now(),
          };
          onSuccess?.(newCat);
          router.refresh();
          onClose();
        } else {
          setErrorMessage(res.error || "Không thể tạo danh mục");
        }
      }
    } catch {
      setErrorMessage("Đã xảy ra lỗi không mong muốn");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToEdit) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa danh mục "${categoryToEdit.name}" không?`)) return;

    setIsDeleting(true);
    try {
      const res = await deleteCategory(categoryToEdit.id);
      if (res.success) {
        onDeleteSuccess?.();
        router.refresh();
        onClose();
      } else {
        setErrorMessage(res.error || "Không thể xóa danh mục");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#121215] border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden animate-slideUp">
        {/* Mobile Drag Indicator Handle */}
        <div className="pt-2 sm:hidden flex justify-center">
          <div className="w-12 h-1 bg-zinc-700/80 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${color}25`, color }}
            >
              <DynamicIcon name={icon} className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white">
              {categoryToEdit ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800/70 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Type Segmented Switch */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Loại danh mục
            </label>
            <div className="grid grid-cols-2 gap-2 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setType("expense");
                  if (!categoryToEdit) setColor("#f97316");
                }}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  type === "expense"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                Chi tiêu
              </button>
              <button
                type="button"
                onClick={() => {
                  setType("income");
                  if (!categoryToEdit) setColor("#10b981");
                }}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  type === "income"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Thu nhập
              </button>
            </div>
          </div>

          {/* Category Name */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Tên danh mục <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Ăn uống, Mua sắm, Tiền lương..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 focus:outline-none text-sm text-white placeholder-zinc-600 transition-colors"
            />
          </div>

          {/* Monthly Budget (for Expense) */}
          {type === "expense" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Ngân sách tháng ({currencySymbol})
                </label>
                <span className="text-[11px] text-zinc-500">Tùy chọn</span>
              </div>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                placeholder="0 (không giới hạn)"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 focus:outline-none text-sm text-white placeholder-zinc-600 font-mono transition-colors"
              />
            </div>
          )}

          {/* Color Picker */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Màu sắc</label>
            <div className="grid grid-cols-5 gap-2.5">
              {PRESET_COLORS.map((c) => {
                const isSelected = color.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="h-9 rounded-xl flex items-center justify-center transition-all border border-zinc-700/60 active:scale-95"
                    style={{ backgroundColor: c }}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white stroke-[3] drop-shadow" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Icon Picker */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Biểu tượng</label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 max-h-36 overflow-y-auto p-1 bg-zinc-900/40 rounded-xl border border-zinc-800/60">
              {PRESET_ICONS.map((iconName) => {
                const isSelected = icon === iconName;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    className={`h-11 rounded-xl flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-zinc-800 border-2 border-emerald-500 text-emerald-400 shadow-sm"
                        : "bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                    }`}
                  >
                    <DynamicIcon name={iconName} className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-2">
            {categoryToEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className="h-11 px-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center transition-colors disabled:opacity-50"
                title="Xóa danh mục"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isDeleting}
              className="flex-1 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{categoryToEdit ? "Lưu thay đổi" : "Tạo danh mục"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
