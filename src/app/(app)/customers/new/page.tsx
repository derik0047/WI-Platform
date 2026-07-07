import type { Metadata } from "next";
import Link from "next/link";

import { CustomerForm } from "@/components/customers/customer-form";
import { requireActiveOrganization } from "@/lib/auth/org";
import { emptyCustomerForm } from "@/lib/customers/form";

export const metadata: Metadata = {
  title: "New customer",
};

export default async function NewCustomerPage() {
  await requireActiveOrganization();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href="/customers" className="hover:underline">
            Customers
          </Link>{" "}
          / New
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">New customer</h1>
      </div>
      <CustomerForm defaultValues={emptyCustomerForm()} />
    </div>
  );
}
