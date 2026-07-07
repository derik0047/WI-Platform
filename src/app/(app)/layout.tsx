import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";
import { getOrganizationContext } from "@/lib/auth/org";

/**
 * Protected layout: requires a session (defence in depth with the middleware)
 * and resolves the user's organizations + active organization for the shell.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { organizations, active } = await getOrganizationContext(user.id);

  return (
    <AppShell
      userEmail={user.email}
      organizations={organizations.map((org) => ({ id: org.id, name: org.name, slug: org.slug }))}
      activeOrgId={active?.id ?? null}
    >
      {children}
    </AppShell>
  );
}
