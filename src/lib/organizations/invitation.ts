import type { InvitationStatus } from "@/lib/db/schema";

/** How long an invitation stays valid after it is created. */
export const INVITATION_TTL_DAYS = 7;

/** Display status including the derived (not stored) "expired" state. */
export type InvitationDisplayStatus = InvitationStatus | "expired";

/** True when a pending invitation's validity window has elapsed. */
export function isInvitationExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return now.getTime() > expiresAt.getTime();
}

/**
 * Resolve the status shown to users: a `pending` invitation past its expiry is
 * reported as `expired`. Settled invitations keep their stored status.
 */
export function invitationDisplayStatus(
  invitation: { status: InvitationStatus; expiresAt: Date },
  now: Date = new Date(),
): InvitationDisplayStatus {
  if (invitation.status === "pending" && isInvitationExpired(invitation.expiresAt, now)) {
    return "expired";
  }
  return invitation.status;
}

/** An invitation can be accepted/rejected only while pending and unexpired. */
export function isInvitationActionable(
  invitation: { status: InvitationStatus; expiresAt: Date },
  now: Date = new Date(),
): boolean {
  return invitation.status === "pending" && !isInvitationExpired(invitation.expiresAt, now);
}

/** Compute an invitation expiry from a creation time (pure; injectable clock). */
export function invitationExpiryFrom(now: Date): Date {
  return new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
}
