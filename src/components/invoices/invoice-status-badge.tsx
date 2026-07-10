import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@/lib/db/schema";

const VARIANT: Record<InvoiceStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  sent: "secondary",
  paid: "default",
  overdue: "destructive",
  cancelled: "outline",
};

const LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

/** Reusable status pill for an invoice (list + detail). */
export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge
      variant={VARIANT[status]}
      className={status === "cancelled" ? "text-muted-foreground" : ""}
    >
      {LABEL[status]}
    </Badge>
  );
}
