import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { z } from "zod";

import { CustomerDetailActions } from "@/components/customers/customer-detail-actions";
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireActiveOrganization } from "@/lib/auth/org";
import { getCustomer } from "@/lib/data/customers";
import type { Customer } from "@/lib/db/schema";
import { isAppError } from "@/lib/errors";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Customer",
};

type PageProps = { params: Promise<{ id: string }> };

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

async function loadCustomer(userId: string, organizationId: string, id: string): Promise<Customer> {
  if (!z.string().uuid().safeParse(id).success) notFound();
  try {
    return await getCustomer(userId, organizationId, id);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { user, organization } = await requireActiveOrganization();
  const customer = await loadCustomer(user.id, organization.id, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">
            <Link href="/customers" className="hover:underline">
              Customers
            </Link>{" "}
            / {customer.companyName}
          </p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{customer.companyName}</h1>
            <CustomerStatusBadge status={customer.status} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/customers/${customer.id}/edit`}>Edit</Link>
          </Button>
          <CustomerDetailActions customerId={customer.id} status={customer.status} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact person" value={customer.contactName} />
            <Field label="Email" value={customer.email} />
            <Field label="Phone" value={customer.phone} />
            <Field label="Country" value={customer.country} />
            <Field label="Address" value={customer.addressLine} />
            <Field label="Postal code" value={customer.postalCode} />
            <Field label="City" value={customer.city} />
            <Field label="KVK number" value={customer.kvkNumber} />
            <Field label="VAT number (BTW)" value={customer.vatNumber} />
            <Field label="Added" value={formatDate(customer.createdAt)} />
          </dl>
          {customer.notes?.trim() && (
            <div className="mt-6 flex flex-col gap-1">
              <dt className="text-muted-foreground text-xs">Notes</dt>
              <dd className="text-sm whitespace-pre-wrap">{customer.notes}</dd>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
