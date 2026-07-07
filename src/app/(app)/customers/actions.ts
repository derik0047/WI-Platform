"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { z } from "zod";

import { type ActionResult } from "@/lib/action-result";
import { requireActiveOrganization } from "@/lib/auth/org";
import {
  createCustomer,
  deleteCustomer,
  setCustomerStatus,
  updateCustomer,
} from "@/lib/data/customers";
import { toAppError } from "@/lib/errors";
import { customerFormSchema, setCustomerStatusSchema } from "@/lib/validations/customer";
import { firstIssueMessage } from "@/lib/zod";

const customerIdSchema = z.string().uuid();

/** Create a customer in the active organization, then open its detail page. */
export async function createCustomerAction(raw: unknown): Promise<ActionResult> {
  const parsed = customerFormSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };

  let customerId: string;
  try {
    const { user, organization } = await requireActiveOrganization();
    const created = await createCustomer(user.id, organization.id, parsed.data);
    customerId = created.id;
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidatePath("/customers");
  redirect(`/customers/${customerId}`);
}

/** Update a customer in the active organization. */
export async function updateCustomerAction(
  customerId: string,
  raw: unknown,
): Promise<ActionResult> {
  if (!customerIdSchema.safeParse(customerId).success) {
    return { ok: false, error: "Invalid customer" };
  }
  const parsed = customerFormSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };

  try {
    const { user, organization } = await requireActiveOrganization();
    await updateCustomer(user.id, organization.id, customerId, parsed.data);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  return { ok: true, message: "Customer updated" };
}

/** Archive or restore a customer in the active organization. */
export async function setCustomerStatusAction(
  customerId: string,
  status: unknown,
): Promise<ActionResult> {
  if (!customerIdSchema.safeParse(customerId).success) {
    return { ok: false, error: "Invalid customer" };
  }
  const parsed = setCustomerStatusSchema.safeParse({ status });
  if (!parsed.success) return { ok: false, error: "Invalid status" };

  try {
    const { user, organization } = await requireActiveOrganization();
    await setCustomerStatus(user.id, organization.id, customerId, parsed.data.status);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  return {
    ok: true,
    message: parsed.data.status === "archived" ? "Customer archived" : "Customer restored",
  };
}

/** Permanently delete a customer, then return to the list. */
export async function deleteCustomerAction(customerId: string): Promise<ActionResult> {
  if (!customerIdSchema.safeParse(customerId).success) {
    return { ok: false, error: "Invalid customer" };
  }

  try {
    const { user, organization } = await requireActiveOrganization();
    await deleteCustomer(user.id, organization.id, customerId);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidatePath("/customers");
  redirect("/customers");
}
