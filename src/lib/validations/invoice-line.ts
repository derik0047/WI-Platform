import { z } from "zod";

import { isAllowedVatRateBp } from "@/config/vat-rates";

const MONEY_RE = /^\d+(\.\d{1,2})?$/;
const QUANTITY_RE = /^\d+(\.\d{1,3})?$/;

export const discountTypeSchema = z.enum(["percentage", "fixed"]);

/**
 * Line item form. All numeric inputs are strings (money/quantity/discount) so the
 * form's input and output types match (react-hook-form friendly); the data layer
 * parses them into integer minor units. `vatRateBp` is the selected rate's basis
 * points, as a string.
 */
export const invoiceLineFormSchema = z
  .object({
    description: z.string().trim().min(1, "Description is required").max(500),
    quantity: z
      .string()
      .trim()
      .regex(QUANTITY_RE, "Enter a valid quantity")
      .refine((v) => Number(v) > 0 && Number(v) <= 1_000_000, "Quantity out of range"),
    unit: z.string().trim().min(1, "Unit is required").max(30),
    unitPrice: z
      .string()
      .trim()
      .regex(MONEY_RE, "Enter a valid amount")
      .refine((v) => Number(v) <= 1_000_000, "Amount is too large"),
    discountType: discountTypeSchema,
    discountValue: z.string().trim().regex(MONEY_RE, "Enter a valid discount"),
    vatRateBp: z.string().refine((v) => isAllowedVatRateBp(Number(v)), "Choose a VAT rate"),
    notes: z.string().trim().max(2000),
  })
  .refine((v) => v.discountType !== "percentage" || Number(v.discountValue) <= 100, {
    message: "A percentage discount cannot exceed 100%",
    path: ["discountValue"],
  })
  .refine((v) => v.discountType !== "fixed" || Number(v.discountValue) <= 1_000_000, {
    message: "Discount is too large",
    path: ["discountValue"],
  });

export type InvoiceLineFormValues = z.infer<typeof invoiceLineFormSchema>;

/** Payload for persisting a drag-and-drop reorder (the full ordered id list). */
export const reorderLinesSchema = z.object({
  lineIds: z.array(z.string().uuid()).min(1).max(1000),
});

export type ReorderLinesInput = z.infer<typeof reorderLinesSchema>;
