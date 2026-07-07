"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COUNTRIES } from "@/config/countries";
import type { CustomerQuery } from "@/lib/validations/customer";

const SELECT_CLASS =
  "border-input dark:bg-input/30 focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]";

/**
 * Filter/search bar for the customer list. The URL is the source of truth; every
 * change pushes new query params (and resets to page 1) so results, pagination
 * and shareable links all stay in sync.
 */
export function CustomerFilters({ query }: { query: CustomerQuery }) {
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
    params.delete("page"); // any filter change returns to the first page
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
        placeholder="Search company, contact, email, KVK…"
        className="sm:max-w-xs"
        aria-label="Search customers"
      />
      <select
        aria-label="Filter by status"
        className={SELECT_CLASS}
        value={query.status}
        onChange={(event) =>
          update({ status: event.target.value === "all" ? "" : event.target.value, q })
        }
      >
        <option value="all">All statuses</option>
        <option value="active">Active</option>
        <option value="archived">Archived</option>
      </select>
      <select
        aria-label="Filter by country"
        className={SELECT_CLASS}
        value={query.country}
        onChange={(event) => update({ country: event.target.value, q })}
      >
        <option value="">All countries</option>
        {COUNTRIES.map((country) => (
          <option key={country} value={country}>
            {country}
          </option>
        ))}
      </select>
      <Button type="submit" variant="outline" disabled={pending}>
        Search
      </Button>
    </form>
  );
}
