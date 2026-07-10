/**
 * Selectable VAT rates (a line references one of these). Stored on the line as
 * basis points (1% = 100 bp). Not yet aggregated into invoice totals.
 */
export const VAT_RATES = [
  { bp: 0, label: "0%" },
  { bp: 900, label: "9% (low)" },
  { bp: 2100, label: "21% (high)" },
] as const;

export const DEFAULT_VAT_RATE_BP = 2100;

export function isAllowedVatRateBp(bp: number): boolean {
  return VAT_RATES.some((rate) => rate.bp === bp);
}

export function vatRateLabel(bp: number): string {
  return VAT_RATES.find((rate) => rate.bp === bp)?.label ?? `${bp / 100}%`;
}
