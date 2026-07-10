import type { InvoiceStatus } from "@/lib/db/schema";

/**
 * The invoice lifecycle, expressed as pure decision functions. The data layer
 * enforces these and the UI reuses them (which transition buttons to show), so
 * the rules live in exactly one place.
 *
 * - draft:     editable/deletable; can be sent or cancelled
 * - sent:      can be marked paid, overdue, or cancelled
 * - overdue:   can be marked paid or cancelled
 * - paid:      terminal
 * - cancelled: terminal
 */
const TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  draft: ["sent", "cancelled"],
  sent: ["paid", "overdue", "cancelled"],
  overdue: ["paid", "cancelled"],
  paid: [],
  cancelled: [],
};

/** Statuses an invoice may move to from its current status. */
export function nextInvoiceStatuses(from: InvoiceStatus): readonly InvoiceStatus[] {
  return TRANSITIONS[from];
}

const STATUS_ACTION_LABEL: Record<InvoiceStatus, string> = {
  draft: "Move to draft",
  sent: "Mark as sent",
  paid: "Mark as paid",
  overdue: "Mark as overdue",
  cancelled: "Cancel invoice",
};

/** Button/menu label for transitioning an invoice to `to`. */
export function statusActionLabel(to: InvoiceStatus): string {
  return STATUS_ACTION_LABEL[to];
}

/** Is moving from -> to a permitted transition? */
export function canTransitionInvoiceStatus(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Only draft invoices may have their content edited or be hard-deleted. */
export function isInvoiceEditable(status: InvoiceStatus): boolean {
  return status === "draft";
}

/** Format a sequence number into an invoice number, e.g. INV-2026-0007. */
export function formatInvoiceNumber(year: number, seq: number): string {
  return `INV-${year}-${String(seq).padStart(4, "0")}`;
}

/**
 * Display hint: a sent/overdue invoice whose due date has passed. Dates are ISO
 * `YYYY-MM-DD` strings, which compare lexically (= chronologically).
 */
export function isPastDue(status: InvoiceStatus, dueDate: string, today: string): boolean {
  if (status !== "sent" && status !== "overdue") return false;
  return dueDate < today;
}
