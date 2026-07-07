import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";

/**
 * Protected layout for the authenticated app. `requireUser` redirects to /login
 * when there is no session (defence in depth alongside the middleware).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell userEmail={user.email}>{children}</AppShell>;
}
