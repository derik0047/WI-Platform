import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { z } from "zod";

import { InvoiceForm } from "@/components/invoices/invoice-form";
import type { Currency } from "@/config/currencies";
import { requireActiveOrganization } from "@/lib/auth/org";
import { listCustomerOptions, type CustomerOption } from "@/lib/data/customers";
import { getInvoice } from "@/lib/data/invoices";
import { isAppError } from "@/lib/errors";
import { isInvoiceEditable } from "@/lib/invoices/status";
import type { InvoiceFormValues } from "@/lib/validations/invoice";

export const metadata: Metadata = {
  title: "Edit invoice",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function EditInvoicePage({ params }: PageProps) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const { user, organization } = await requireActiveOrganization();

  let invoice;
  try {
    invoice = await getInvoice(user.id, organization.id, id);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  // Only drafts are editable; non-drafts return to the read-only view.
  if (!isInvoiceEditable(invoice.status)) redirect(`/invoices/${invoice.id}`);

  const customers = await listCustomerOptions(user.id, organization.id);
  // Ensure the invoice's current customer is selectable even if since archived.
  const options: CustomerOption[] = customers.some((c) => c.id === invoice.customerId)
    ? customers
    : [{ id: invoice.customerId, companyName: invoice.customerName }, ...customers];

  const defaultValues: InvoiceFormValues = {
    customerId: invoice.customerId,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency as Currency,
    notes: invoice.notes ?? "",
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href="/invoices" className="hover:underline">
            Invoices
          </Link>{" "}
          /{" "}
          <Link href={`/invoices/${invoice.id}`} className="hover:underline">
            {invoice.invoiceNumber}
          </Link>{" "}
          / Edit
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Edit invoice</h1>
      </div>
      <InvoiceForm invoiceId={invoice.id} defaultValues={defaultValues} customers={options} />
    </div>
  );
}
