import Link from "next/link";

import type { Route } from "next";

import { Button } from "@/components/ui/button";

/**
 * Link-based pagination (server component). Preserves the current filter params
 * and only swaps `page`, so the URL stays the source of truth for list state.
 */
export function Pagination({
  page,
  totalPages,
  basePath,
  baseParams,
}: {
  page: number;
  totalPages: number;
  basePath: Route;
  baseParams: Record<string, string>;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (target: number) => ({
    pathname: basePath,
    query: { ...baseParams, page: String(target) },
  });

  return (
    <div className="flex items-center justify-between">
      <p className="text-muted-foreground text-sm">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefFor(page - 1)}>Previous</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
        )}
        {page < totalPages ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefFor(page + 1)}>Next</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
