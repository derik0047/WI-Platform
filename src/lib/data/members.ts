import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  organizationMembers,
  organizations,
  profiles,
  type OrganizationRole,
} from "@/lib/db/schema";
import { recordAuditEvent } from "@/lib/data/audit";
import { requireMembership, requireOrgManager } from "@/lib/data/organizations";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  canChangeMemberRole,
  canRemoveMember,
  canTransferOwnership,
} from "@/lib/organizations/membership";
import type { ChangeMemberRoleInput, TransferOwnershipInput } from "@/lib/validations/membership";

/**
 * Member management data access. Like the rest of the data layer, every function
 * validates the actor's membership/role before touching a row — this is where
 * multi-tenant isolation is enforced. Mutations run in a transaction alongside
 * their audit entry so the change and its record commit together.
 */

/** The acting user (owner/admin/member) — id + email for authz and audit. */
export type MemberActor = { id: string; email: string };

export type OrganizationMemberSummary = {
  userId: string;
  email: string;
  fullName: string | null;
  role: OrganizationRole;
  joinedAt: Date;
  isOwner: boolean;
};

/** A single member joined with their profile, or null if not a member. */
async function getMemberWithProfile(
  organizationId: string,
  userId: string,
): Promise<Omit<OrganizationMemberSummary, "isOwner"> | null> {
  const [row] = await db
    .select({
      userId: organizationMembers.userId,
      email: profiles.email,
      fullName: profiles.fullName,
      role: organizationMembers.role,
      joinedAt: organizationMembers.createdAt,
    })
    .from(organizationMembers)
    .innerJoin(profiles, eq(profiles.id, organizationMembers.userId))
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** All members of an organization (any member may view). */
export async function listMembers(
  userId: string,
  organizationId: string,
): Promise<OrganizationMemberSummary[]> {
  await requireMembership(userId, organizationId);
  const rows = await db
    .select({
      userId: organizationMembers.userId,
      email: profiles.email,
      fullName: profiles.fullName,
      role: organizationMembers.role,
      joinedAt: organizationMembers.createdAt,
    })
    .from(organizationMembers)
    .innerJoin(profiles, eq(profiles.id, organizationMembers.userId))
    .where(eq(organizationMembers.organizationId, organizationId))
    .orderBy(organizationMembers.createdAt);
  return rows.map((row) => ({ ...row, isOwner: row.role === "owner" }));
}

/** Change a member's role (owner/admin only; never the owner's role). */
export async function changeMemberRole(
  actor: MemberActor,
  organizationId: string,
  input: ChangeMemberRoleInput,
): Promise<void> {
  const actorMembership = await requireOrgManager(actor.id, organizationId);
  const target = await getMemberWithProfile(organizationId, input.userId);
  if (!target) throw new NotFoundError("Member not found");

  if (
    !canChangeMemberRole(
      { userId: actor.id, role: actorMembership.role },
      { userId: target.userId, role: target.role },
    )
  ) {
    throw new ForbiddenError("You cannot change this member's role");
  }

  if (target.role === input.role) return; // already at the requested role

  await db.transaction(async (tx) => {
    await tx
      .update(organizationMembers)
      .set({ role: input.role })
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, input.userId),
        ),
      );
    await recordAuditEvent(tx, {
      organizationId,
      action: "member.role_changed",
      actor,
      targetEmail: target.email,
      metadata: { from: target.role, to: input.role },
    });
  });
}

/** Remove a member (owner/admin removes others; anyone may remove themselves). */
export async function removeMember(
  actor: MemberActor,
  organizationId: string,
  targetUserId: string,
): Promise<void> {
  const actorMembership = await requireMembership(actor.id, organizationId);
  const target = await getMemberWithProfile(organizationId, targetUserId);
  if (!target) throw new NotFoundError("Member not found");

  if (
    !canRemoveMember(
      { userId: actor.id, role: actorMembership.role },
      { userId: target.userId, role: target.role },
    )
  ) {
    throw new ForbiddenError("You cannot remove this member");
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, targetUserId),
        ),
      );
    await recordAuditEvent(tx, {
      organizationId,
      action: "member.removed",
      actor,
      targetEmail: target.email,
      metadata: { role: target.role, self: actor.id === targetUserId },
    });
  });
}

/**
 * Transfer ownership to another member. Only the current owner may do this; the
 * former owner becomes an admin. Atomic, preserving the one-owner invariant.
 */
export async function transferOwnership(
  actor: MemberActor,
  organizationId: string,
  input: TransferOwnershipInput,
): Promise<void> {
  const actorMembership = await requireMembership(actor.id, organizationId);
  if (!canTransferOwnership({ userId: actor.id, role: actorMembership.role })) {
    throw new ForbiddenError("Only the owner can transfer ownership");
  }
  if (input.userId === actor.id) {
    throw new ValidationError("You already own this organization");
  }

  const target = await getMemberWithProfile(organizationId, input.userId);
  if (!target) throw new NotFoundError("The new owner must be an existing member");

  await db.transaction(async (tx) => {
    await tx
      .update(organizationMembers)
      .set({ role: "admin" })
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, actor.id),
        ),
      );
    await tx
      .update(organizationMembers)
      .set({ role: "owner" })
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, input.userId),
        ),
      );
    await tx
      .update(organizations)
      .set({ ownerId: input.userId, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId));
    await recordAuditEvent(tx, {
      organizationId,
      action: "ownership.transferred",
      actor,
      targetEmail: target.email,
      metadata: { from: actor.email, to: target.email },
    });
  });
}
