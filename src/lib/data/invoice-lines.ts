import "server-only";

import { and, asc, eq, gt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { invoiceLines, invoices, type InvoiceLine } from "@/lib/db/schema";
import { recordAuditEvent, type Tx } from "@/lib/data/audit";
import { recalcInvoiceTotals } from "@/lib/data/invoice-totals";
import { requireMembership } from "@/lib/data/organizations";
import { AppError, NotFoundError, ValidationError } from "@/lib/errors";
import { normalizeLineInput } from "@/lib/invoices/line-form";
import type { InvoiceLineFormValues } from "@/lib/validations/invoice-line";

/**
 * Org-scoped invoice-line data access. Every function requires a validated
 * membership and scopes by organization_id (tenant isolation). Line mutations are
 * only permitted while the parent invoice is a draft — enforced atomically by
 * locking the invoice row (SELECT … FOR UPDATE) inside each mutation transaction,
 * so a concurrent status change can't slip a line edit onto a non-draft invoice.
 * Each mutation records an audit event against the parent invoice.
 */

export type InvoiceLineActor = { id: string; email: string };

/** Lock the parent invoice and assert it is a draft in this org. Tx-only. */
async function lockDraftInvoice(tx: Tx, organizationId: string, invoiceId: string): Promise<void> {
  const [invoice] = await tx
    .select({ status: invoices.status })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.organizationId, organizationId)))
    .for("update");
  if (!invoice) throw new NotFoundError("Invoice not found");
  if (invoice.status !== "draft") {
    throw new AppError("CONFLICT", "Only draft invoices can be modified");
  }
}

/** Next append position for an invoice's lines (max + 1, or 0). Tx-only. */
async function nextPosition(tx: Tx, organizationId: string, invoiceId: string): Promise<number> {
  const [row] = await tx
    .select({ max: sql<number>`coalesce(max(${invoiceLines.position}), -1)` })
    .from(invoiceLines)
    .where(
      and(eq(invoiceLines.invoiceId, invoiceId), eq(invoiceLines.organizationId, organizationId)),
    );
  return (row?.max ?? -1) + 1;
}

/** All lines for an invoice, in display order. */
export async function listInvoiceLines(
  userId: string,
  organizationId: string,
  invoiceId: string,
): Promise<InvoiceLine[]> {
  await requireMembership(userId, organizationId);
  return db
    .select()
    .from(invoiceLines)
    .where(
      and(eq(invoiceLines.organizationId, organizationId), eq(invoiceLines.invoiceId, invoiceId)),
    )
    .orderBy(asc(invoiceLines.position), asc(invoiceLines.id));
}

/** Add a line to a draft invoice (appended at the end). */
export async function createInvoiceLine(
  actor: InvoiceLineActor,
  organizationId: string,
  invoiceId: string,
  values: InvoiceLineFormValues,
): Promise<InvoiceLine> {
  await requireMembership(actor.id, organizationId);
  const data = normalizeLineInput(values);

  return db.transaction(async (tx) => {
    await lockDraftInvoice(tx, organizationId, invoiceId);
    const position = await nextPosition(tx, organizationId, invoiceId);
    const [line] = await tx
      .insert(invoiceLines)
      .values({ ...data, organizationId, invoiceId, position })
      .returning();
    if (!line) throw new AppError("INTERNAL", "Failed to add the line");

    await recordAuditEvent(tx, {
      organizationId,
      action: "invoice.line_added",
      actor,
      targetType: "invoice",
      targetId: invoiceId,
      metadata: { lineId: line.id, description: line.description },
    });
    await recalcInvoiceTotals(tx, actor, organizationId, invoiceId);
    return line;
  });
}

/** Update a line on a draft invoice. */
export async function updateInvoiceLine(
  actor: InvoiceLineActor,
  organizationId: string,
  invoiceId: string,
  lineId: string,
  values: InvoiceLineFormValues,
): Promise<InvoiceLine> {
  await requireMembership(actor.id, organizationId);
  const data = normalizeLineInput(values);

  return db.transaction(async (tx) => {
    await lockDraftInvoice(tx, organizationId, invoiceId);
    const [line] = await tx
      .update(invoiceLines)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(invoiceLines.id, lineId),
          eq(invoiceLines.invoiceId, invoiceId),
          eq(invoiceLines.organizationId, organizationId),
        ),
      )
      .returning();
    if (!line) throw new NotFoundError("Line not found");

    await recordAuditEvent(tx, {
      organizationId,
      action: "invoice.line_updated",
      actor,
      targetType: "invoice",
      targetId: invoiceId,
      metadata: { lineId, description: line.description },
    });
    await recalcInvoiceTotals(tx, actor, organizationId, invoiceId);
    return line;
  });
}

