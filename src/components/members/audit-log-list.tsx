import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditAction, AuditLogEntry } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/format";

// Membership labels only; the members view is filtered to membership actions
// (see lib/data/audit listAuditLog). Partial keeps this valid as the shared
// AuditAction enum grows with other domains (e.g. invoices).
const ACTION_LABEL: Partial<Record<AuditAction, string>> = {
  "member.invited": "invited",
  "invitation.accepted": "accepted an invitation",
  "invitation.rejected": "declined an invitation",
  "invitation.revoked": "revoked an invitation for",
  "invitation.resent": "resent an invitation to",
  "member.role_changed": "changed the role of",
  "member.removed": "removed",
  "ownership.transferred": "transferred ownership to",
};

function detail(entry: AuditLogEntry): string | null {
  const meta = entry.metadata;
  if (entry.action === "member.role_changed" && meta.from && meta.to) {
    return `${String(meta.from)} → ${String(meta.to)}`;
  }
  if ((entry.action === "member.invited" || entry.action === "invitation.accepted") && meta.role) {
    return `as ${String(meta.role)}`;
  }
  return null;
}

export function AuditLogList({ entries }: { entries: AuditLogEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>Membership changes, most recent first.</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">No activity yet.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {entries.map((entry) => {
              const extra = detail(entry);
              return (
                <li key={entry.id} className="flex flex-col gap-0.5 py-3">
                  <p className="text-sm">
                    <span className="font-medium">{entry.actorEmail ?? "Someone"}</span>{" "}
                    {ACTION_LABEL[entry.action] ?? entry.action}
                    {entry.targetEmail && <span className="font-medium"> {entry.targetEmail}</span>}
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
