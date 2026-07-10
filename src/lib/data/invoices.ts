import "server-only";

import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  customers,
  invoiceCounters,
  invoices,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/db/schema";
import { recordAuditEvent } from "@/lib/data/audit";
import { customerBelongsToOrg } from "@/lib/data/customers";
import { requireMembership } from "@/lib/data/organizations";
import { AppError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  canTransitionInvoiceStatus,
  formatInvoiceNumber,
  isInvoiceEditable,
} from "@/lib/invoices/status";
import { paginate, resolvePageParams, type Paginated } from "@/lib/pagination";
import { containsPattern } from "@/lib/search";
import type { InvoiceFormValues, InvoiceQuery } from "@/lib/validations/invoice";

/**
 * Org-scoped invoice data access. Every function requires a validated membership
 * and scopes reads/writes by `organization_id` (multi-tenant isolation). This is
 * the ONLY place invoice rows are touched. Mutations run in a transaction that
 * also writes their audit entry, so the change and its record commit together.
 */

/** The acting user (id + email for authz and audit). */
export type InvoiceActor = { id: string; email: string };

export type InvoiceListItem = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  status: InvoiceStatus;
  currency: string;
  issueDate: string;
  dueDate: string;
  createdAt: Date;
};

export type InvoiceWithCustomer = Invoice & { customerName: string };

/** Build the WHERE predicate for a list query (org scope + filters + search). */
function buildInvoiceFilter(organizationId: string, query: InvoiceQuery): SQL {
  const conditions: SQL[] = [eq(invoices.organizationId, organizationId)];

  if (query.status !== "all") {
    conditions.push(eq(invoices.status, query.status));
  }
  if (query.customerId) {
    conditions.push(eq(invoices.customerId, query.customerId));
  }

  const pattern = containsPattern(query.q);
  if (pattern) {
    const search = or(
      ilike(invoices.invoiceNumber, pattern),
      ilike(customers.companyName, pattern),
    );
    if (search) conditions.push(search);
  }

  return and(...conditions) as SQL;
}

/** A page of invoices for an organization, filtered and searched. */
export async function listInvoices(
  userId: string,
  organizationId: string,
  query: InvoiceQuery,
): Promise<Paginated<InvoiceListItem>> {
  await requireMembership(userId, organizationId);
  const { page, pageSize, offset } = resolvePageParams({ page: query.page });
  const where = buildInvoiceFilter(organizationId, query);

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        customerId: invoices.customerId,
        customerName: customers.companyName,
        status: invoices.status,
        currency: invoices.currency,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .where(where)
      // issue_date desc with id as a unique tiebreaker keeps OFFSET paging stable.
      .orderBy(desc(invoices.issueDate), desc(invoices.id))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .where(where),
  ]);

  return paginate(rows, totals[0]?.value ?? 0, { page, pageSize });
}

/** A single invoice with its customer name, scoped to the org. Throws if absent. */
export async function getInvoice(
  userId: string,
  organizationId: string,
  invoiceId: string,
): Promise<InvoiceWithCustomer> {
  await requireMembership(userId, organizationId);
  const [row] = await db
    .select({ invoice: invoices, customerName: customers.companyName })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(and(eq(invoices.id, invoiceId), eq(invoices.organizationId, organizationId)))
    .limit(1);
  if (!row) throw new NotFoundError("Invoice not found");
  return { ...row.invoice, customerName: row.customerName };
}

