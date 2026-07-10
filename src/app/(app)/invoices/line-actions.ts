"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { type ActionResult } from "@/lib/action-result";
import { requireActiveOrganization } from "@/lib/auth/org";
import {
  createInvoiceLine,
  deleteInvoiceLine,
  duplicateInvoiceLine,
  reorderInvoiceLines,
  updateInvoiceLine,
} from "@/lib/data/invoice-lines";
import { toOrgActor } from "@/lib/data/organizations";
import { toAppError } from "@/lib/errors";
import { invoiceLineFormSchema, reorderLinesSchema } from "@/lib/validations/invoice-line";
import { firstIssueMessage } from "@/lib/zod";

const idSchema = z.string().uuid();

function revalidateInvoice(invoiceId: string) {
  revalidatePath(`/invoices/${invoiceId}`);
}

/** Add a line to a draft invoice. */
export async function createInvoiceLineAction(
  invoiceId: string,
  raw: unknown,
): Promise<ActionResult> {
  if (!idSchema.safeParse(invoiceId).success) return { ok: false, error: "Invalid invoice" };
  const parsed = invoiceLineFormSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };

  try {
    const { user, organization } = await requireActiveOrganization();
    await createInvoiceLine(toOrgActor(user), organization.id, invoiceId, parsed.data);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidateInvoice(invoiceId);
  return { ok: true, message: "Line added" };
}

/** Update a line on a draft invoice. */
export async function updateInvoiceLineAction(
  invoiceId: string,
  lineId: string,
  raw: unknown,
): Promise<ActionResult> {
  if (!idSchema.safeParse(invoiceId).success || !idSchema.safeParse(lineId).success) {
    return { ok: false, error: "Invalid line" };
  }
  const parsed = invoiceLineFormSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };

  try {
    const { user, organization } = await requireActiveOrganization();
    await updateInvoiceLine(toOrgActor(user), organization.id, invoiceId, lineId, parsed.data);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidateInvoice(invoiceId);
  return { ok: true, message: "Line updated" };
}

/** Remove a line from a draft invoice. */
export async function deleteInvoiceLineAction(
  invoiceId: string,
  lineId: string,
): Promise<ActionResult> {
  if (!idSchema.safeParse(invoiceId).success || !idSchema.safeParse(lineId).success) {
    return { ok: false, error: "Invalid line" };
  }

  try {
    const { user, organization } = await requireActiveOrganization();
    await deleteInvoiceLine(toOrgActor(user), organization.id, invoiceId, lineId);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidateInvoice(invoiceId);
  return { ok: true, message: "Line removed" };
}

/** Duplicate a line on a draft invoice. */
export async function duplicateInvoiceLineAction(
  invoiceId: string,
  lineId: string,
): Promise<ActionResult> {
  if (!idSchema.safeParse(invoiceId).success || !idSchema.safeParse(lineId).success) {
    return { ok: false, error: "Invalid line" };
  }

  try {
    const { user, organization } = await requireActiveOrganization();
    await duplicateInvoiceLine(toOrgActor(user), organization.id, invoiceId, lineId);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidateInvoice(invoiceId);
  return { ok: true, message: "Line duplicated" };
}

/** Persist a drag-and-drop reorder of a draft invoice's lines. */
export async function reorderInvoiceLinesAction(
  invoiceId: string,
  lineIds: string[],
): Promise<ActionResult> {
  if (!idSchema.safeParse(invoiceId).success) return { ok: false, error: "Invalid invoice" };
  const parsed = reorderLinesSchema.safeParse({ lineIds });
  if (!parsed.success) return { ok: false, error: "Invalid order" };

  try {
    const { user, organization } = await requireActiveOrganization();
    await reorderInvoiceLines(toOrgActor(user), organization.id, invoiceId, parsed.data.lineIds);
  } catch (error) {
    return { ok: false, error: toAppError(error).message };
  }

  revalidateInvoice(invoiceId);
  return { ok: true, message: "Order saved" };
}
