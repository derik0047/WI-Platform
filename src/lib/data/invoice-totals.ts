import "server-only";

import { and, eq } from "drizzle-orm";

import { invoiceLines, invoices } from "@/lib/db/schema";
import { recordAuditEvent, type Tx } from "@/lib/data/audit";
import { NotFoundError } from "@/lib/errors";
import { assertSupportedCurrency, computeInvoiceTotals } from "@/lib/invoices/totals";

export type TotalsActor = { id: string; email: string };

/**
 * Recompute an invoice's VAT & totals from its lines and persist them, inside the
 * caller's transaction. Called automatically after any line change that affects
 * amounts, so the stored totals never drift from the lines. Records a totals
 * audit event only when the grand total actually changes (so reorders and no-op
 * edits don't spam the history).
 */
export async function recalcInvoiceTotals(
  tx: Tx,
  actor: TotalsActor,
  organizationId: string,
  invoiceId: string,
): Promise<void> {
  const [invoice] = await tx
    .select({ currency: invoices.currency, grandTotalCents: invoices.grandTotalCents })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.organizationId, organizationId)));
  if (!invoice) throw new NotFoundError("Invoice not found");
  assertSupportedCurrency(invoice.currency);

  const lines = await tx
    .select({
      totalCents: invoiceLines.totalCents,
      vatRateBp: invoiceLines.vatRateBp,
      reverseCharge: invoiceLines.reverseCharge,
    })
    .from(invoiceLines)
    .where(
      and(eq(invoiceLines.invoiceId, invoiceId), eq(invoiceLines.organizationId, organizationId)),
    );

  const totals = computeInvoiceTotals(lines);

  await tx
    .update(invoices)
    .set({
      subtotalCents: totals.subtotalCents,
      vatTotalCents: totals.vatTotalCents,
      grandTotalCents: totals.grandTotalCents,
      vatBreakdown: totals.vatBreakdown,
      updatedAt: new Date(),
    })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.organizationId, organizationId)));

  if (totals.grandTotalCents !== invoice.grandTotalCents) {
    await recordAuditEvent(tx, {
      organizationId,
      action: "invoice.totals_recalculated",
      actor,
      targetType: "invoice",
      targetId: invoiceId,
      metadata: {
        from: invoice.grandTotalCents,
        to: totals.grandTotalCents,
        currency: invoice.currency,
      },
    });
  }
}
