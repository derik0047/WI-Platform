import type { Metadata } from "next";

import { CreateOrganizationForm } from "@/components/organizations/create-organization-form";

export const metadata: Metadata = {
  title: "New organization",
};

export default function NewOrganizationPage() {
  return (
    <div className="flex flex-col items-center gap-6 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Create an organization</h1>
        <p className="text-muted-foreground text-sm">Set up a workspace to get started.</p>
      </div>
      <CreateOrganizationForm />
    </div>
  );
}
