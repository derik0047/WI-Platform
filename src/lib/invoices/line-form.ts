import { DEFAULT_UNIT } from "@/config/units";
import { DEFAULT_VAT_RATE_BP } from "@/config/vat-rates";
import type { DiscountType, InvoiceLine } from "@/lib/db/schema";
import {
  basisPointsToPercentString,
  centsToMoneyString,
  computeLineAmounts,
  parseMoneyToCents,
  parseQuantityToMilli,
  percentToBasisPoints,
  trimNumericString,
} from "@/lib/invoices/line-math";
import type { InvoiceLineFormValues } from "@/lib/validations/invoice-line";

/**
 * Maps between stored lines and the string-based form values, and normalises
 * form input into storage-ready columns (with derived subtotal/total). Kept in
 * one pure place so create/edit/duplicate share the conversion.
 */

export function emptyLineForm(): InvoiceLineFormValues {
  return {
    description: "",
    quantity: "1",
    unit: DEFAULT_UNIT,
    unitPrice: "0",
    discountType: "percentage",
    discountValue: "0",
    vatRateBp: String(DEFAULT_VAT_RATE_BP),
    notes: "",
  };
}

export function lineToFormValues(line: InvoiceLine): InvoiceLineFormValues {
  return {
    description: line.description,
    quantity: trimNumericString(line.quantity),
    unit: line.unit,
    unitPrice: centsToMoneyString(line.unitPriceCents),
    discountType: line.discountType,
    discountValue:
      line.discountType === "percentage"
        ? basisPointsToPercentString(line.discountValue)
        : centsToMoneyString(line.discountValue),
    vatRateBp: String(line.vatRateBp),
    notes: line.notes ?? "",
  };
}

export type NormalizedLine = {
  description: string;
  quantity: string;
  unit: string;
  unitPriceCents: number;
  discountType: DiscountType;
  discountValue: number;
  vatRateBp: number;
  subtotalCents: number;
  totalCents: number;
  notes: string | null;
};

/** Convert validated form values into storage columns with derived amounts. */
export function normalizeLineInput(values: InvoiceLineFormValues): NormalizedLine {
  const quantityMilli = parseQuantityToMilli(values.quantity);
  const unitPriceCents = parseMoneyToCents(values.unitPrice);
  const discountValue =
    values.discountType === "percentage"
      ? percentToBasisPoints(values.discountValue)
      : parseMoneyToCents(values.discountValue);
  const { subtotalCents, totalCents } = computeLineAmounts({
    quantityMilli,
    unitPriceCents,
    discountType: values.discountType,
    discountValue,
  });

  return {
    description: values.description.trim(),
    quantity: trimNumericString(values.quantity.trim()),
    unit: values.unit.trim(),
    unitPriceCents,
    discountType: values.discountType,
    discountValue,
    vatRateBp: Number(values.vatRateBp),
    subtotalCents,
    totalCents,
    notes: values.notes.trim() || null,
  };
}
