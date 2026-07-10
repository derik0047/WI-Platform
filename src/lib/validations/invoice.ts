import { z } from "zod";

import { CURRENCIES } from "@/config/currencies";

/** Stored invoice status. */
export const invoiceStatusSchema = z.enum(["draft", "sent", "paid", "overdue", "cancelled"]);

/** Supported invoice currencies. */
export const currencySchema = z.enum(CURRENCIES);

/** True only for a real ISO calendar date (rejects e.g. 2026-02-30, 2026-13-01). */
function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

const dateField = (label: string) =>
  z.string().trim().refine(isCalendarDate, `${label} must be a valid date`);

/**
 * Invoice content form (create + edit). Status is NOT set here — it starts as
 * draft on create and only changes through the guarded transition action. Notes
 * "" is converted to null on write by the data layer.
 */
export const invoiceFormSchema = z
  .object({
    customerId: z.string().uuid("Select a customer"),
    issueDate: dateField("Issue date"),
    dueDate: dateField("Due date"),
    currency: currencySchema,
    notes: z.string().trim().max(5000),
  })
  .refine((values) => values.dueDate >= values.issueDate, {
    message: "Due date cannot be before the issue date",
    path: ["dueDate"],
  });

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

/** Status filter for the list, including "all". */
export const invoiceStatusFilterSchema = z.enum([
  "all",
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
]);
export type InvoiceStatusFilter = z.infer<typeof invoiceStatusFilterSchema>;

/** List query params, parsed from the URL (robust to malformed input via .catch). */
export const invoiceQuerySchema = z.object({
  q: z.string().trim().max(200).catch(""),
  status: invoiceStatusFilterSchema.catch("all"),
  customerId: z.string().uuid().catch(""), // "" (or garbage) means "no customer filter"
  page: z.coerce.number().int().catch(1),
});

export type InvoiceQuery = z.infer<typeof invoiceQuerySchema>;

/** Payload for a status transition. */
export const setInvoiceStatusSchema = z.object({
  status: invoiceStatusSchema,
});
