import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Currency with cents. Use on invoices, estimates, and expense subtotals
 * where rounding matters; the integer-only formatCurrency() is for
 * dashboard stats / pipeline aggregates.
 */
export function formatMoney(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Pull a number out of unknown FormData input. Coerces empty strings,
 * "1,234.50"-formatted strings, and missing values to 0 so server actions
 * can sum line items without per-field guards.
 */
export function parseNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const str = String(value).replace(/,/g, "").trim();
  if (str === "") return 0;
  const n = Number(str);
  return Number.isFinite(n) ? n : 0;
}

/** Round to 2 decimal places — money rounding for line-item math. */
export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
