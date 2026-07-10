import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditAction, AuditLogEntry } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/invoices/line-math";

const ACTION_LABEL: Partial<Record<AuditAction, string>> = {
  "invoice.created": "created this invoice",
  "invoice.updated": "updated this invoice",
  "invoice.status_changed": "changed the status",
  "invoice.deleted": "deleted this invoice",
  "invoice.line_added": "added a line",
  "invoice.line_updated": "updated a line",
  "invoice.line_removed": "removed a line",
  "invoice.line_reordered": "reordered the lines",
  "invoice.totals_recalculated": "recalculated the totals",
};

function detail(entry: AuditLogEntry): string | null {
  if (entry.action === "invoice.status_changed" && entry.metadata.from && entry.metadata.to) {
    return `${String(entry.metadata.from)} → ${String(entry.metadata.to)}`;
  }
  if (
    (entry.action === "invoice.line_added" ||
      entry.action === "invoice.line_updated" ||
      entry.action === "invoice.line_removed") &&
    entry.metadata.description
  ) {
    return String(entry.metadata.description);
  }
  if (
    entry.action === "invoice.totals_recalculated" &&
    entry.metadata.to !== undefined &&
    entry.metadata.currency
  ) {
    return formatMoney(Number(entry.metadata.to), String(entry.metadata.currency));
  }
  return null;
}

export function InvoiceAuditTrail({ entries }: { entries: AuditLogEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">No history yet.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {entries.map((entry) => {
              const extra = detail(entry);
              return (
                <li key={entry.id} className="flex flex-col gap-0.5 py-3">
                  <p className="text-sm">
                    <span className="font-medium">{entry.actorEmail ?? "Someone"}</span>{" "}
                    {ACTION_LABEL[entry.action] ?? entry.action}
                    {extra && <span className="text-muted-foreground"> ({extra})</span>}
                  </p>
                  <p className="text-muted-foreground text-xs">{formatDateTime(entry.createdAt)}</p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
