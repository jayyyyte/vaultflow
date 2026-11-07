"use client";

import React, { useState, useEffect } from "react";
import { parseBankNotification, type ParsedTransaction } from "@/lib/sms-parser";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createTransaction } from "@/actions/transactions";
import { useToast } from "./toast-provider";
import type { WalletWithBalance } from "@/lib/types";
import type { Category } from "@/db/schema";
import {
  X,
  Sparkles,
  ClipboardPaste,
  RotateCcw,
  Check,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Tag,
  Wallet,
  Calendar,
  FileText,
  Loader2,
  HelpCircle,
} from "lucide-react";

interface SmartPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletWithBalance[];
  categories: Category[];
  currency?: string;
  currencySymbol?: string;
  onApply: (parsed: ParsedTransaction) => void;
  onSuccess?: () => void;
}

const SAMPLE_TEMPLATES = [
  {
    label: "VCB Chi tiêu",
    text: "SD TK 0123456789 -500,000VND vao 14:30 07/11/2026. So du: 15,200,000VND. Ref MBVCB.1234. ND: Highlands Coffee thanh toan",
  },
  {
    label: "TCB Nhận lương",
    text: "GD: +18,500,000VND vao 05/11/26 08:30. So du: 25,400,000VND. ND: Cong ty ABC tra tien luong thang 10",
  },
  {
    label: "MoMo Siêu thị",
    text: "MoMo: Ban da thanh toan thanh cong 165.000d cho WinMart Cong Hoa",
  },
];

