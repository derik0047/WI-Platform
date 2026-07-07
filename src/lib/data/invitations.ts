import "server-only";

import { randomBytes } from "node:crypto";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  invitations,
  organizationMembers,
  organizations,
  profiles,
  type Invitation,
} from "@/lib/db/schema";
import { recordAuditEvent } from "@/lib/data/audit";
import { requireOrgManager, type OrgActor } from "@/lib/data/organizations";
import { AppError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { invitationExpiryFrom, isInvitationActionable } from "@/lib/organizations/invitation";
import type { InviteMemberInput } from "@/lib/validations/membership";

/**
 * Invitation data access. Management operations (create/list/revoke/resend) are
 * owner/admin only and org-scoped. Accept/reject are performed by the invitee and
 * are authorized by matching the authenticated user's email to the invitation —
 * the token alone is never sufficient to join. Mutations run in a transaction
 * with their audit entry.
 */

export type MemberActor = { id: string; email: string };
export type InvitationWithOrg = Invitation & {
  organizationName: string;
  organizationSlug: string;
};

/** Opaque, URL-safe secret embedded in the invitation link. */
function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Is this email already a member of the organization? */
async function isEmailMember(organizationId: string, email: string): Promise<boolean> {
  const [row] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .innerJoin(profiles, eq(profiles.id, organizationMembers.userId))
    .where(and(eq(organizationMembers.organizationId, organizationId), eq(profiles.email, email)))
    .limit(1);
  return Boolean(row);
}

/** Live (pending, unexpired) invitation for this email, if any. */
async function findLivePendingInvitation(
  organizationId: string,
  email: string,
): Promise<Invitation | null> {
  const [row] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.organizationId, organizationId),
        eq(invitations.email, email),
        eq(invitations.status, "pending"),
      ),
    )
    .orderBy(desc(invitations.createdAt))
    .limit(1);
  if (!row) return null;
  return isInvitationActionable(row) ? row : null;
}

/** Invite a member by email (owner/admin only). Returns the created invitation. */
export async function createInvitation(
  actor: MemberActor,
  organizationId: string,
  input: InviteMemberInput,
): Promise<Invitation> {
  await requireOrgManager(actor.id, organizationId);
  const email = input.email.trim().toLowerCase();

  if (await isEmailMember(organizationId, email)) {
    throw new AppError("CONFLICT", "That person is already a member");
  }
  if (await findLivePendingInvitation(organizationId, email)) {
    throw new AppError("CONFLICT", "There is already a pending invitation for that email");
  }

  const token = generateInvitationToken();
  const expiresAt = invitationExpiryFrom(new Date());

  return db.transaction(async (tx) => {
    const [invitation] = await tx
      .insert(invitations)
      .values({
        organizationId,
        email,
        role: input.role,
        token,
        invitedByUserId: actor.id,
        expiresAt,
      })
      .returning();

    if (!invitation) {
      throw new AppError("INTERNAL", "Failed to create invitation");
    }

    await recordAuditEvent(tx, {
      organizationId,
      action: "member.invited",
      actor,
      targetEmail: email,
      metadata: { role: input.role },
    });

    return invitation;
  });
}

/** Outstanding (pending) invitations for an organization (owners/admins only). */
export async function listPendingInvitations(
  userId: string,
  organizationId: string,
): Promise<Invitation[]> {
  await requireOrgManager(userId, organizationId);
  return db
    .select()
    .from(invitations)
    .where(and(eq(invitations.organizationId, organizationId), eq(invitations.status, "pending")))
    .orderBy(desc(invitations.createdAt));
}

/** Look up an invitation by its token, joined with the organization it targets. */
export async function getInvitationByToken(token: string): Promise<InvitationWithOrg | null> {
  const [row] = await db
    .select({
      invitation: invitations,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
    })
    .from(invitations)
    .innerJoin(organizations, eq(organizations.id, invitations.organizationId))
    .where(eq(invitations.token, token))
    .limit(1);
  if (!row) return null;
  return {
    ...row.invitation,
    organizationName: row.organizationName,
    organizationSlug: row.organizationSlug,
  };
}

/** Ensure the invitee has a profile row (they may be joining for the first time). */
async function ensureProfile(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  actor: OrgActor,
) {
  await tx
    .insert(profiles)
    .values({ id: actor.id, email: actor.email, fullName: actor.fullName ?? null })
    .onConflictDoUpdate({
      target: profiles.id,
      set: { email: actor.email, updatedAt: new Date() },
    });
}

