import { describe, expect, it } from "vitest";

import type { CustomerFormValues } from "@/lib/validations/customer";

import { normalizeCustomerInput } from "./normalize";

function form(overrides: Partial<CustomerFormValues> = {}): CustomerFormValues {
  return {
    companyName: "Acme BV",
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

describe("normalizeCustomerInput", () => {
  it("converts empty optional strings to null", () => {
    const result = normalizeCustomerInput(form());
    expect(result.contactName).toBeNull();
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.vatNumber).toBeNull();
  });

  it("keeps required fields as trimmed strings", () => {
    const result = normalizeCustomerInput(form({ companyName: "  Acme BV  " }));
    expect(result.companyName).toBe("Acme BV");
    expect(result.country).toBe("Netherlands");
    expect(result.status).toBe("active");
  });

  it("lowercases email and uppercases VAT number", () => {
    const result = normalizeCustomerInput(
      form({ email: "Info@Acme.NL", vatNumber: "nl123456789b01" }),
    );
    expect(result.email).toBe("info@acme.nl");
    expect(result.vatNumber).toBe("NL123456789B01");
  });

  it("falls back to Netherlands when country is blank", () => {
    expect(normalizeCustomerInput(form({ country: "   " })).country).toBe("Netherlands");
  });

  it("preserves an archived status", () => {
    expect(normalizeCustomerInput(form({ status: "archived" })).status).toBe("archived");
  });
});
