"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { setActiveOrganizationCookie } from "@/lib/auth/org";
import {
  createOrganization,
  getMembership,
  toOrgActor,
  updateOrganization,
} from "@/lib/data/organizations";
import { toAppError } from "@/lib/errors";
import {
  createOrganizationSchema,
  setActiveOrganizationSchema,
  updateOrganizationSchema,
} from "@/lib/validations/organization";
import { firstIssueMessage } from "@/lib/zod";

export type { ActionResult };

/** Create an organization and switch to it, then go to the dashboard. */
export async function createOrganizationAction(raw: unknown): Promise<ActionResult> {
  const parsed = createOrganizationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };

  try {
    const user = await requireUser();
    const organization = await createOrganization(toOrgActor(user), parsed.data);
    await setActiveOrganizationCookie(organization.id);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Update the given organization's name/slug (owners/admins only). */
export async function updateOrganizationAction(
  organizationId: string,
  raw: unknown,
): Promise<ActionResult> {
  const parsed = updateOrganizationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };

  try {
    const user = await requireUser();
    await updateOrganization(user.id, organizationId, parsed.data);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidatePath("/settings/organization");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Switch the active organization (must be a member). */
export async function setActiveOrganizationAction(organizationId: string): Promise<ActionResult> {
  const parsed = setActiveOrganizationSchema.safeParse({ organizationId });
  if (!parsed.success) return { ok: false, error: "Invalid organization" };

  try {
    const user = await requireUser();
    const membership = await getMembership(user.id, parsed.data.organizationId);
    if (!membership) return { ok: false, error: "You are not a member of that organization" };
    await setActiveOrganizationCookie(parsed.data.organizationId);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