/** Load an actionable invitation for this actor by token, or throw. */
async function requireActionableInvitationForActor(
  actor: OrgActor,
  token: string,
): Promise<InvitationWithOrg> {
  const invitation = await getInvitationByToken(token);
  if (!invitation) throw new NotFoundError("Invitation not found");
  if (!isInvitationActionable(invitation)) {
    throw new ValidationError("This invitation is no longer valid");
  }
  if (invitation.email !== actor.email.trim().toLowerCase()) {
    throw new ForbiddenError("This invitation was sent to a different email address");
  }
  return invitation;
}

/** Accept an invitation: the actor joins the organization at the invited role. */
export async function acceptInvitation(
  actor: OrgActor,
  token: string,
): Promise<{ organizationId: string; organizationSlug: string }> {
  const invitation = await requireActionableInvitationForActor(actor, token);

  await db.transaction(async (tx) => {
    await ensureProfile(tx, actor);
    await tx
      .insert(organizationMembers)
      .values({
        organizationId: invitation.organizationId,
        userId: actor.id,
        role: invitation.role,
      })
      .onConflictDoNothing({
        target: [organizationMembers.organizationId, organizationMembers.userId],
      });
    await tx
      .update(invitations)
      .set({ status: "accepted", respondedByUserId: actor.id, updatedAt: new Date() })
      .where(eq(invitations.id, invitation.id));
    await recordAuditEvent(tx, {
      organizationId: invitation.organizationId,
      action: "invitation.accepted",
      actor,
      targetEmail: invitation.email,
      metadata: { role: invitation.role },
    });
  });

  return {
    organizationId: invitation.organizationId,
    organizationSlug: invitation.organizationSlug,
  };
}

/** Reject an invitation: the invitee declines. */
export async function rejectInvitation(actor: OrgActor, token: string): Promise<void> {
  const invitation = await requireActionableInvitationForActor(actor, token);

  await db.transaction(async (tx) => {
    await ensureProfile(tx, actor);
    await tx
      .update(invitations)
      .set({ status: "rejected", respondedByUserId: actor.id, updatedAt: new Date() })
      .where(eq(invitations.id, invitation.id));
    await recordAuditEvent(tx, {
      organizationId: invitation.organizationId,
      action: "invitation.rejected",
      actor,
      targetEmail: invitation.email,
    });
  });
}

/** A pending invitation owned by this organization, or throw. */
async function requirePendingInvitation(
  organizationId: string,
  invitationId: string,
): Promise<Invitation> {
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.id, invitationId), eq(invitations.organizationId, organizationId)))
    .limit(1);
  if (!invitation) throw new NotFoundError("Invitation not found");
  if (invitation.status !== "pending") {
    throw new ValidationError("Only pending invitations can be modified");
  }
  return invitation;
}

/** Revoke a pending invitation (owner/admin only). */
export async function revokeInvitation(
  actor: MemberActor,
  organizationId: string,
  invitationId: string,
): Promise<void> {
  await requireOrgManager(actor.id, organizationId);
  const invitation = await requirePendingInvitation(organizationId, invitationId);

  await db.transaction(async (tx) => {
    await tx
      .update(invitations)
      .set({ status: "revoked", respondedByUserId: actor.id, updatedAt: new Date() })
      .where(eq(invitations.id, invitation.id));
    await recordAuditEvent(tx, {
      organizationId,
      action: "invitation.revoked",
      actor,
      targetEmail: invitation.email,
    });
  });
}

/**
 * Resend a pending invitation: refreshes its expiry (re-validating a lapsed one)
 * and records the event. Returns the invitation so the caller can email it.
 */
export async function resendInvitation(
  actor: MemberActor,
  organizationId: string,
  invitationId: string,
): Promise<InvitationWithOrg> {
  await requireOrgManager(actor.id, organizationId);
  const invitation = await requirePendingInvitation(organizationId, invitationId);
  const expiresAt = invitationExpiryFrom(new Date());

  await db.transaction(async (tx) => {
    await tx
      .update(invitations)
      .set({ expiresAt, updatedAt: new Date() })
      .where(eq(invitations.id, invitation.id));
    await recordAuditEvent(tx, {
      organizationId,
      action: "invitation.resent",
      actor,
      targetEmail: invitation.email,
    });
  });

  const refreshed = await getInvitationByToken(invitation.token);
  if (!refreshed) throw new AppError("INTERNAL", "Failed to reload invitation");
  return refreshed;
}
