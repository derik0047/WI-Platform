import type { Metadata } from "next";
import Link from "next/link";

import { AuditLogList } from "@/components/members/audit-log-list";
import { requireActiveOrganization } from "@/lib/auth/org";
import { listAuditLog } from "@/lib/data/audit";
import { isManagerRole } from "@/lib/organizations/membership";

export const metadata: Metadata = {
  title: "Activity log",
};

export default async function AuditLogPage() {
  const { user, organization } = await requireActiveOrganization();
  const canManage = isManagerRole(organization.role);
  const entries = canManage ? await listAuditLog(user.id, organization.id) : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity log</h1>
        <p className="text-muted-foreground text-sm">
          Membership activity for {organization.name}.{" "}
          <Link href="/settings/members" className="underline">
            Back to members
          </Link>
        </p>
      </div>

      {canManage ? (
        <AuditLogList entries={entries} />
      ) : (
        <p className="text-muted-foreground text-sm">
          Only owners and admins can view the activity log.
        </p>
      )}
    </div>
  );
}
