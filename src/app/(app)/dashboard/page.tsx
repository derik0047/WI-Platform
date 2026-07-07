import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Foundation shell — product features are added on top of this.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Platform ready</CardTitle>
          <CardDescription>
            Auth, data, UI, navigation, error handling and logging are wired.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          This protected page renders only for an authenticated user.
        </CardContent>
      </Card>
    </div>
  );
}
