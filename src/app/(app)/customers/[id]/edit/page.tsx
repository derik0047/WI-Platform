import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { z } from "zod";

import { CustomerForm } from "@/components/customers/customer-form";
import { requireActiveOrganization } from "@/lib/auth/org";
import { getCustomer } from "@/lib/data/customers";
import { customerToFormValues } from "@/lib/customers/form";
import { isAppError } from "@/lib/errors";

export const metadata: Metadata = {
  title: "Edit customer",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function EditCustomerPage({ params }: PageProps) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const { user, organization } = await requireActiveOrganization();

  let customer;
  try {
    customer = await getCustomer(user.id, organization.id, id);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href="/customers" className="hover:underline">
            Customers
          </Link>{" "}
          /{" "}
          <Link href={`/customers/${customer.id}`} className="hover:underline">
            {customer.companyName}
          </Link>{" "}
          / Edit
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Edit customer</h1>
      </div>
      <CustomerForm customerId={customer.id} defaultValues={customerToFormValues(customer)} />
    </div>
  );
}
