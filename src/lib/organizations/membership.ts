import type { OrganizationRole } from "@/lib/db/schema";

/**
 * Pure authorization decisions for membership management. The data layer enforces
 * these (isolation + role checks) and the UI reuses them to show/hide controls,
 * so the rules live in exactly one place.
 *
 * Invariant: an organization has exactly one `owner` at all times. Ownership only
 * moves via `transferOwnership`; role changes and removals never touch the owner.
 */

/** Roles allowed to manage members and invitations. */
export const MANAGER_ROLES: readonly OrganizationRole[] = ["owner", "admin"];

/** Roles that can be assigned via invite/role-change (ownership is separate). */
export const ASSIGNABLE_ROLES: readonly OrganizationRole[] = ["admin", "member"];

export type MemberRef = { userId: string; role: OrganizationRole };

export function isManagerRole(role: OrganizationRole): boolean {
  return role === "owner" || role === "admin";
}

/** Managers may change any non-owner member's role, but not their own. */
export function canChangeMemberRole(actor: MemberRef, target: MemberRef): boolean {
  if (!isManagerRole(actor.role)) return false;
  if (target.role === "owner") return false;
  if (actor.userId === target.userId) return false;
  return true;
}

/**
 * A manager may remove any non-owner member; any non-owner may remove
 * themselves (leave). The owner cannot be removed — transfer ownership first.
 */
export function canRemoveMember(actor: MemberRef, target: MemberRef): boolean {
  if (target.role === "owner") return false;
  if (actor.userId === target.userId) return true;
  return isManagerRole(actor.role);
}

/** Only the current owner may transfer ownership. */
export function canTransferOwnership(actor: MemberRef): boolean {
  return actor.role === "owner";
}

/** Managers may invite, revoke and resend invitations. */
export function canManageInvitations(role: OrganizationRole): boolean {
  return isManagerRole(role);
}
