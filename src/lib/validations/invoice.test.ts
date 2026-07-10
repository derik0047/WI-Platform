import { describe, expect, it } from "vitest";

import { invoiceFormSchema, invoiceQuerySchema } from "./invoice";

function form(overrides: Record<string, unknown> = {}) {
  return {
    customerId: "11111111-1111-1111-1111-111111111111",
    issueDate: "2026-01-10",
    dueDate: "2026-02-10",
    currency: "EUR",
    notes: "",
    ...overrides,
  };
}

describe("invoiceFormSchema", () => {
  it("accepts a valid invoice", () => {
    expect(invoiceFormSchema.safeParse(form()).success).toBe(true);
  });

  it("requires a customer (uuid)", () => {
    expect(invoiceFormSchema.safeParse(form({ customerId: "" })).success).toBe(false);
  });

  it("rejects a malformed date", () => {
    expect(invoiceFormSchema.safeParse(form({ issueDate: "10-01-2026" })).success).toBe(false);
  });

  it("rejects an impossible calendar date", () => {
    expect(invoiceFormSchema.safeParse(form({ issueDate: "2026-02-30" })).success).toBe(false);
    expect(invoiceFormSchema.safeParse(form({ issueDate: "2026-13-01" })).success).toBe(false);
    expect(invoiceFormSchema.safeParse(form({ issueDate: "2026-00-10" })).success).toBe(false);
  });

  it("rejects a due date before the issue date", () => {
    const result = invoiceFormSchema.safeParse(
      form({ issueDate: "2026-02-10", dueDate: "2026-01-10" }),
    );
    expect(result.success).toBe(false);
  });

  it("allows the due date to equal the issue date", () => {
    expect(
      invoiceFormSchema.safeParse(form({ issueDate: "2026-01-10", dueDate: "2026-01-10" })).success,
    ).toBe(true);
  });

  it("rejects an unsupported currency", () => {
    expect(invoiceFormSchema.safeParse(form({ currency: "XYZ" })).success).toBe(false);
  });
});

describe("invoiceQuerySchema", () => {
  it("falls back to safe defaults for missing or garbage params", () => {
    expect(invoiceQuerySchema.parse({})).toEqual({
      q: "",
      status: "all",
      customerId: "",
      page: 1,
    });
    expect(
      invoiceQuerySchema.parse({ status: "nope", customerId: "not-a-uuid", page: "x" }),
    ).toEqual({
      q: "",
      status: "all",
      customerId: "",
      page: 1,
    });
  });

  it("parses provided values", () => {
    const uuid = "22222222-2222-2222-2222-222222222222";
    expect(
      invoiceQuerySchema.parse({ q: "INV-2026", status: "sent", customerId: uuid, page: "2" }),
    ).toEqual({ q: "INV-2026", status: "sent", customerId: uuid, page: 2 });
  });
});
