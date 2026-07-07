import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getOrganizationContext } from "@/lib/auth/org";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const { active } = await getOrganizationContext(user.id);

  if (!active) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome</h1>
          <p className="text-muted-foreground text-sm">Create an organization to get started.</p>
        </div>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No organization yet</CardTitle>
            <CardDescription>Organizations are your isolated workspaces.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/organizations/new">Create organization</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">{active.name}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{active.name}</CardTitle>
          <CardDescription>
            You are {active.role} of this organization (/{active.slug}).
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Organization-scoped product features will render here.
        </CardContent>
      </Card>
    </div>
  );
}
