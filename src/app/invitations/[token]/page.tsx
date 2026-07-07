import type { Metadata } from "next";
import Link from "next/link";

import { InvitationActions } from "@/components/invitations/invitation-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getInvitationByToken } from "@/lib/data/invitations";
import { isInvitationActionable } from "@/lib/organizations/invitation";

export const metadata: Metadata = {
  title: "Invitation",
};

type PageProps = { params: Promise<{ token: string }> };

export default async function InvitationPage({ params }: PageProps) {
  const { token } = await params;
  const user = await requireUser();
  const invitation = await getInvitationByToken(token);

  const userEmail = user.email?.toLowerCase() ?? "";
  const notFound = !invitation;
  const expired = invitation ? !isInvitationActionable(invitation) : false;
  const wrongAccount = invitation ? invitation.email !== userEmail : false;
  const canRespond = Boolean(invitation) && !expired && !wrongAccount;

  return (
    <main className="mx-auto flex min-h-svh max-w-md items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            {canRespond ? `Join ${invitation!.organizationName}` : "Invitation"}
          </CardTitle>
          <CardDescription>
            {notFound && "This invitation link is invalid."}
            {expired && "This invitation has expired or has already been used."}
            {wrongAccount &&
              `This invitation was sent to ${invitation!.email}, but you're signed in as ${user.email}.`}
            {canRespond &&
              `You've been invited to join as a ${invitation!.role}. Accept to start collaborating.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canRespond ? (
            <InvitationActions token={invitation!.token} />
          ) : (
            <Button asChild variant="outline">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
