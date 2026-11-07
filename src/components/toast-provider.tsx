"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

interface ToastContextValue {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const toastIdCounter = useRef(0);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = `toast_${Date.now()}_${++toastIdCounter.current}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: useCallback((msg: string) => addToast(msg, "success"), [addToast]),
    error: useCallback((msg: string) => addToast(msg, "error"), [addToast]),
    info: useCallback((msg: string) => addToast(msg, "info"), [addToast]),
  };

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog({
        isOpen: true,
        options,
        resolve: (result: boolean) => {
          setConfirmDialog(null);
          resolve(result);
        },
      });
    });
  }, []);

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Floating Toast Container */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none px-4 max-w-sm w-full safe-top">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto w-full px-4 py-3 rounded-2xl border shadow-xl flex items-center justify-between gap-3 animate-slideDown backdrop-blur-md transition-all ${
              t.type === "success"
                ? "bg-zinc-900/95 border-emerald-500/40 text-zinc-100 shadow-emerald-950/30"
                : t.type === "error"
                ? "bg-zinc-900/95 border-rose-500/40 text-zinc-100 shadow-rose-950/30"
                : "bg-zinc-900/95 border-zinc-700/80 text-zinc-100 shadow-black/40"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {t.type === "success" && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              )}
              {t.type === "error" && (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              {t.type === "info" && (
                <Info className="w-5 h-5 text-blue-400 shrink-0" />
              )}
              <span className="text-xs font-semibold truncate leading-tight">
                {t.message}
              </span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Modern Confirmation Modal replacing window.confirm */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#121215] border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmDialog.options.isDestructive
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                    : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                }`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  {confirmDialog.options.title || "Xác nhận hành động"}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {confirmDialog.options.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => confirmDialog.resolve(false)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-xs font-bold text-zinc-300 hover:text-white transition-all"
              >
                {confirmDialog.options.cancelText || "Hủy bỏ"}
              </button>
              <button
                type="button"
                onClick={() => confirmDialog.resolve(true)}
                className={`min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-xs active:scale-95 transition-all shadow-md ${
                  confirmDialog.options.isDestructive
                    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950"
                    : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-950"
                }`}
              >
                {confirmDialog.options.confirmText || "Đồng ý"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
