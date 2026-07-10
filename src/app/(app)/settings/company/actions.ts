"use server";

import { revalidatePath } from "next/cache";

import { type ActionResult } from "@/lib/action-result";
import { requireActiveOrganization } from "@/lib/auth/org";
import { upsertOrganizationProfile } from "@/lib/data/organization-profiles";
import { toAppError } from "@/lib/errors";
import { organizationProfileSchema } from "@/lib/validations/organization-profile";
import { firstIssueMessage } from "@/lib/zod";

/** Save the active organization's company profile (owner/admin only). */
export async function updateCompanyProfileAction(raw: unknown): Promise<ActionResult> {
  const parsed = organizationProfileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };

  try {
    const { user, organization } = await requireActiveOrganization();
    await upsertOrganizationProfile(user.id, organization.id, parsed.data);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidatePath("/settings/company");
  // The PDF reads company details, so invalidate invoice pages too.
  revalidatePath("/invoices", "layout");
  return { ok: true, message: "Company profile saved" };
}
