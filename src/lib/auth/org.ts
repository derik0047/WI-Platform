import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { User } from "@supabase/supabase-js";

import { requireUser } from "@/lib/auth";
import { listOrganizationsForUser, type OrganizationWithRole } from "@/lib/data/organizations";
import { resolveActiveOrganization } from "@/lib/organizations/active";

export const ACTIVE_ORG_COOKIE = "wi_active_org";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export type OrganizationContext = {
  organizations: OrganizationWithRole[];
  active: OrganizationWithRole | null;
};

async function getActiveOrgIdFromCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACTIVE_ORG_COOKIE)?.value ?? null;
}

/** The user's organizations and their resolved active organization. */
export async function getOrganizationContext(userId: string): Promise<OrganizationContext> {
  const [organizations, activeId] = await Promise.all([
    listOrganizationsForUser(userId),
    getActiveOrgIdFromCookie(),
  ]);
  return { organizations, active: resolveActiveOrganization(organizations, activeId) };
}

/** Persist the active organization for the current user (validate membership first). */
export async function setActiveOrganizationCookie(organizationId: string): Promise<void> {
  const store = await cookies();
  store.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
  });
}

/**
 * Require an authenticated user with an active organization. Redirects to
 * /organizations/new when the user has no organizations yet.
 */
export async function requireActiveOrganization(): Promise<{
  user: User;
  organization: OrganizationWithRole;
}> {
  const user = await requireUser();
  const { active } = await getOrganizationContext(user.id);
  if (!active) redirect("/organizations/new");
  return { user, organization: active };
}
