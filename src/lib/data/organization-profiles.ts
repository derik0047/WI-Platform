import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { organizationProfiles, type OrganizationProfile } from "@/lib/db/schema";
import { requireMembership, requireOrgManager } from "@/lib/data/organizations";
import { AppError } from "@/lib/errors";
import type { OrganizationProfileFormValues } from "@/lib/validations/organization-profile";

/**
 * Org-scoped company profile access (the issuing party's invoice details).
 * Viewing requires membership; editing requires owner/admin — the same authority
 * as the organization settings.
 */

function nullify(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function getOrganizationProfile(
  userId: string,
  organizationId: string,
): Promise<OrganizationProfile | null> {
  await requireMembership(userId, organizationId);
  const [row] = await db
    .select()
    .from(organizationProfiles)
    .where(eq(organizationProfiles.organizationId, organizationId))
    .limit(1);
  return row ?? null;
}

export async function upsertOrganizationProfile(
  userId: string,
  organizationId: string,
  values: OrganizationProfileFormValues,
): Promise<OrganizationProfile> {
  await requireOrgManager(userId, organizationId);
  const email = nullify(values.email);
  const iban = nullify(values.iban);
  const bic = nullify(values.bic);

  const data = {
    legalName: nullify(values.legalName),
    addressLine: nullify(values.addressLine),
    postalCode: nullify(values.postalCode),
    city: nullify(values.city),
    country: nullify(values.country),
    email: email ? email.toLowerCase() : null,
    phone: nullify(values.phone),
    website: nullify(values.website),
    kvkNumber: nullify(values.kvkNumber),
    vatNumber: nullify(values.vatNumber),
    iban: iban ? iban.replace(/\s+/g, "").toUpperCase() : null,
    bic: bic ? bic.toUpperCase() : null,
    bankName: nullify(values.bankName),
    paymentTerms: nullify(values.paymentTerms),
    logoDataUrl: nullify(values.logoDataUrl),
    updatedAt: new Date(),
  };

  const [row] = await db
    .insert(organizationProfiles)
    .values({ organizationId, ...data })
    .onConflictDoUpdate({ target: organizationProfiles.organizationId, set: data })
    .returning();
  if (!row) throw new AppError("INTERNAL", "Failed to save the company profile");
  return row;
}
