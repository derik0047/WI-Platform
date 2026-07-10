import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import type { Route } from "next";

import { InvoiceFilters } from "@/components/invoices/invoice-filters";
import { InvoicesTable } from "@/components/invoices/invoices-table";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { requireActiveOrganization } from "@/lib/auth/org";
import { listCustomerOptions } from "@/lib/data/customers";
import { listInvoices } from "@/lib/data/invoices";
import { invoiceQuerySchema } from "@/lib/validations/invoice";

export const metadata: Metadata = {
  title: "Invoices",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InvoicesPage({ searchParams }: PageProps) {
  const { user, organization } = await requireActiveOrganization();
  const query = invoiceQuerySchema.parse(await searchParams);

  const [result, customers] = await Promise.all([
    listInvoices(user.id, organization.id, query),
    listCustomerOptions(user.id, organization.id),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  const baseParams: Record<string, string> = {};
  if (query.q) baseParams.q = query.q;
  if (query.status !== "all") baseParams.status = query.status;
  if (query.customerId) baseParams.customerId = query.customerId;

  // A page past the last one (stale link / shrunk set) → send to the last page.
  if (result.total > 0 && result.page > result.totalPages) {
    const params = new URLSearchParams(baseParams);
    if (result.totalPages > 1) params.set("page", String(result.totalPages));
    const qs = params.toString();
    redirect((qs ? `/invoices?${qs}` : "/invoices") as Route);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground text-sm">
            {result.total} {result.total === 1 ? "invoice" : "invoices"} in {organization.name}
          </p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">
            <Plus />
            New invoice
          </Link>
        </Button>
      </div>

      <InvoiceFilters query={query} customers={customers} />
      <InvoicesTable items={result.items} today={today} />
      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/invoices"
        baseParams={baseParams}
      />
    </div>
  );
}
