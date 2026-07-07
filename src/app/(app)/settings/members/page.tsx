import type { Metadata } from "next";
import Link from "next/link";

import { AuditLogList } from "@/components/members/audit-log-list";
import { InviteMemberForm } from "@/components/members/invite-member-form";
import { MembersList, type MemberRow } from "@/components/members/members-list";
import { PendingInvitations, type InvitationRow } from "@/components/members/pending-invitations";
import { requireActiveOrganization } from "@/lib/auth/org";
import { listAuditLog } from "@/lib/data/audit";
import { listPendingInvitations } from "@/lib/data/invitations";
import { listMembers } from "@/lib/data/members";
import { isManagerRole } from "@/lib/organizations/membership";

export const metadata: Metadata = {
  title: "Members",
};

export default async function MembersPage() {
  const { user, organization } = await requireActiveOrganization();
  const canManage = isManagerRole(organization.role);

  const [members, invitations, auditEntries] = await Promise.all([
    listMembers(user.id, organization.id),
    canManage ? listPendingInvitations(user.id, organization.id) : Promise.resolve([]),
    canManage ? listAuditLog(user.id, organization.id, 20) : Promise.resolve([]),
  ]);

  const memberRows: MemberRow[] = members.map((member) => ({
    userId: member.userId,
    email: member.email,
    fullName: member.fullName,
    role: member.role,
    joinedAt: member.joinedAt,
    isOwner: member.isOwner,
  }));
  const invitationRows: InvitationRow[] = invitations.map((invitation) => ({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="text-muted-foreground text-sm">
          Manage who belongs to {organization.name} and at what role.
        </p>
      </div>

      {canManage && <InviteMemberForm organizationId={organization.id} />}

      <MembersList
        organizationId={organization.id}
        members={memberRows}
        currentUserId={user.id}
        currentRole={organization.role}
      />

      {canManage && (
        <>
          <PendingInvitations organizationId={organization.id} invitations={invitationRows} />
          <div className="flex flex-col gap-2">
            <AuditLogList entries={auditEntries} />
            <Link
              href="/settings/audit"
              className="text-muted-foreground hover:text-foreground self-start text-sm underline"
            >
              View full activity log
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
