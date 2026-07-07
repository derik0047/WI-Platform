"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { setActiveOrganizationCookie } from "@/lib/auth/org";
import { acceptInvitation, rejectInvitation } from "@/lib/data/invitations";
import { toOrgActor } from "@/lib/data/organizations";
import { toAppError } from "@/lib/errors";
import { invitationTokenSchema } from "@/lib/validations/membership";

/** Accept an invitation, switch to that organization, and go to the dashboard. */
export async function acceptInvitationAction(token: string): Promise<ActionResult> {
  const parsed = invitationTokenSchema.safeParse({ token });
  if (!parsed.success) return { ok: false, error: "Invalid invitation" };

  try {
    const user = await requireUser();
    const { organizationId } = await acceptInvitation(toOrgActor(user), parsed.data.token);
    await setActiveOrganizationCookie(organizationId);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Decline an invitation. */
export async function rejectInvitationAction(token: string): Promise<ActionResult> {
  const parsed = invitationTokenSchema.safeParse({ token });
  if (!parsed.success) return { ok: false, error: "Invalid invitation" };

  try {
    const user = await requireUser();
    await rejectInvitation(toOrgActor(user), parsed.data.token);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Invitation declined" };
}
