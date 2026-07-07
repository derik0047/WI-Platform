"use server";

import { revalidatePath } from "next/cache";

import { type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { createInvitation, resendInvitation, revokeInvitation } from "@/lib/data/invitations";
import { changeMemberRole, removeMember, transferOwnership } from "@/lib/data/members";
import { getOrganizationById, toOrgActor } from "@/lib/data/organizations";
import { toAppError } from "@/lib/errors";
import { sendInvitationEmail } from "@/lib/email/invitations";
import {
  changeMemberRoleSchema,
  invitationIdSchema,
  inviteMemberSchema,
  memberIdSchema,
  transferOwnershipSchema,
} from "@/lib/validations/membership";
import { firstIssueMessage } from "@/lib/zod";

const MEMBERS_PATH = "/settings/members";

/** Invite a member by email and send the invitation email (owner/admin only). */
export async function inviteMemberAction(
  organizationId: string,
  raw: unknown,
): Promise<ActionResult> {
  const parsed = inviteMemberSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };

  try {
    const user = await requireUser();
    const actor = toOrgActor(user);
    const invitation = await createInvitation(actor, organizationId, parsed.data);
    const organization = await getOrganizationById(organizationId);
    const sent = await sendInvitationEmail({
      to: invitation.email,
      organizationName: organization?.name ?? "your organization",
      invitedByEmail: actor.email,
      role: invitation.role,
      token: invitation.token,
    });

    revalidatePath(MEMBERS_PATH);
    return {
      ok: true,
      message: sent
        ? `Invitation sent to ${invitation.email}`
        : "Invitation created, but the email could not be sent — you can resend it",
    };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

/** Revoke a pending invitation (owner/admin only). */
export async function revokeInvitationAction(
  organizationId: string,
  invitationId: string,
): Promise<ActionResult> {
  const parsed = invitationIdSchema.safeParse({ invitationId });
  if (!parsed.success) return { ok: false, error: "Invalid invitation" };

  try {
    const user = await requireUser();
    await revokeInvitation(toOrgActor(user), organizationId, parsed.data.invitationId);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidatePath(MEMBERS_PATH);
  return { ok: true, message: "Invitation revoked" };
}

/** Resend a pending invitation, refreshing its expiry (owner/admin only). */
export async function resendInvitationAction(
  organizationId: string,
  invitationId: string,
): Promise<ActionResult> {
  const parsed = invitationIdSchema.safeParse({ invitationId });
  if (!parsed.success) return { ok: false, error: "Invalid invitation" };

  try {
    const user = await requireUser();
    const actor = toOrgActor(user);
    const invitation = await resendInvitation(actor, organizationId, parsed.data.invitationId);
    const sent = await sendInvitationEmail({
      to: invitation.email,
      organizationName: invitation.organizationName,
      invitedByEmail: actor.email,
      role: invitation.role,
      token: invitation.token,
    });

    revalidatePath(MEMBERS_PATH);
    return {
      ok: true,
      message: sent ? "Invitation resent" : "Expiry refreshed, but the email could not be sent",
    };
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }
}

/** Change a member's role (owner/admin only). */
export async function changeMemberRoleAction(
  organizationId: string,
  raw: unknown,
): Promise<ActionResult> {
  const parsed = changeMemberRoleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };

  try {
    const user = await requireUser();
    await changeMemberRole(toOrgActor(user), organizationId, parsed.data);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidatePath(MEMBERS_PATH);
  revalidatePath("/", "layout");
  return { ok: true, message: "Role updated" };
}

/** Remove a member (owner/admin removes others; a member may remove themselves). */
export async function removeMemberAction(
  organizationId: string,
  userId: string,
): Promise<ActionResult> {
  const parsed = memberIdSchema.safeParse({ userId });
  if (!parsed.success) return { ok: false, error: "Invalid member" };

  try {
    const user = await requireUser();
    await removeMember(toOrgActor(user), organizationId, parsed.data.userId);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidatePath(MEMBERS_PATH);
  revalidatePath("/", "layout");
  return { ok: true, message: "Member removed" };
}

/** Transfer organization ownership to another member (current owner only). */
export async function transferOwnershipAction(
  organizationId: string,
  raw: unknown,
): Promise<ActionResult> {
  const parsed = transferOwnershipSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };

  try {
    const user = await requireUser();
    await transferOwnership(toOrgActor(user), organizationId, parsed.data);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidatePath(MEMBERS_PATH);
  revalidatePath("/", "layout");
  return { ok: true, message: "Ownership transferred" };
}
