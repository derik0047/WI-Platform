import type { DiscountType } from "@/lib/db/schema";

/**
 * Pure money/quantity math for invoice lines. Everything is computed in integer
 * minor units (cents) and integer thousandths (quantity) to avoid floating-point
 * drift. Parsers assume already-validated input (see validations/invoice-line).
 */

/** "12.5" -> 1250 cents. Exact for <=2-decimal input (no float rounding). */
export function parseMoneyToCents(value: string): number {
  const [whole = "0", frac = ""] = value.trim().split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

/** 1250 -> "12.50". */
export function centsToMoneyString(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** "EUR 12.50". */
export function formatMoney(cents: number, currency: string): string {
  return `${currency} ${centsToMoneyString(cents)}`;
}

/** "2.5" -> 2500 (thousandths). Exact for <=3-decimal input. */
export function parseQuantityToMilli(value: string): number {
  const [whole = "0", frac = ""] = value.trim().split(".");
  return Number(whole) * 1000 + Number((frac + "000").slice(0, 3));
}

/** "21.5" -> 2150 basis points. Exact for <=2-decimal input. */
export function percentToBasisPoints(value: string): number {
  const [whole = "0", frac = ""] = value.trim().split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

/** 2150 -> "21.5" (trailing zeros trimmed). */
export function basisPointsToPercentString(bp: number): string {
  return trimNumericString((bp / 100).toFixed(2));
}

/** Trim trailing zeros (and a bare trailing dot) from a decimal string. */
export function trimNumericString(value: string): string {
  if (!value.includes(".")) return value;
  return value.replace(/0+$/, "").replace(/\.$/, "");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Derive a line's subtotal, discount and total from its inputs. `discountValue`
 * is basis points when `discountType` = percentage, else cents. All outputs are
 * whole cents (rounded), and total is never negative.
 */
export function computeLineAmounts(input: {
  quantityMilli: number;
  unitPriceCents: number;
  discountType: DiscountType;
  discountValue: number;
}): { subtotalCents: number; discountCents: number; totalCents: number } {
  // BigInt for the intermediate products: quantityMilli × unitPriceCents can
  // reach ~1e17 (and subtotal × bp ~1e18) — above 2^53 — so a plain double
  // multiply-before-divide would lose a cent. The final cents values are < 2^53,
  // so converting back to Number is exact. `+ half / divisor` is round-half-up
  // (matching Math.round) for these non-negative inputs.
  const subtotalCents = divRound(BigInt(input.quantityMilli) * BigInt(input.unitPriceCents), 1000n);

  let discountCents: number;
  if (input.discountType === "percentage") {
    const bp = clamp(input.discountValue, 0, 10000); // 0–100%
    discountCents = divRound(BigInt(subtotalCents) * BigInt(bp), 10000n);
  } else {
    discountCents = clamp(input.discountValue, 0, subtotalCents);
  }

  return { subtotalCents, discountCents, totalCents: subtotalCents - discountCents };
}

/** Round a non-negative BigInt numerator divided by `divisor` half-up, as a Number. */
function divRound(numerator: bigint, divisor: bigint): number {
  return Number((numerator + divisor / 2n) / divisor);
}

/** Immutably move an item from one index to another (for drag-and-drop order). */
export function move<T>(items: readonly T[], from: number, to: number): T[] {
  const result = items.slice();
  if (from < 0 || from >= result.length || to < 0 || to >= result.length) return result;
  const [moved] = result.splice(from, 1);
  if (moved === undefined) return items.slice();
  result.splice(to, 0, moved);
  return result;
}
