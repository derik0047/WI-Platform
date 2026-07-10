import { describe, expect, it } from "vitest";

import { assertSupportedCurrency, computeInvoiceTotals, type LineForTotals } from "./totals";

function line(over: Partial<LineForTotals> = {}): LineForTotals {
  return { totalCents: 0, vatRateBp: 2100, reverseCharge: false, ...over };
}

describe("computeInvoiceTotals", () => {
  it("returns zeros and an empty breakdown for no lines", () => {
    expect(computeInvoiceTotals([])).toEqual({
      subtotalCents: 0,
      vatTotalCents: 0,
      grandTotalCents: 0,
      vatBreakdown: [],
    });
  });

  it("computes VAT for a single standard-rate line", () => {
    const totals = computeInvoiceTotals([line({ totalCents: 10000, vatRateBp: 2100 })]);
    expect(totals.subtotalCents).toBe(10000);
    expect(totals.vatTotalCents).toBe(2100);
    expect(totals.grandTotalCents).toBe(12100);
    expect(totals.vatBreakdown).toEqual([
      {
        key: "rate:2100",
        label: "21%",
        rateBp: 2100,
        reverseCharge: false,
        netCents: 10000,
        vatCents: 2100,
      },
    ]);
  });

  it("groups mixed rates and orders them high→low", () => {
    const totals = computeInvoiceTotals([
      line({ totalCents: 2000, vatRateBp: 0 }),
      line({ totalCents: 10000, vatRateBp: 2100 }),
      line({ totalCents: 5000, vatRateBp: 900 }),
    ]);
    expect(totals.subtotalCents).toBe(17000);
    expect(totals.vatTotalCents).toBe(2100 + 450 + 0);
    expect(totals.grandTotalCents).toBe(19550);
    expect(totals.vatBreakdown.map((g) => g.label)).toEqual(["21%", "9%", "0%"]);
  });

  it("puts reverse charge in its own zero-VAT group, ordered last", () => {
    const totals = computeInvoiceTotals([
      line({ totalCents: 5000, reverseCharge: true }),
      line({ totalCents: 1000, vatRateBp: 2100 }),
    ]);
    expect(totals.subtotalCents).toBe(6000);
    expect(totals.vatTotalCents).toBe(210); // only the 21% line
    expect(totals.grandTotalCents).toBe(6210);
    expect(totals.vatBreakdown.map((g) => g.label)).toEqual(["21%", "Reverse charge"]);
    const rc = totals.vatBreakdown.find((g) => g.reverseCharge);
    expect(rc).toMatchObject({ rateBp: null, netCents: 5000, vatCents: 0 });
  });

  it("rounds VAT once per group, not per line (invoice method)", () => {
    // Two €0.03 lines at 21%: group net 6 → round(1.26)=1, NOT round(0.63)×2=2.
    const totals = computeInvoiceTotals([
      line({ totalCents: 3, vatRateBp: 2100 }),
      line({ totalCents: 3, vatRateBp: 2100 }),
    ]);
    expect(totals.vatBreakdown[0]?.netCents).toBe(6);
    expect(totals.vatTotalCents).toBe(1);
  });

  it("rounds half up", () => {
    // net 1000 @ 12.5% (1250 bp) = 125.0 -> 125; use a .5 boundary: net 2 @ 2500bp = 0.5 -> 1
    expect(computeInvoiceTotals([line({ totalCents: 2, vatRateBp: 2500 })]).vatTotalCents).toBe(1);
  });

  it("stays exact for very large invoices (BigInt accumulation)", () => {
    const totals = computeInvoiceTotals([
      line({ totalCents: 100_000_000_000_000, vatRateBp: 2100 }),
    ]);
    expect(totals.subtotalCents).toBe(100_000_000_000_000);
    expect(totals.vatTotalCents).toBe(21_000_000_000_000);
    expect(totals.grandTotalCents).toBe(121_000_000_000_000);
  });

  it("rejects a total beyond the safe integer range instead of corrupting it", () => {
    const huge = Array.from({ length: 100 }, () => line({ totalCents: 100_000_000_000_000 }));
    expect(() => computeInvoiceTotals(huge)).toThrow(/exceeds the supported maximum/);
  });

  it("rejects a grand total that overflows even when every group is within range", () => {
    // Two groups each individually safe, but subtotal + VAT crosses MAX_SAFE.
    const lines = [
      line({ totalCents: 4_500_000_000_000_001, vatRateBp: 0 }),
      line({ totalCents: 4_500_000_000_000_000, vatRateBp: 2100 }),
    ];
    expect(() => computeInvoiceTotals(lines)).toThrow(/exceeds the supported maximum/);
  });
});

describe("assertSupportedCurrency", () => {
  it("accepts a supported currency and rejects others", () => {
    expect(() => assertSupportedCurrency("EUR")).not.toThrow();
    expect(() => assertSupportedCurrency("XYZ")).toThrow(/Unsupported invoice currency/);
  });
});
