import { describe, expect, it } from "vitest";

import {
  basisPointsToPercentString,
  centsToMoneyString,
  computeLineAmounts,
  formatMoney,
  move,
  parseMoneyToCents,
  parseQuantityToMilli,
  percentToBasisPoints,
  trimNumericString,
} from "./line-math";

describe("parseMoneyToCents", () => {
  it("parses exactly regardless of decimals", () => {
    expect(parseMoneyToCents("12")).toBe(1200);
    expect(parseMoneyToCents("12.5")).toBe(1250);
    expect(parseMoneyToCents("12.05")).toBe(1205);
    expect(parseMoneyToCents("0.01")).toBe(1);
  });

  it("round-trips with centsToMoneyString", () => {
    expect(centsToMoneyString(1250)).toBe("12.50");
    expect(centsToMoneyString(parseMoneyToCents("999.99"))).toBe("999.99");
  });
});

describe("parseQuantityToMilli", () => {
  it("parses up to three decimals exactly", () => {
    expect(parseQuantityToMilli("2.5")).toBe(2500);
    expect(parseQuantityToMilli("1")).toBe(1000);
    expect(parseQuantityToMilli("2.333")).toBe(2333);
  });
});

describe("percent <-> basis points", () => {
  it("parses percentages to basis points", () => {
    expect(percentToBasisPoints("21")).toBe(2100);
    expect(percentToBasisPoints("21.5")).toBe(2150);
    expect(percentToBasisPoints("0")).toBe(0);
  });

  it("formats basis points back, trimming zeros", () => {
    expect(basisPointsToPercentString(2100)).toBe("21");
    expect(basisPointsToPercentString(2150)).toBe("21.5");
  });
});

describe("trimNumericString", () => {
  it("strips trailing zeros and a bare dot", () => {
    expect(trimNumericString("2.500")).toBe("2.5");
    expect(trimNumericString("1.000")).toBe("1");
    expect(trimNumericString("100")).toBe("100");
    expect(trimNumericString("2.333")).toBe("2.333");
  });
});

describe("computeLineAmounts", () => {
  it("multiplies quantity by unit price for the subtotal", () => {
    // 2.5 × €12.00 = €30.00
    const result = computeLineAmounts({
      quantityMilli: 2500,
      unitPriceCents: 1200,
      discountType: "percentage",
      discountValue: 0,
    });
    expect(result.subtotalCents).toBe(3000);
    expect(result.totalCents).toBe(3000);
  });

  it("applies a percentage discount (basis points)", () => {
    const result = computeLineAmounts({
      quantityMilli: 1000,
      unitPriceCents: 10000,
      discountType: "percentage",
      discountValue: 1000, // 10%
    });
    expect(result.subtotalCents).toBe(10000);
    expect(result.discountCents).toBe(1000);
    expect(result.totalCents).toBe(9000);
  });

  it("applies and clamps a fixed discount to the subtotal", () => {
    const within = computeLineAmounts({
      quantityMilli: 1000,
      unitPriceCents: 5000,
      discountType: "fixed",
      discountValue: 1500,
    });
    expect(within.totalCents).toBe(3500);

    const over = computeLineAmounts({
      quantityMilli: 1000,
      unitPriceCents: 5000,
      discountType: "fixed",
      discountValue: 9999,
    });
    expect(over.discountCents).toBe(5000);
    expect(over.totalCents).toBe(0);
  });

  it("rounds fractional cents to the nearest cent", () => {
    // 1.333 × €10.00 = €13.33
    const result = computeLineAmounts({
      quantityMilli: 1333,
      unitPriceCents: 1000,
      discountType: "percentage",
      discountValue: 0,
    });
    expect(result.subtotalCents).toBe(1333);
  });

  it("clamps a percentage discount above 100%", () => {
    const result = computeLineAmounts({
      quantityMilli: 1000,
      unitPriceCents: 1000,
      discountType: "percentage",
      discountValue: 20000, // 200% -> clamped to 100%
    });
    expect(result.totalCents).toBe(0);
  });

  it("stays cent-exact for large values (no 2^53 intermediate overflow)", () => {
    // quantity 983959.5 × €694299.47 — product ~6.8e16 exceeds 2^53.
    const big = computeLineAmounts({
      quantityMilli: 983959500,
      unitPriceCents: 69429947,
      discountType: "fixed",
      discountValue: 0,
    });
    expect(big.subtotalCents).toBe(68316255935147);

    // Large subtotal × a percentage discount — product ~2.7e16 exceeds 2^53.
    const pct = computeLineAmounts({
      quantityMilli: 193443000,
      unitPriceCents: 21739871,
      discountType: "percentage",
      discountValue: 6483, // 64.83%
    });
    expect(pct.subtotalCents).toBe(4205425865853);
    expect(pct.totalCents).toBe(1479048277021);
  });
});

describe("formatMoney", () => {
  it("prefixes the currency code", () => {
    expect(formatMoney(1250, "EUR")).toBe("EUR 12.50");
  });
});

describe("move", () => {
  it("moves an item to a new index immutably", () => {
    const list = ["a", "b", "c", "d"];
    expect(move(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(move(list, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(list).toEqual(["a", "b", "c", "d"]); // original untouched
  });

  it("returns a copy for out-of-range indices", () => {
    expect(move(["a", "b"], 5, 0)).toEqual(["a", "b"]);
  });
});
