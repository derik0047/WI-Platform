import { MainNav } from "@/components/layout/main-nav";
import {
  OrganizationSwitcher,
  type OrganizationOption,
} from "@/components/organizations/organization-switcher";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

/** Authenticated app layout: sidebar nav + header (org switcher + sign-out) + main. */
export function AppShell({
  userEmail,
  organizations,
  activeOrgId,
  children,
}: {
  userEmail?: string;
  organizations: OrganizationOption[];
  activeOrgId: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border hidden w-60 shrink-0 flex-col border-r md:flex">
        <div className="flex h-14 items-center border-b px-4 font-semibold">{siteConfig.name}</div>
        <div className="flex-1 p-3">
          <MainNav />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b px-4">
          <OrganizationSwitcher organizations={organizations} activeId={activeOrgId} />
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden text-sm sm:inline">{userEmail}</span>
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
