"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { CustomerOption } from "@/lib/data/customers";
import type { InvoiceQuery } from "@/lib/validations/invoice";

/**
 * Filter/search bar for the invoice list. The URL is the source of truth; every
 * change pushes new query params (and resets to page 1).
 */
export function InvoiceFilters({
  query,
  customers,
}: {
  query: InvoiceQuery;
  customers: CustomerOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(query.q);

  function update(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    const qs = params.toString();
    const href = (qs ? `${pathname}?${qs}` : pathname) as Route;
    startTransition(() => router.push(href));
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        update({ q });
      }}
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      <Input
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="Search invoice number or customer…"
        className="sm:max-w-xs"
        aria-label="Search invoices"
      />
      <NativeSelect
        aria-label="Filter by status"
        className="sm:w-40"
        value={query.status}
        onChange={(event) =>
          update({ status: event.target.value === "all" ? "" : event.target.value, q })
        }
      >
        <option value="all">All statuses</option>
        <option value="draft">Draft</option>
        <option value="sent">Sent</option>
        <option value="paid">Paid</option>
        <option value="overdue">Overdue</option>
        <option value="cancelled">Cancelled</option>
      </NativeSelect>
      <NativeSelect
        aria-label="Filter by customer"
        className="sm:w-56"
        value={query.customerId}
        onChange={(event) => update({ customerId: event.target.value, q })}
      >
        <option value="">All customers</option>
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.companyName}
          </option>
        ))}
      </NativeSelect>
      <Button type="submit" variant="outline" disabled={pending}>
        Search
      </Button>
    </form>
  );
}
