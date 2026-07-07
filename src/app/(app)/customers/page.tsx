import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import type { Route } from "next";

import { CustomerFilters } from "@/components/customers/customer-filters";
import { CustomersTable } from "@/components/customers/customers-table";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { requireActiveOrganization } from "@/lib/auth/org";
import { listCustomers } from "@/lib/data/customers";
import { customerQuerySchema } from "@/lib/validations/customer";

export const metadata: Metadata = {
  title: "Customers",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CustomersPage({ searchParams }: PageProps) {
  const { user, organization } = await requireActiveOrganization();
  const query = customerQuerySchema.parse(await searchParams);
  const result = await listCustomers(user.id, organization.id, query);

  // Params to carry across pagination links (current filters, minus page).
  const baseParams: Record<string, string> = {};
  if (query.q) baseParams.q = query.q;
  if (query.status !== "all") baseParams.status = query.status;
  if (query.country) baseParams.country = query.country;

  // A page beyond the last (e.g. a stale link, or the set shrank after archiving)
  // would render an empty view with no controls — send the user to the last page.
  if (result.total > 0 && result.page > result.totalPages) {
    const params = new URLSearchParams(baseParams);
    if (result.totalPages > 1) params.set("page", String(result.totalPages));
    const qs = params.toString();
    redirect((qs ? `/customers?${qs}` : "/customers") as Route);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-muted-foreground text-sm">
            {result.total} {result.total === 1 ? "customer" : "customers"} in {organization.name}
          </p>
        </div>
        <Button asChild>
          <Link href="/customers/new">
            <Plus />
            New customer
          </Link>
        </Button>
      </div>

      <CustomerFilters query={query} />
      <CustomersTable items={result.items} />
      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/customers"
        baseParams={baseParams}
      />
    </div>
  );
}
