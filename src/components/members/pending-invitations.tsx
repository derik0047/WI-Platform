"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  resendInvitationAction,
  revokeInvitationAction,
} from "@/app/(app)/settings/members/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ActionResult } from "@/lib/action-result";
import type { InvitationStatus, OrganizationRole } from "@/lib/db/schema";
import { formatDate } from "@/lib/format";
import { invitationDisplayStatus } from "@/lib/organizations/invitation";
import { cn } from "@/lib/utils";

export type InvitationRow = {
  id: string;
  email: string;
  role: OrganizationRole;
  status: InvitationStatus;
  expiresAt: string | Date;
};

export function PendingInvitations({
  organizationId,
  invitations,
}: {
  organizationId: string;
  invitations: InvitationRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Done");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending invitations ({invitations.length})</CardTitle>
        <CardDescription>Invitations that haven&apos;t been accepted yet.</CardDescription>
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <p className="text-muted-foreground text-sm">No pending invitations.</p>
        ) : (
          <div className="flex flex-col divide-y">
            {invitations.map((invitation) => {
              const display = invitationDisplayStatus({
                status: invitation.status,
                expiresAt: new Date(invitation.expiresAt),
              });
              const isExpired = display === "expired";
              return (
                <div
                  key={invitation.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{invitation.email}</p>
                    <p className="text-muted-foreground text-sm">
                      {invitation.role} ·{" "}
                      <span className={cn(isExpired && "text-destructive")}>
                        {isExpired
                          ? `expired ${formatDate(invitation.expiresAt)}`
                          : `expires ${formatDate(invitation.expiresAt)}`}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(() => resendInvitationAction(organizationId, invitation.id))
                      }
                    >
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(() => revokeInvitationAction(organizationId, invitation.id))
                      }
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