/** Load a raw invoice row scoped to the org (internal). */
async function loadInvoice(organizationId: string, invoiceId: string): Promise<Invoice | null> {
  const [row] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

/** Create a draft invoice; allocates the next per-org, per-year number atomically. */
export async function createInvoice(
  actor: InvoiceActor,
  organizationId: string,
  values: InvoiceFormValues,
): Promise<Invoice> {
  await requireMembership(actor.id, organizationId);
  if (!(await customerBelongsToOrg(organizationId, values.customerId))) {
    throw new ValidationError("Select a customer from your organization");
  }
  const notes = values.notes.trim() || null;
  const year = Number(values.issueDate.slice(0, 4));

  return db.transaction(async (tx) => {
    // Atomic sequence: insert-or-increment the (org, year) counter under a row lock.
    const [counter] = await tx
      .insert(invoiceCounters)
      .values({ organizationId, year, lastSeq: 1 })
      .onConflictDoUpdate({
        target: [invoiceCounters.organizationId, invoiceCounters.year],
        set: { lastSeq: sql`${invoiceCounters.lastSeq} + 1` },
      })
      .returning({ lastSeq: invoiceCounters.lastSeq });
    if (!counter) throw new AppError("INTERNAL", "Failed to allocate an invoice number");

    const invoiceNumber = formatInvoiceNumber(year, counter.lastSeq);
    const [invoice] = await tx
      .insert(invoices)
      .values({
        organizationId,
        customerId: values.customerId,
        invoiceNumber,
        status: "draft",
        currency: values.currency,
        issueDate: values.issueDate,
        dueDate: values.dueDate,
        notes,
        createdByUserId: actor.id,
      })
      .returning();
    if (!invoice) throw new AppError("INTERNAL", "Failed to create invoice");

    await recordAuditEvent(tx, {
      organizationId,
      action: "invoice.created",
      actor,
      targetType: "invoice",
      targetId: invoice.id,
      metadata: { invoiceNumber, customerId: values.customerId, status: "draft" },
    });
    return invoice;
  });
}

/** Update a draft invoice's content (scoped to the org). Non-drafts are locked. */
export async function updateInvoice(
  actor: InvoiceActor,
  organizationId: string,
  invoiceId: string,
  values: InvoiceFormValues,
): Promise<Invoice> {
  await requireMembership(actor.id, organizationId);
  const existing = await loadInvoice(organizationId, invoiceId);
  if (!existing) throw new NotFoundError("Invoice not found");
  if (!isInvoiceEditable(existing.status)) {
    throw new AppError("CONFLICT", "Only draft invoices can be edited");
  }
  if (!(await customerBelongsToOrg(organizationId, values.customerId))) {
    throw new ValidationError("Select a customer from your organization");
  }
  const notes = values.notes.trim() || null;

  return db.transaction(async (tx) => {
    const [invoice] = await tx
      .update(invoices)
      .set({
        customerId: values.customerId,
        currency: values.currency,
        issueDate: values.issueDate,
        dueDate: values.dueDate,
        notes,
        updatedAt: new Date(),
      })
      // Re-assert draft in the WHERE so a concurrent status change makes this
      // match 0 rows (TOCTOU-safe under READ COMMITTED) instead of editing a
      // now-non-draft invoice.
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(invoices.organizationId, organizationId),
          eq(invoices.status, "draft"),
        ),
      )
      .returning();
    if (!invoice) {
      throw new AppError("CONFLICT", "The invoice changed — reload and try again");
    }

    await recordAuditEvent(tx, {
      organizationId,
      action: "invoice.updated",
      actor,
      targetType: "invoice",
      targetId: invoiceId,
      metadata: { invoiceNumber: invoice.invoiceNumber },
    });
    return invoice;
  });
}

/** Transition an invoice's status (guarded by the lifecycle rules). */
export async function setInvoiceStatus(
  actor: InvoiceActor,
  organizationId: string,
  invoiceId: string,
  toStatus: InvoiceStatus,
): Promise<Invoice> {
  await requireMembership(actor.id, organizationId);
  const existing = await loadInvoice(organizationId, invoiceId);
  if (!existing) throw new NotFoundError("Invoice not found");

  const fromStatus = existing.status;
  if (fromStatus === toStatus) return existing;
  if (!canTransitionInvoiceStatus(fromStatus, toStatus)) {
    throw new AppError("CONFLICT", `Cannot change an invoice from ${fromStatus} to ${toStatus}`);
  }

  return db.transaction(async (tx) => {
    const [invoice] = await tx
      .update(invoices)
      .set({ status: toStatus, updatedAt: new Date() })
      // Re-assert the expected from-status so a concurrent transition makes this
      // match 0 rows instead of landing an illegal transition (TOCTOU-safe).
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(invoices.organizationId, organizationId),
          eq(invoices.status, fromStatus),
        ),
      )
      .returning();
    if (!invoice) {
      throw new AppError("CONFLICT", "The invoice status changed — reload and try again");
    }

    await recordAuditEvent(tx, {
      organizationId,
      action: "invoice.status_changed",
      actor,
      targetType: "invoice",
      targetId: invoiceId,
      metadata: { from: fromStatus, to: toStatus, invoiceNumber: invoice.invoiceNumber },
    });
    return invoice;
  });
}

/** Permanently delete a draft invoice (non-drafts must be cancelled instead). */
export async function deleteInvoice(
  actor: InvoiceActor,
  organizationId: string,
  invoiceId: string,
): Promise<void> {
  await requireMembership(actor.id, organizationId);
  const existing = await loadInvoice(organizationId, invoiceId);
  if (!existing) throw new NotFoundError("Invoice not found");
  if (!isInvoiceEditable(existing.status)) {
    throw new AppError("CONFLICT", "Only draft invoices can be deleted. Cancel it instead.");
  }

  await db.transaction(async (tx) => {
    // Re-assert draft in the WHERE so a concurrent status change makes this match
    // 0 rows instead of hard-deleting a now-non-draft invoice (TOCTOU-safe).
    const deleted = await tx
      .delete(invoices)
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(invoices.organizationId, organizationId),
          eq(invoices.status, "draft"),
        ),
      )
      .returning({ id: invoices.id });
    if (deleted.length === 0) {
      throw new AppError("CONFLICT", "The invoice is no longer a draft — reload and try again");
    }
    await recordAuditEvent(tx, {
      organizationId,
      action: "invoice.deleted",
      actor,
      targetType: "invoice",
      targetId: invoiceId,
      metadata: { invoiceNumber: existing.invoiceNumber, status: existing.status },
    });
  });
}