/** Remove a line from a draft invoice. */
export async function deleteInvoiceLine(
  actor: InvoiceLineActor,
  organizationId: string,
  invoiceId: string,
  lineId: string,
): Promise<void> {
  await requireMembership(actor.id, organizationId);

  await db.transaction(async (tx) => {
    await lockDraftInvoice(tx, organizationId, invoiceId);
    const [deleted] = await tx
      .delete(invoiceLines)
      .where(
        and(
          eq(invoiceLines.id, lineId),
          eq(invoiceLines.invoiceId, invoiceId),
          eq(invoiceLines.organizationId, organizationId),
        ),
      )
      .returning({ id: invoiceLines.id, description: invoiceLines.description });
    if (!deleted) throw new NotFoundError("Line not found");

    await recordAuditEvent(tx, {
      organizationId,
      action: "invoice.line_removed",
      actor,
      targetType: "invoice",
      targetId: invoiceId,
      metadata: { lineId, description: deleted.description },
    });
    await recalcInvoiceTotals(tx, actor, organizationId, invoiceId);
  });
}

/** Duplicate a line, inserting the copy immediately after the original. */
export async function duplicateInvoiceLine(
  actor: InvoiceLineActor,
  organizationId: string,
  invoiceId: string,
  lineId: string,
): Promise<InvoiceLine> {
  await requireMembership(actor.id, organizationId);

  return db.transaction(async (tx) => {
    await lockDraftInvoice(tx, organizationId, invoiceId);
    const [source] = await tx
      .select()
      .from(invoiceLines)
      .where(
        and(
          eq(invoiceLines.id, lineId),
          eq(invoiceLines.invoiceId, invoiceId),
          eq(invoiceLines.organizationId, organizationId),
        ),
      );
    if (!source) throw new NotFoundError("Line not found");

    // Make room directly after the source, then insert the copy there.
    await tx
      .update(invoiceLines)
      .set({ position: sql`${invoiceLines.position} + 1` })
      .where(
        and(
          eq(invoiceLines.invoiceId, invoiceId),
          eq(invoiceLines.organizationId, organizationId),
          gt(invoiceLines.position, source.position),
        ),
      );

    const [copy] = await tx
      .insert(invoiceLines)
      .values({
        organizationId,
        invoiceId,
        position: source.position + 1,
        description: source.description,
        quantity: source.quantity,
        unit: source.unit,
        unitPriceCents: source.unitPriceCents,
        discountType: source.discountType,
        discountValue: source.discountValue,
        vatRateBp: source.vatRateBp,
        reverseCharge: source.reverseCharge,
        subtotalCents: source.subtotalCents,
        totalCents: source.totalCents,
        notes: source.notes,
      })
      .returning();
    if (!copy) throw new AppError("INTERNAL", "Failed to duplicate the line");

    await recordAuditEvent(tx, {
      organizationId,
      action: "invoice.line_added",
      actor,
      targetType: "invoice",
      targetId: invoiceId,
      metadata: { lineId: copy.id, description: copy.description, duplicatedFrom: source.id },
    });
    await recalcInvoiceTotals(tx, actor, organizationId, invoiceId);
    return copy;
  });
}

/** Persist a drag-and-drop reorder. `lineIds` must be exactly the invoice's lines. */
export async function reorderInvoiceLines(
  actor: InvoiceLineActor,
  organizationId: string,
  invoiceId: string,
  lineIds: string[],
): Promise<void> {
  await requireMembership(actor.id, organizationId);

  await db.transaction(async (tx) => {
    await lockDraftInvoice(tx, organizationId, invoiceId);
    const current = await tx
      .select({ id: invoiceLines.id })
      .from(invoiceLines)
      .where(
        and(eq(invoiceLines.invoiceId, invoiceId), eq(invoiceLines.organizationId, organizationId)),
      );

    const currentIds = new Set(current.map((row) => row.id));
    const uniqueProvided = new Set(lineIds);
    const sameSet =
      lineIds.length === currentIds.size &&
      uniqueProvided.size === lineIds.length &&
      lineIds.every((id) => currentIds.has(id));
    if (!sameSet) {
      throw new ValidationError("The line order is out of date. Reload and try again.");
    }

    for (const [index, id] of lineIds.entries()) {
      await tx
        .update(invoiceLines)
        .set({ position: index })
        .where(
          and(
            eq(invoiceLines.id, id),
            eq(invoiceLines.invoiceId, invoiceId),
            eq(invoiceLines.organizationId, organizationId),
          ),
        );
    }

    await recordAuditEvent(tx, {
      organizationId,
      action: "invoice.line_reordered",
      actor,
      targetType: "invoice",
      targetId: invoiceId,
      metadata: { count: lineIds.length },
    });
  });
}
