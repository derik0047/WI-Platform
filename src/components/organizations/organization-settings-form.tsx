"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateOrganizationAction } from "@/app/(app)/organizations/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateOrganizationSchema,
  type UpdateOrganizationInput,
} from "@/lib/validations/organization";

export function OrganizationSettingsForm({
  organizationId,
  defaultValues,
  canManage,
}: {
  organizationId: string;
  defaultValues: UpdateOrganizationInput;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateOrganizationInput>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues,
  });

  function onSubmit(values: UpdateOrganizationInput) {
    startTransition(async () => {
      const result = await updateOrganizationAction(organizationId, values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Organization updated");
      router.refresh();
    });
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>
          {canManage
            ? "Update your organization's name and URL slug."
            : "Only owners and admins can change these settings."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" disabled={!canManage || pending} {...register("name")} />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" disabled={!canManage || pending} {...register("slug")} />
            {errors.slug && <p className="text-destructive text-sm">{errors.slug.message}</p>}
          </div>
          {canManage && (
            <Button type="submit" disabled={pending} className="self-start">
              {pending ? "Saving…" : "Save changes"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
