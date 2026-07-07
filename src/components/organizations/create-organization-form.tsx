"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createOrganizationAction } from "@/app/(app)/organizations/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createOrganizationSchema,
  type CreateOrganizationInput,
} from "@/lib/validations/organization";

export function CreateOrganizationForm() {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { name: "" },
  });

  function onSubmit(values: CreateOrganizationInput) {
    startTransition(async () => {
      // On success the action redirects; only failures return here.
      const result = await createOrganizationAction(values);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create organization</CardTitle>
        <CardDescription>
          Organizations are separate workspaces. You&apos;ll be the owner.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Acme Inc." autoFocus {...register("name")} />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create organization"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
