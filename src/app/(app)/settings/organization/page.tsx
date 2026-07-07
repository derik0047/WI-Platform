import type { Metadata } from "next";

import { OrganizationSettingsForm } from "@/components/organizations/organization-settings-form";
import { requireActiveOrganization } from "@/lib/auth/org";

export const metadata: Metadata = {
  title: "Organization settings",
};

export default async function OrganizationSettingsPage() {
  const { organization } = await requireActiveOrganization();
  const canManage = organization.role === "owner" || organization.role === "admin";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization settings</h1>
        <p className="text-muted-foreground text-sm">{organization.name}</p>
      </div>
      <OrganizationSettingsForm
        organizationId={organization.id}
        defaultValues={{ name: organization.name, slug: organization.slug }}
        canManage={canManage}
      />
    </div>
  );
}
