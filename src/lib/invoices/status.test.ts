import { describe, expect, it } from "vitest";

import {
  canTransitionInvoiceStatus,
  formatInvoiceNumber,
  isInvoiceEditable,
  isPastDue,
  nextInvoiceStatuses,
} from "./status";

describe("canTransitionInvoiceStatus", () => {
  it("permits the documented transitions", () => {
    expect(canTransitionInvoiceStatus("draft", "sent")).toBe(true);
    expect(canTransitionInvoiceStatus("draft", "cancelled")).toBe(true);
    expect(canTransitionInvoiceStatus("sent", "paid")).toBe(true);
    expect(canTransitionInvoiceStatus("sent", "overdue")).toBe(true);
    expect(canTransitionInvoiceStatus("overdue", "paid")).toBe(true);
  });

  it("rejects illegal transitions", () => {
    expect(canTransitionInvoiceStatus("draft", "paid")).toBe(false);
    expect(canTransitionInvoiceStatus("paid", "sent")).toBe(false);
    expect(canTransitionInvoiceStatus("cancelled", "sent")).toBe(false);
    expect(canTransitionInvoiceStatus("sent", "draft")).toBe(false);
  });

  it("treats terminal statuses as having no next states", () => {
    expect(nextInvoiceStatuses("paid")).toEqual([]);
    expect(nextInvoiceStatuses("cancelled")).toEqual([]);
    expect(nextInvoiceStatuses("draft")).toEqual(["sent", "cancelled"]);
  });
});

describe("isInvoiceEditable", () => {
  it("is true only for drafts", () => {
    expect(isInvoiceEditable("draft")).toBe(true);
    expect(isInvoiceEditable("sent")).toBe(false);
    expect(isInvoiceEditable("paid")).toBe(false);
  });
});

describe("formatInvoiceNumber", () => {
  it("zero-pads the sequence to four digits", () => {
    expect(formatInvoiceNumber(2026, 7)).toBe("INV-2026-0007");
    expect(formatInvoiceNumber(2026, 1234)).toBe("INV-2026-1234");
  });

  it("does not truncate sequences beyond four digits", () => {
    expect(formatInvoiceNumber(2026, 12345)).toBe("INV-2026-12345");
  });
});

describe("isPastDue", () => {
  it("flags a sent/overdue invoice past its due date", () => {
    expect(isPastDue("sent", "2026-01-01", "2026-02-01")).toBe(true);
    expect(isPastDue("overdue", "2026-01-01", "2026-02-01")).toBe(true);
  });

  it("is false on or before the due date", () => {
    expect(isPastDue("sent", "2026-02-01", "2026-02-01")).toBe(false);
    expect(isPastDue("sent", "2026-03-01", "2026-02-01")).toBe(false);
  });

  it("never flags draft, paid or cancelled invoices", () => {
    expect(isPastDue("draft", "2000-01-01", "2026-02-01")).toBe(false);
    expect(isPastDue("paid", "2000-01-01", "2026-02-01")).toBe(false);
    expect(isPastDue("cancelled", "2000-01-01", "2026-02-01")).toBe(false);
  });
});
