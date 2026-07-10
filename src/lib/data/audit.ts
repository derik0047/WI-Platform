import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { auditLog, type AuditAction, type AuditLogEntry } from "@/lib/db/schema";
import { requireMembership, requireOrgManager } from "@/lib/data/organizations";

/**
 * The append-only, org-scoped audit trail (membership + invoices). Writes happen
 * inside the same transaction as the action they record, so an action and its
 * audit entry commit together (see `recordAuditEvent`). Reads are org-scoped.
 */

/** A Drizzle transaction handle (same query surface as `db`). */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type AuditEventInput = {
  organizationId: string;
  action: AuditAction;
  actor: { id: string; email: string };
  targetEmail?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
};

/** Membership actions, used to keep the members/audit view membership-only. */
const MEMBERSHIP_ACTIONS: AuditAction[] = [
  "member.invited",
  "invitation.accepted",
  "invitation.rejected",
  "invitation.revoked",
  "invitation.resent",
  "member.role_changed",
  "member.removed",
  "ownership.transferred",
];

/** Record an audit event. MUST be called inside the action's transaction. */
export async function recordAuditEvent(tx: Tx, event: AuditEventInput): Promise<void> {
  await tx.insert(auditLog).values({
    organizationId: event.organizationId,
    action: event.action,
    actorId: event.actor.id,
    actorEmail: event.actor.email,
    targetEmail: event.targetEmail ?? null,
    targetType: event.targetType ?? null,
    targetId: event.targetId ?? null,
    metadata: event.metadata ?? {},
  });
}

/** Most recent membership audit entries for an organization (owners/admins only). */
export async function listAuditLog(
  userId: string,
  organizationId: string,
  limit = 100,
): Promise<AuditLogEntry[]> {
  await requireOrgManager(userId, organizationId);
  return db
    .select()
    .from(auditLog)
    .where(
      and(
        eq(auditLog.organizationId, organizationId),
        inArray(auditLog.action, MEMBERSHIP_ACTIONS),
      ),
    )
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

/** Audit trail for a specific entity (e.g. an invoice). Any member may view. */
export async function listAuditForTarget(
  userId: string,
  organizationId: string,
  targetType: string,
  targetId: string,
  limit = 50,
): Promise<AuditLogEntry[]> {
  await requireMembership(userId, organizationId);
  return db
    .select()
    .from(auditLog)
    .where(
      and(
        eq(auditLog.organizationId, organizationId),
        eq(auditLog.targetType, targetType),
        eq(auditLog.targetId, targetId),
      ),
    )
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}
