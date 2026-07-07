"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { inviteMemberAction } from "@/app/(app)/settings/members/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteMemberSchema, type InviteMemberInput } from "@/lib/validations/membership";

export function InviteMemberForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: "", role: "member" },
  });

  function onSubmit(values: InviteMemberInput) {
    startTransition(async () => {
      const result = await inviteMemberAction(organizationId, values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Invitation sent");
      reset({ email: "", role: "member" });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite a member</CardTitle>
        <CardDescription>They&apos;ll receive an email to accept or decline.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 sm:flex-row sm:items-end"
        >
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="teammate@example.com"
              disabled={pending}
              {...register("email")}
            />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              disabled={pending}
              className="border-input dark:bg-input/30 focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
              {...register("role")}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send invite"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