export function SmartPasteModal({
  isOpen,
  onClose,
  wallets,
  categories,
  currency = "VND",
  currencySymbol = "₫",
  onApply,
  onSuccess,
}: SmartPasteModalProps) {
  const { toast } = useToast();
  const [inputText, setInputText] = useState("");
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null);
  const [isQuickSaving, setIsQuickSaving] = useState(false);

  useEffect(() => {
    if (inputText.trim()) {
      const result = parseBankNotification(inputText, wallets, categories);
      setParsed(result);
    } else {
      setParsed(null);
    }
  }, [inputText, wallets, categories]);

  if (!isOpen) return null;

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputText(text);
          toast.success("Đã dán nội dung từ clipboard!");
        } else {
          toast.error("Clipboard đang trống");
        }
      } else {
        toast.error("Trình duyệt không cho phép đọc clipboard tự động, vui lòng dán thủ công");
      }
    } catch {
      toast.error("Vui lòng cấp quyền truy cập clipboard hoặc dán thủ công vào ô nhập");
    }
  };

  const handleClear = () => {
    setInputText("");
    setParsed(null);
  };

  const handleApplyToForm = () => {
    if (!parsed || parsed.amount <= 0) {
      toast.error("Chưa phát hiện được số tiền giao dịch hợp lệ");
      return;
    }
    onApply(parsed);
    onClose();
  };

  const handleQuickSave = async () => {
    if (!parsed || parsed.amount <= 0) {
      toast.error("Chưa phát hiện được số tiền giao dịch hợp lệ");
      return;
    }

    if (!parsed.suggestedWalletId) {
      toast.error("Vui lòng chọn ví để lưu");
      return;
    }

    setIsQuickSaving(true);
    try {
      const res = await createTransaction({
        amount: parsed.amount,
        type: parsed.type,
        walletId: parsed.suggestedWalletId,
        categoryId: parsed.suggestedCategoryId,
        date: parsed.date,
        note: parsed.note,
      });

      if (res.success) {
        toast.success(
          `Đã ghi nhanh: ${parsed.type === "income" ? "+" : "-"}${formatCurrency(
            parsed.amount,
            currency,
            currencySymbol
          )} (${parsed.note})`
        );
        onSuccess?.();
        onClose();
      } else {
        toast.error(res.error || "Không thể ghi nhận giao dịch");
      }
    } finally {
      setIsQuickSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[#121215] border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden animate-slideUp">
        {/* Mobile Drag Indicator Handle */}
        <div className="pt-2 sm:hidden flex justify-center">
          <div className="w-12 h-1 bg-zinc-700/80 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-white block">
                Smart Input / Bóc tách SMS
              </span>
              <span className="text-[10px] text-zinc-400">
                Tự động trích xuất số tiền, ví, danh mục & ghi chú
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-zinc-800/70 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-4">
          {/* Quick Paste Toolbar */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-950"
            >
              <ClipboardPaste className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Dán từ Clipboard</span>
            </button>

            {inputText && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Xóa nội dung</span>
              </button>
            )}
          </div>

          {/* Text Input Area */}
          <div className="relative">
            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Dán tin nhắn SMS ngân hàng, thông báo chuyển tiền hoặc nội dung giao dịch tại đây..."
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none font-mono"
            />
          </div>

          {/* Quick Sample Chips */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase text-zinc-500 tracking-wider flex items-center gap-1">
              <HelpCircle className="w-3 h-3" /> Thử mẫu tin nhắn nhanh:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_TEMPLATES.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => setInputText(sample.text)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-800 text-[11px] text-zinc-300 transition-colors"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {/* Parsed Result Card */}
          {parsed && parsed.amount > 0 ? (
            <div className="bg-zinc-900/90 border border-emerald-500/30 rounded-2xl p-4 space-y-3 shadow-lg animate-fadeIn">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1 ${
                      parsed.type === "expense"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : parsed.type === "income"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                    }`}
                  >
                    {parsed.type === "expense" ? (
                      <TrendingDown className="w-3 h-3" />
                    ) : (
                      <TrendingUp className="w-3 h-3" />
                    )}
                    {parsed.type === "expense"
                      ? "Chi tiêu"
                      : parsed.type === "income"
                      ? "Thu nhập"
                      : "Chuyển tiền"}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Độ chính xác: {(parsed.confidence * 100).toFixed(0)}%
                  </span>
                </div>

                <span className="text-xl font-black font-mono text-white">
                  {parsed.type === "income" ? "+" : "-"}
                  {formatCurrency(parsed.amount, currency, currencySymbol)}
                </span>
              </div>

              {/* Extracted Details Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-zinc-950/50 border border-zinc-800/60 space-y-0.5">
                  <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-zinc-400" /> Danh mục nhận diện
                  </span>
                  <span className="font-semibold text-zinc-200 block truncate">
                    {parsed.suggestedCategoryName || "Chưa phân loại"}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-zinc-950/50 border border-zinc-800/60 space-y-0.5">
                  <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-zinc-400" /> Ví / Tài khoản
                  </span>
                  <span className="font-semibold text-zinc-200 block truncate">
                    {parsed.suggestedWalletName || "Mặc định"}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-zinc-950/50 border border-zinc-800/60 space-y-0.5">
                  <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-zinc-400" /> Ngày giao dịch
                  </span>
                  <span className="font-semibold text-zinc-200 block font-mono">
                    {formatDate(parsed.date)}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-zinc-950/50 border border-zinc-800/60 space-y-0.5">
                  <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-zinc-400" /> Nội dung / Ghi chú
                  </span>
                  <span className="font-semibold text-zinc-200 block truncate" title={parsed.note}>
                    {parsed.note || "Không có ghi chú"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleApplyToForm}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all border border-zinc-700"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Áp dụng vào Form</span>
                </button>

                <button
                  type="button"
                  disabled={isQuickSaving}
                  onClick={handleQuickSave}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-xs font-bold text-zinc-950 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-950 disabled:opacity-40"
                >
                  {isQuickSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                  <span>Ghi nhanh ngay</span>
                </button>
              </div>
            </div>
          ) : inputText.trim() ? (
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center text-xs text-zinc-400">
              Chưa nhận diện được số tiền trong văn bản. Hãy đảm bảo tin nhắn chứa số tiền (ví dụ: -50.000VND hoặc 500k).
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
