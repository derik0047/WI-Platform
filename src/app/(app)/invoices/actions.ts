"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { z } from "zod";

import { type ActionResult } from "@/lib/action-result";
import { requireActiveOrganization } from "@/lib/auth/org";
import { createInvoice, deleteInvoice, setInvoiceStatus, updateInvoice } from "@/lib/data/invoices";
import { toOrgActor } from "@/lib/data/organizations";
import { toAppError } from "@/lib/errors";
import { invoiceFormSchema, setInvoiceStatusSchema } from "@/lib/validations/invoice";
import { firstIssueMessage } from "@/lib/zod";

const invoiceIdSchema = z.string().uuid();

/** Create a draft invoice in the active organization, then open its detail page. */
export async function createInvoiceAction(raw: unknown): Promise<ActionResult> {
  const parsed = invoiceFormSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };

  let invoiceId: string;
  try {
    const { user, organization } = await requireActiveOrganization();
    const created = await createInvoice(toOrgActor(user), organization.id, parsed.data);
    invoiceId = created.id;
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidatePath("/invoices");
  redirect(`/invoices/${invoiceId}`);
}

/** Update a draft invoice's content in the active organization. */
export async function updateInvoiceAction(invoiceId: string, raw: unknown): Promise<ActionResult> {
  if (!invoiceIdSchema.safeParse(invoiceId).success) {
    return { ok: false, error: "Invalid invoice" };
  }
  const parsed = invoiceFormSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };

  try {
    const { user, organization } = await requireActiveOrganization();
    await updateInvoice(toOrgActor(user), organization.id, invoiceId, parsed.data);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true, message: "Invoice updated" };
}

/** Transition an invoice's status in the active organization. */
export async function setInvoiceStatusAction(
  invoiceId: string,
  status: unknown,
): Promise<ActionResult> {
  if (!invoiceIdSchema.safeParse(invoiceId).success) {
    return { ok: false, error: "Invalid invoice" };
  }
  const parsed = setInvoiceStatusSchema.safeParse({ status });
  if (!parsed.success) return { ok: false, error: "Invalid status" };

  try {
    const { user, organization } = await requireActiveOrganization();
    await setInvoiceStatus(toOrgActor(user), organization.id, invoiceId, parsed.data.status);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true, message: `Invoice marked ${parsed.data.status}` };
}

/** Permanently delete a draft invoice, then return to the list. */
export async function deleteInvoiceAction(invoiceId: string): Promise<ActionResult> {
  if (!invoiceIdSchema.safeParse(invoiceId).success) {
    return { ok: false, error: "Invalid invoice" };
  }

  try {
    const { user, organization } = await requireActiveOrganization();
    await deleteInvoice(toOrgActor(user), organization.id, invoiceId);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidatePath("/invoices");
  redirect("/invoices");
}
