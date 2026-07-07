"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { acceptInvitationAction, rejectInvitationAction } from "@/app/invitations/actions";
import { Button } from "@/components/ui/button";

export function InvitationActions({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();

  function accept() {
    startTransition(async () => {
      // On success this redirects, so control only returns here on failure.
      const result = await acceptInvitationAction(token);
      if (!result.ok) toast.error(result.error);
    });
  }

  function reject() {
    startTransition(async () => {
      const result = await rejectInvitationAction(token);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Invitation declined");
    });
  }

  return (
    <div className="flex gap-3">
      <Button onClick={accept} disabled={pending}>
        {pending ? "Working…" : "Accept invitation"}
      </Button>
      <Button variant="outline" onClick={reject} disabled={pending}>
        Decline
      </Button>
    </div>
  );
}
