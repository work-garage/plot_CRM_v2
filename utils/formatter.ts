import { format, parseISO } from "date-fns";

/**
 * Format amount as Indian Rupee: ₹1,00,000
 */
export function formatCurrency(amount: number): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n) || Number.isNaN(n)) return "₹0";

  // Avoid UI overflow: switch to compact Cr/Lakh/K format for big numbers.
  const abs = Math.abs(n);
  if (abs >= 100000) {
    return formatCurrencyShort(n);
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Short Indian currency formatting:
 * 950 -> ₹950
 * 12_500 -> ₹12.5K
 * 4_50_000 -> ₹4.5L
 * 2_75_00_000 -> ₹2.75Cr
 */
export function formatCurrencyShort(amount: number, opts?: { digits?: number }): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return "₹0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const digits = Math.min(2, Math.max(0, opts?.digits ?? 2));

  const fmt = (v: number, suffix: string) =>
    `${sign}₹${v.toFixed(digits).replace(/\.?0+$/, "")}${suffix}`;

  if (abs >= 1e7) return fmt(abs / 1e7, "Cr");
  if (abs >= 1e5) return fmt(abs / 1e5, "L");
  if (abs >= 1e3) return fmt(abs / 1e3, "K");
  // small values: no decimals
  return `${sign}₹${Math.round(abs).toLocaleString("en-IN")}`;
}

/**
 * Format date string to "14 Mar 2026"
 */
export function formatDate(date: string | Date): string {
  if (!date) return "—";
  const parsed = typeof date === "string" ? parseISO(date) : date;
  return format(parsed, "dd MMM yyyy");
}

/**
 * Format phone number: "+91 98765 43210"
 */
/**
 * Format minutes as "HH:MM" (e.g. 54 → "00:54") to match Excel duration / OT display.
 */
export function formatMinutesAsClock(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(Number(minutes))) return "—";
  const n = Math.max(0, Math.round(Number(minutes)));
  const h = Math.floor(n / 60);
  const m = n % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatPhone(phone: string): string {
  if (!phone) return "—";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}