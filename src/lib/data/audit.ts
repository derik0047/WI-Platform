import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { auditLog, type AuditAction, type AuditLogEntry } from "@/lib/db/schema";
import { requireOrgManager } from "@/lib/data/organizations";

/**
 * The append-only membership audit trail. Writes happen inside the same
 * transaction as the action they record, so an action and its audit entry commit
 * together (see `recordAuditEvent`). Reads are org-scoped and manager-only.
 */

/** A Drizzle transaction handle (same query surface as `db`). */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type AuditEventInput = {
  organizationId: string;
  action: AuditAction;
  actor: { id: string; email: string };
  targetEmail?: string | null;
  metadata?: Record<string, unknown>;
};

/** Record a membership action. MUST be called inside the action's transaction. */
export async function recordAuditEvent(tx: Tx, event: AuditEventInput): Promise<void> {
  await tx.insert(auditLog).values({
    organizationId: event.organizationId,
    action: event.action,
    actorId: event.actor.id,
    actorEmail: event.actor.email,
    targetEmail: event.targetEmail ?? null,
    metadata: event.metadata ?? {},
  });
}

/** Most recent audit entries for an organization (owners/admins only). */
export async function listAuditLog(
  userId: string,
  organizationId: string,
  limit = 100,
): Promise<AuditLogEntry[]> {
  await requireOrgManager(userId, organizationId);
  return db
    .select()
    .from(auditLog)
    .where(eq(auditLog.organizationId, organizationId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}
