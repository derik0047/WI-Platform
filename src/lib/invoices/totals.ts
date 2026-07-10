import { CURRENCIES } from "@/config/currencies";
import { ValidationError } from "@/lib/errors";

/**
 * Pure invoice VAT & totals engine. Aggregates line net amounts (ex-VAT,
 * post-discount) into a subtotal, groups them by VAT treatment, and computes VAT
 * once per group (the standard invoice rounding method — sum the net first, then
 * apply the rate and round, which avoids per-line rounding drift). All arithmetic
 * is integer minor units; accumulation uses BigInt so a large invoice can never
 * lose precision, and any total beyond the safe integer range is rejected rather
 * than silently corrupted.
 */

/** The subset of a line the engine needs. `totalCents` is the net taxable base. */
export type LineForTotals = {
  totalCents: number;
  vatRateBp: number;
  reverseCharge: boolean;
};

/** One VAT group in the summary (a rate bucket, or reverse charge). */
export type VatGroup = {
  key: string;
  label: string;
  rateBp: number | null; // null for reverse charge
  reverseCharge: boolean;
  netCents: number;
  vatCents: number;
};

export type InvoiceTotals = {
  subtotalCents: number;
  vatTotalCents: number;
  grandTotalCents: number;
  vatBreakdown: VatGroup[];
};

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

/** Convert an accumulated BigInt to a Number, or reject if out of safe range. */
function toSafeNumber(value: bigint): number {
  if (value > MAX_SAFE || value < -MAX_SAFE) {
    throw new ValidationError("Invoice total exceeds the supported maximum");
  }
  return Number(value);
}

/** VAT for a group: round(net × rate / 10000) half-up, integer-exact via BigInt. */
function vatForGroup(netCents: bigint, rateBp: number): bigint {
  return (netCents * BigInt(rateBp) + 5000n) / 10000n;
}

function groupLabel(reverseCharge: boolean, rateBp: number | null): string {
  return reverseCharge ? "Reverse charge" : `${(rateBp ?? 0) / 100}%`;
}

export function computeInvoiceTotals(lines: LineForTotals[]): InvoiceTotals {
  type Acc = { rateBp: number | null; reverseCharge: boolean; net: bigint };
  const groups = new Map<string, Acc>();

  for (const line of lines) {
    const key = line.reverseCharge ? "reverse_charge" : `rate:${line.vatRateBp}`;
    const existing = groups.get(key);
    if (existing) {
      existing.net += BigInt(line.totalCents);
    } else {
      groups.set(key, {
        rateBp: line.reverseCharge ? null : line.vatRateBp,
        reverseCharge: line.reverseCharge,
        net: BigInt(line.totalCents),
      });
    }
  }

  let subtotal = 0n;
  let vatTotal = 0n;
  const breakdown: VatGroup[] = [];

  for (const [key, acc] of groups) {
    const vat = acc.reverseCharge ? 0n : vatForGroup(acc.net, acc.rateBp ?? 0);
    subtotal += acc.net;
    vatTotal += vat;
    breakdown.push({
      key,
      label: groupLabel(acc.reverseCharge, acc.rateBp),
      rateBp: acc.rateBp,
      reverseCharge: acc.reverseCharge,
      netCents: toSafeNumber(acc.net),
      vatCents: toSafeNumber(vat),
    });
  }

  // Standard rates high→low, reverse charge last, for a stable summary order.
  breakdown.sort((a, b) => {
    if (a.reverseCharge !== b.reverseCharge) return a.reverseCharge ? 1 : -1;
    return (b.rateBp ?? 0) - (a.rateBp ?? 0);
  });

  return {
    subtotalCents: toSafeNumber(subtotal),
    vatTotalCents: toSafeNumber(vatTotal),
    grandTotalCents: toSafeNumber(subtotal + vatTotal),
    vatBreakdown: breakdown,
  };
}

/**
 * Validate the invoice currency is supported. Lines carry no currency of their
 * own, so an invoice is single-currency by construction; this guards against a
 * corrupted/unsupported currency reaching the totals.
 */
export function assertSupportedCurrency(currency: string): void {
  if (!(CURRENCIES as readonly string[]).includes(currency)) {
    throw new ValidationError(`Unsupported invoice currency: ${currency}`);
  }
}
