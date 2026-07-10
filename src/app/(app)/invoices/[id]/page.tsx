import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { z } from "zod";

import { InvoiceAuditTrail } from "@/components/invoices/invoice-audit-trail";
import { InvoiceLinesEditor } from "@/components/invoices/invoice-lines-editor";
import { InvoiceStatusActions } from "@/components/invoices/invoice-status-actions";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { InvoiceTotalsSummary } from "@/components/invoices/invoice-totals-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireActiveOrganization } from "@/lib/auth/org";
import { listAuditForTarget } from "@/lib/data/audit";
import { listInvoiceLines } from "@/lib/data/invoice-lines";
import { getInvoice, type InvoiceWithCustomer } from "@/lib/data/invoices";
import { isAppError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { isInvoiceEditable, isPastDue } from "@/lib/invoices/status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Invoice",
};

type PageProps = { params: Promise<{ id: string }> };

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

async function loadInvoice(
  userId: string,
  organizationId: string,
  id: string,
): Promise<InvoiceWithCustomer> {
  if (!z.string().uuid().safeParse(id).success) notFound();
  try {
    return await getInvoice(userId, organizationId, id);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { user, organization } = await requireActiveOrganization();
  const invoice = await loadInvoice(user.id, organization.id, id);
  const [history, lines] = await Promise.all([
    listAuditForTarget(user.id, organization.id, "invoice", invoice.id),
    listInvoiceLines(user.id, organization.id, invoice.id),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const overdue = isPastDue(invoice.status, invoice.dueDate, today);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">
            <Link href="/invoices" className="hover:underline">
              Invoices
            </Link>{" "}
            / {invoice.invoiceNumber}
          </p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{invoice.invoiceNumber}</h1>
            <InvoiceStatusBadge status={invoice.status} />
            {overdue && <span className="text-destructive text-sm font-medium">Past due</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isInvoiceEditable(invoice.status) && (
            <Button asChild variant="outline">
              <Link href={`/invoices/${invoice.id}/edit`}>Edit</Link>
            </Button>
          )}
          <InvoiceStatusActions invoiceId={invoice.id} status={invoice.status} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Customer"
              value={
                <Link href={`/customers/${invoice.customerId}`} className="hover:underline">
                  {invoice.customerName}
                </Link>
              }
            />
            <Field label="Currency" value={invoice.currency} />
            <Field label="Issue date" value={invoice.issueDate} />
            <Field
              label="Due date"
              value={<span className={cn(overdue && "text-destructive")}>{invoice.dueDate}</span>}
            />
            <Field label="Created" value={formatDate(invoice.createdAt)} />
          </dl>
          {invoice.notes?.trim() && (
            <div className="mt-6 flex flex-col gap-1">
              <dt className="text-muted-foreground text-xs">Notes</dt>
              <dd className="text-sm whitespace-pre-wrap">{invoice.notes}</dd>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceLinesEditor
            invoiceId={invoice.id}
            currency={invoice.currency}
            lines={lines}
            canEdit={isInvoiceEditable(invoice.status)}
          />
        </CardContent>
      </Card>

      <InvoiceTotalsSummary
        subtotalCents={invoice.subtotalCents}
        vatTotalCents={invoice.vatTotalCents}
        grandTotalCents={invoice.grandTotalCents}
        vatBreakdown={invoice.vatBreakdown}
        currency={invoice.currency}
      />

      <InvoiceAuditTrail entries={history} />
    </div>
  );
}
