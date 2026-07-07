import "server-only";

import { and, eq, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  organizationMembers,
  organizations,
  profiles,
  type Organization,
  type OrganizationMember,
  type OrganizationRole,
} from "@/lib/db/schema";
import { AppError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { isManagerRole } from "@/lib/organizations/membership";
import { resolveUniqueSlug } from "@/lib/organizations/slug";
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from "@/lib/validations/organization";

/**
 * Org-scoped data access. This is the ONLY place organization rows are read or
 * written; every function that exposes org data requires a validated membership,
 * which is how multi-tenant isolation is enforced over Drizzle's privileged
 * connection (RLS does not apply to it). Product tables must follow the same rule.
 */

/** The acting user (subset of the Supabase user needed to own/join an org). */
export type OrgActor = { id: string; email: string; fullName?: string | null };

/** Build an OrgActor from the authenticated Supabase user. */
export function toOrgActor(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): OrgActor {
  if (!user.email) {
    throw new ValidationError("A verified email is required to own an organization");
  }
  const fullName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;
  return { id: user.id, email: user.email, fullName };
}

export type OrganizationWithRole = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: Date;
  role: OrganizationRole;
};

/** Is a slug already used (optionally excluding one organization for updates)? */
export async function isSlugTaken(slug: string, exceptOrganizationId?: string): Promise<boolean> {
  const rows = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(
      exceptOrganizationId
        ? and(eq(organizations.slug, slug), ne(organizations.id, exceptOrganizationId))
        : eq(organizations.slug, slug),
    )
    .limit(1);
  return rows.length > 0;
}

/** Create an organization; the actor becomes its owner. Atomic. */
export async function createOrganization(
  actor: OrgActor,
  input: CreateOrganizationInput,
): Promise<Organization> {
  const name = input.name.trim();
  const slug = await resolveUniqueSlug(name, (candidate) => isSlugTaken(candidate));

  return db.transaction(async (tx) => {
    // Ensure the owner's profile exists (until a Supabase signup trigger owns this).
    await tx
      .insert(profiles)
      .values({ id: actor.id, email: actor.email, fullName: actor.fullName ?? null })
      .onConflictDoUpdate({
        target: profiles.id,
        set: { email: actor.email, fullName: actor.fullName ?? null, updatedAt: new Date() },
      });

    const [organization] = await tx
      .insert(organizations)
      .values({ name, slug, ownerId: actor.id })
      .returning();

    if (!organization) {
      throw new AppError("INTERNAL", "Failed to create organization");
    }

    await tx.insert(organizationMembers).values({
      organizationId: organization.id,
      userId: actor.id,
      role: "owner",
    });

    return organization;
  });
}

/** Organizations the user belongs to, with the user's role in each. */
export async function listOrganizationsForUser(userId: string): Promise<OrganizationWithRole[]> {
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      ownerId: organizations.ownerId,
      createdAt: organizations.createdAt,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(eq(organizationMembers.userId, userId))
    .orderBy(organizations.createdAt);
}

/** The user's membership in an organization, or null. */
export async function getMembership(
  userId: string,
  organizationId: string,
): Promise<OrganizationMember | null> {
  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, organizationId),
      ),
    )
    .limit(1);
  return membership ?? null;
}

/** Require the user to be a member; throws ForbiddenError otherwise. */
export async function requireMembership(
  userId: string,
  organizationId: string,
): Promise<OrganizationMember> {
  const membership = await getMembership(userId, organizationId);
  if (!membership) {
    throw new ForbiddenError("You are not a member of this organization");
  }
  return membership;
}

/** Require the user to be an owner or admin; throws otherwise. */
export async function requireOrgManager(
  userId: string,
  organizationId: string,
): Promise<OrganizationMember> {
  const membership = await requireMembership(userId, organizationId);
  if (!isManagerRole(membership.role)) {
    throw new ForbiddenError("Only owners and admins can perform this action");
  }
  return membership;
}

export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);
  return organization ?? null;
}

export async function getOrganizationById(organizationId: string): Promise<Organization | null> {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  return organization ?? null;
}

/** Update an organization's name/slug. Owners and admins only. */
export async function updateOrganization(
  userId: string,
  organizationId: string,
  input: UpdateOrganizationInput,
): Promise<Organization> {
  const membership = await requireMembership(userId, organizationId);
  if (!isManagerRole(membership.role)) {
    throw new ForbiddenError("Only owners and admins can update the organization");
  }

  if (await isSlugTaken(input.slug, organizationId)) {
    throw new AppError("CONFLICT", "That slug is already taken");
  }

  const [organization] = await db
    .update(organizations)
    .set({ name: input.name.trim(), slug: input.slug, updatedAt: new Date() })
    .where(eq(organizations.id, organizationId))
    .returning();

  if (!organization) {
    throw new NotFoundError("Organization not found");
  }
  return organization;
}
