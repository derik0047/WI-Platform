import type { Metadata } from "next";
import Link from "next/link";

import { InvoiceForm } from "@/components/invoices/invoice-form";
import { DEFAULT_CURRENCY } from "@/config/currencies";
import { requireActiveOrganization } from "@/lib/auth/org";
import { listCustomerOptions } from "@/lib/data/customers";
import type { InvoiceFormValues } from "@/lib/validations/invoice";

export const metadata: Metadata = {
  title: "New invoice",
};

export default async function NewInvoicePage() {
  const { user, organization } = await requireActiveOrganization();
  const customers = await listCustomerOptions(user.id, organization.id);

  const today = new Date().toISOString().slice(0, 10);
  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const defaultValues: InvoiceFormValues = {
    customerId: "",
    issueDate: today,
    dueDate,
    currency: DEFAULT_CURRENCY,
    notes: "",
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href="/invoices" className="hover:underline">
            Invoices
          </Link>{" "}
          / New
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">New invoice</h1>
      </div>
      <InvoiceForm defaultValues={defaultValues} customers={customers} />
    </div>
  );
}
