"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import {
  changeMemberRoleAction,
  removeMemberAction,
  transferOwnershipAction,
} from "@/app/(app)/settings/members/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type ActionResult } from "@/lib/action-result";
import type { OrganizationRole } from "@/lib/db/schema";
import { formatDate } from "@/lib/format";
import {
  canChangeMemberRole,
  canRemoveMember,
  canTransferOwnership,
} from "@/lib/organizations/membership";
import { cn } from "@/lib/utils";

export type MemberRow = {
  userId: string;
  email: string;
  fullName: string | null;
  role: OrganizationRole;
  joinedAt: string | Date;
  isOwner: boolean;
};

const ROLE_LABEL: Record<OrganizationRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

function RoleBadge({ role }: { role: OrganizationRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        role === "owner" && "bg-primary text-primary-foreground",
        role === "admin" && "bg-secondary text-secondary-foreground",
        role === "member" && "bg-muted text-muted-foreground",
      )}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}

export function MembersList({
  organizationId,
  members,
  currentUserId,
  currentRole,
}: {
  organizationId: string;
  members: MemberRow[];
  currentUserId: string;
  currentRole: OrganizationRole;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const actor = { userId: currentUserId, role: currentRole };

  function run(action: () => Promise<ActionResult>, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
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
        <CardTitle>Members ({members.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        {members.map((member) => {
          const target = { userId: member.userId, role: member.role };
          const isSelf = member.userId === currentUserId;
          const canRole = canChangeMemberRole(actor, target);
          const canRemove = canRemoveMember(actor, target);
          const canTransfer = canTransferOwnership(actor) && !member.isOwner && !isSelf;
          const hasActions = canRole || canRemove || canTransfer;

          return (
            <div key={member.userId} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {member.fullName ?? member.email}
                  {isSelf && <span className="text-muted-foreground"> (you)</span>}
                </p>
                <p className="text-muted-foreground truncate text-sm">
                  {member.email} · joined {formatDate(member.joinedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <RoleBadge role={member.role} />
                {hasActions && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={pending}
                        aria-label="Member actions"
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canRole && member.role !== "admin" && (
                        <DropdownMenuItem
                          onSelect={() =>
                            run(() =>
                              changeMemberRoleAction(organizationId, {
                                userId: member.userId,
                                role: "admin",
                              }),
                            )
                          }
                        >
                          Make admin
                        </DropdownMenuItem>
                      )}
                      {canRole && member.role !== "member" && (
                        <DropdownMenuItem
                          onSelect={() =>
                            run(() =>
                              changeMemberRoleAction(organizationId, {
                                userId: member.userId,
                                role: "member",
                              }),
                            )
                          }
                        >
                          Make member
                        </DropdownMenuItem>
                      )}
                      {canTransfer && (
                        <DropdownMenuItem
                          onSelect={() =>
                            run(
                              () =>
                                transferOwnershipAction(organizationId, { userId: member.userId }),
                              `Transfer ownership to ${member.email}? You will become an admin.`,
                            )
                          }
                        >
                          Transfer ownership
                        </DropdownMenuItem>
                      )}
                      {canRemove && (
                        <>
                          {(canRole || canTransfer) && <DropdownMenuSeparator />}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() =>
                              run(
                                () => removeMemberAction(organizationId, member.userId),
                                isSelf
                                  ? "Leave this organization?"
                                  : `Remove ${member.email} from the organization?`,
                              )
                            }
                          >
                            {isSelf ? "Leave organization" : "Remove"}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
