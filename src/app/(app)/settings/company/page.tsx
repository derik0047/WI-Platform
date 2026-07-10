import type { Metadata } from "next";

import { CompanyProfileForm } from "@/components/settings/company-profile-form";
import { requireActiveOrganization } from "@/lib/auth/org";
import { getOrganizationProfile } from "@/lib/data/organization-profiles";
import { isManagerRole } from "@/lib/organizations/membership";
import type { OrganizationProfileFormValues } from "@/lib/validations/organization-profile";

export const metadata: Metadata = {
  title: "Company profile",
};

export default async function CompanyProfilePage() {
  const { user, organization } = await requireActiveOrganization();
  const profile = await getOrganizationProfile(user.id, organization.id);
  const canManage = isManagerRole(organization.role);

  const defaultValues: OrganizationProfileFormValues = {
    legalName: profile?.legalName ?? "",
    addressLine: profile?.addressLine ?? "",
    postalCode: profile?.postalCode ?? "",
    city: profile?.city ?? "",
    country: profile?.country ?? "",
    email: profile?.email ?? "",
    phone: profile?.phone ?? "",
    website: profile?.website ?? "",
    kvkNumber: profile?.kvkNumber ?? "",
    vatNumber: profile?.vatNumber ?? "",
    iban: profile?.iban ?? "",
    bic: profile?.bic ?? "",
    bankName: profile?.bankName ?? "",
    paymentTerms: profile?.paymentTerms ?? "",
    logoDataUrl: profile?.logoDataUrl ?? "",
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Company profile</h1>
        <p className="text-muted-foreground text-sm">
          Used on invoice PDFs for {organization.name}.
        </p>
      </div>
      <CompanyProfileForm defaultValues={defaultValues} canManage={canManage} />
    </div>
  );
}
