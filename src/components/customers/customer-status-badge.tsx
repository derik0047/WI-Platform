import { Badge } from "@/components/ui/badge";
import type { CustomerStatus } from "@/lib/db/schema";

/** Reusable status pill for a customer (list + detail). */
export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  return status === "active" ? (
    <Badge variant="secondary">Active</Badge>
  ) : (
    <Badge variant="outline">Archived</Badge>
  );
}
