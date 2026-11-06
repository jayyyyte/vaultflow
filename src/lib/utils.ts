import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Currency formatter supporting VND, JPY (0 decimals) and international currencies.
 * Properly positions currency symbols (e.g. 150.000 ₫ vs $150.00).
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  symbol: string = "$"
): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const curUpper = (currency || "").toUpperCase();
  const sym = symbol || "$";

  // Check if currency is zero-decimal (VND, JPY, KRW, etc.)
  const isZeroDecimal =
    curUpper === "VND" ||
    curUpper === "JPY" ||
    curUpper === "KRW" ||
    sym === "₫" ||
    sym === "đ" ||
    sym === "¥" ||
    sym === "₩";

  if (curUpper === "VND" || sym === "₫" || sym === "đ") {
    // Format Vietnamese Dong with dot as thousand separator, no decimals, suffix ₫
    const formatted = new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: 0,
    }).format(absAmount);
    return `${isNegative ? "-" : ""}${formatted} ₫`;
  }

  if (isZeroDecimal) {
    const formatted = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(absAmount);
    return `${isNegative ? "-" : ""}${sym}${formatted}`;
  }

  // Standard 2 decimal currencies (USD, EUR, GBP, etc.)
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);

  // Symbol placement: EUR / VND typically placed after, USD / GBP before
  if (curUpper === "EUR" || sym === "€") {
    return `${isNegative ? "-" : ""}${formatted} €`;
  }

  return `${isNegative ? "-" : ""}${sym}${formatted}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    const parts = dateStr.split("-");
    const shortDayMonth = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;

    if (dateStr === today) return `Hôm nay (${shortDayMonth})`;
    if (dateStr === yesterday) return `Hôm qua (${shortDayMonth})`;

    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const currentYear = new Date().getFullYear();
      if (year === currentYear) {
        return `${parts[2]}/${parts[1]}`;
      }
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function getMonthYearLabel(yearMonthStr: string): string {
  // Format: "YYYY-MM"
  try {
    const [year, month] = yearMonthStr.split("-").map(Number);
    return `Tháng ${month}/${year}`;
  } catch {
    return yearMonthStr;
  }
}

export function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
