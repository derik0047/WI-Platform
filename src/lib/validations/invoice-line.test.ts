import { describe, expect, it } from "vitest";

import { emptyLineForm, normalizeLineInput } from "@/lib/invoices/line-form";

import { invoiceLineFormSchema } from "./invoice-line";

function line(overrides: Record<string, unknown> = {}) {
  return { ...emptyLineForm(), description: "Consulting", unitPrice: "100", ...overrides };
}

describe("invoiceLineFormSchema", () => {
  it("accepts a valid line and the empty template (with a description)", () => {
    expect(invoiceLineFormSchema.safeParse(line()).success).toBe(true);
  });

  it("requires a description", () => {
    expect(invoiceLineFormSchema.safeParse(line({ description: "" })).success).toBe(false);
  });

  it("rejects a non-positive or malformed quantity", () => {
    expect(invoiceLineFormSchema.safeParse(line({ quantity: "0" })).success).toBe(false);
    expect(invoiceLineFormSchema.safeParse(line({ quantity: "1.2345" })).success).toBe(false);
    expect(invoiceLineFormSchema.safeParse(line({ quantity: "-3" })).success).toBe(false);
  });

  it("rejects a malformed unit price", () => {
    expect(invoiceLineFormSchema.safeParse(line({ unitPrice: "12.999" })).success).toBe(false);
    expect(invoiceLineFormSchema.safeParse(line({ unitPrice: "abc" })).success).toBe(false);
  });

  it("rejects a percentage discount over 100%", () => {
    expect(
      invoiceLineFormSchema.safeParse(line({ discountType: "percentage", discountValue: "150" }))
        .success,
    ).toBe(false);
    expect(
      invoiceLineFormSchema.safeParse(line({ discountType: "percentage", discountValue: "100" }))
        .success,
    ).toBe(true);
  });

  it("allows a large fixed discount but not one beyond the cap", () => {
    expect(
      invoiceLineFormSchema.safeParse(line({ discountType: "fixed", discountValue: "500" }))
        .success,
    ).toBe(true);
    expect(
      invoiceLineFormSchema.safeParse(line({ discountType: "fixed", discountValue: "2000000" }))
        .success,
    ).toBe(false);
  });

  it("only accepts an allowed VAT rate", () => {
    expect(invoiceLineFormSchema.safeParse(line({ vatRateBp: "2100" })).success).toBe(true);
    expect(invoiceLineFormSchema.safeParse(line({ vatRateBp: "1234" })).success).toBe(false);
  });
});

describe("normalizeLineInput", () => {
  it("derives subtotal and total in cents", () => {
    const result = normalizeLineInput(
      line({ quantity: "2", unitPrice: "100", discountType: "percentage", discountValue: "10" }),
    );
    expect(result.unitPriceCents).toBe(10000);
    expect(result.subtotalCents).toBe(20000);
    expect(result.totalCents).toBe(18000); // 10% off €200
    expect(result.discountValue).toBe(1000); // basis points
    expect(result.vatRateBp).toBe(2100);
  });

  it("stores a fixed discount as cents", () => {
    const result = normalizeLineInput(line({ discountType: "fixed", discountValue: "25.50" }));
    expect(result.discountValue).toBe(2550);
  });

  it("normalises an empty notes to null and trims the quantity", () => {
    const result = normalizeLineInput(line({ quantity: "2.500", notes: "  " }));
    expect(result.quantity).toBe("2.5");
    expect(result.notes).toBeNull();
  });
});
