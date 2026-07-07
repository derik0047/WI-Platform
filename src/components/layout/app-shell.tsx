import { MainNav } from "@/components/layout/main-nav";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

/** Authenticated app layout: sidebar nav + header + main content. */
export function AppShell({
  userEmail,
  children,
}: {
  userEmail?: string;
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
        <header className="flex h-14 items-center justify-between border-b px-4">
          <span className="text-muted-foreground text-sm">{userEmail}</span>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
