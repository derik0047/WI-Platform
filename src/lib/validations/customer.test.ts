import { describe, expect, it } from "vitest";

import { customerFormSchema, customerQuerySchema } from "./customer";

function base(overrides: Record<string, unknown> = {}) {
  return {
    companyName: "Acme",
    contactName: "",
    email: "",
    phone: "",
    addressLine: "",
    postalCode: "",
    city: "",
    country: "Netherlands",
    kvkNumber: "",
    vatNumber: "",
    notes: "",
    status: "active",
    ...overrides,
  };
}

describe("customerFormSchema", () => {
  it("accepts a minimal valid customer with empty optionals", () => {
    expect(customerFormSchema.safeParse(base()).success).toBe(true);
  });

  it("requires a company name", () => {
    expect(customerFormSchema.safeParse(base({ companyName: "  " })).success).toBe(false);
  });

  it("allows empty email but rejects an invalid one", () => {
    expect(customerFormSchema.safeParse(base({ email: "" })).success).toBe(true);
    expect(customerFormSchema.safeParse(base({ email: "not-an-email" })).success).toBe(false);
  });

  it("rejects an over-long email (bounded like other fields)", () => {
    const email = `${"a".repeat(250)}@x.com`; // 256 chars > 254
    expect(customerFormSchema.safeParse(base({ email })).success).toBe(false);
  });

  it("validates KVK as exactly 8 digits when present", () => {
    expect(customerFormSchema.safeParse(base({ kvkNumber: "12345678" })).success).toBe(true);
    expect(customerFormSchema.safeParse(base({ kvkNumber: "1234" })).success).toBe(false);
    expect(customerFormSchema.safeParse(base({ kvkNumber: "" })).success).toBe(true);
  });

  it("normalises email case", () => {
    expect(customerFormSchema.parse(base({ email: "Info@Acme.NL" })).email).toBe("info@acme.nl");
  });
});

describe("customerQuerySchema", () => {
  it("falls back to safe defaults for missing or garbage params", () => {
    expect(customerQuerySchema.parse({})).toEqual({ q: "", status: "all", country: "", page: 1 });
    expect(customerQuerySchema.parse({ page: "abc", status: "nope" })).toMatchObject({
      page: 1,
      status: "all",
    });
  });

  it("parses provided values", () => {
    expect(
      customerQuerySchema.parse({ q: "acme", status: "archived", country: "Belgium", page: "3" }),
    ).toEqual({ q: "acme", status: "archived", country: "Belgium", page: 3 });
  });

  it("tolerates array-valued params without throwing", () => {
    expect(customerQuerySchema.parse({ q: ["a", "b"], page: ["1", "2"] })).toMatchObject({
      q: "",
      page: 1,
    });
  });
});
