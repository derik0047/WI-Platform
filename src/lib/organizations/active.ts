/**
 * Choose the active organization from a user's memberships and the persisted
 * active-org id (pure). Prefers the persisted id when it's still a valid
 * membership, otherwise falls back to the first organization.
 */
export function resolveActiveOrganization<T extends { id: string }>(
  organizations: readonly T[],
  activeOrgId: string | null | undefined,
): T | null {
  if (organizations.length === 0) return null;

  if (activeOrgId) {
    const match = organizations.find((org) => org.id === activeOrgId);
    if (match) return match;
  }

  return organizations[0] ?? null;
}
