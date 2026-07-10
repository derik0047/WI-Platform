import { centsToMoneyString } from "@/lib/invoices/line-math";

/** Grouped-thousands amount without a currency, e.g. "1,234.56" (for table cells). */
export function formatPdfNumber(cents: number): string {
  const [intPart = "0", frac = "00"] = centsToMoneyString(cents).split(".");
  const negative = intPart.startsWith("-");
  const digits = negative ? intPart.slice(1) : intPart;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${grouped}.${frac}`;
}

/** Amount for the PDF: currency code + grouped thousands, e.g. "EUR 1,234.56". */
export function formatPdfAmount(cents: number, currency: string): string {
  return `${currency} ${formatPdfNumber(cents)}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** ISO date "2026-01-10" → "10 Jan 2026" (deterministic, no locale/timezone). */
export function formatPdfDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  const label = MONTHS[Number(month) - 1] ?? month;
  return `${Number(day)} ${label} ${year}`;
}
