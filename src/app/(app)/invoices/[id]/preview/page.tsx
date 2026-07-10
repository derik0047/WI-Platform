import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { z } from "zod";

import { InvoicePdfPreview } from "@/components/invoices/invoice-pdf-preview";
import { requireActiveOrganization } from "@/lib/auth/org";
import { getInvoice } from "@/lib/data/invoices";
import { isAppError } from "@/lib/errors";

export const metadata: Metadata = {
  title: "Invoice PDF",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function InvoicePreviewPage({ params }: PageProps) {
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
          / PDF
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Invoice PDF</h1>
      </div>
      <InvoicePdfPreview invoiceId={invoice.id} />
    </div>
  );
}
