import "server-only";

import { getCustomer } from "@/lib/data/customers";
import { listInvoiceLines } from "@/lib/data/invoice-lines";
import { getInvoice } from "@/lib/data/invoices";
import { getOrganizationProfile } from "@/lib/data/organization-profiles";
import { getOrganizationById } from "@/lib/data/organizations";
import { basisPointsToPercentString, trimNumericString } from "@/lib/invoices/line-math";
import { formatPdfAmount } from "@/lib/invoices/pdf/format";
import type { InvoicePdfData, InvoicePdfLine } from "@/lib/invoices/pdf/render-invoice-pdf";
import type { InvoiceLine } from "@/lib/db/schema";

/**
 * Assembles everything the invoice PDF needs from the existing domains. Amounts
 * (line totals, subtotal, VAT, grand total, breakdown) are read from the
 * PERSISTED values — nothing is recalculated here.
 */
export async function getInvoicePdfData(
  userId: string,
  organizationId: string,
  invoiceId: string,
  generatedAt: Date,
): Promise<InvoicePdfData> {
  const invoice = await getInvoice(userId, organizationId, invoiceId);
  const [lines, customer, profile, organization] = await Promise.all([
    listInvoiceLines(userId, organizationId, invoiceId),
    getCustomer(userId, organizationId, invoice.customerId),
    getOrganizationProfile(userId, organizationId),
    getOrganizationById(organizationId),
  ]);

  const pdfLines: InvoicePdfLine[] = lines.map((line) => ({
    description: line.description,
    quantity: trimNumericString(line.quantity),
    unit: line.unit,
    unitPriceCents: line.unitPriceCents,
    discountLabel: discountLabel(line, invoice.currency),
    vatLabel: line.reverseCharge ? "R/C" : `${line.vatRateBp / 100}%`,
    lineTotalCents: line.totalCents,
  }));

  return {
    generatedAt,
    company: {
      name: organization?.name ?? "Company",
      legalName: profile?.legalName ?? null,
      addressLine: profile?.addressLine ?? null,
      postalCode: profile?.postalCode ?? null,
      city: profile?.city ?? null,
      country: profile?.country ?? null,
      email: profile?.email ?? null,
      phone: profile?.phone ?? null,
      website: profile?.website ?? null,
      kvkNumber: profile?.kvkNumber ?? null,
      vatNumber: profile?.vatNumber ?? null,
      iban: profile?.iban ?? null,
      bic: profile?.bic ?? null,
      bankName: profile?.bankName ?? null,
      paymentTerms: profile?.paymentTerms ?? null,
      logoDataUrl: profile?.logoDataUrl ?? null,
    },
    customer: {
      companyName: customer.companyName,
      contactName: customer.contactName,
      addressLine: customer.addressLine,
      postalCode: customer.postalCode,
      city: customer.city,
      country: customer.country,
      email: customer.email,
      vatNumber: customer.vatNumber,
      kvkNumber: customer.kvkNumber,
    },
    invoice: {
      number: invoice.invoiceNumber,
      status: invoice.status,
      currency: invoice.currency,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      notes: invoice.notes,
    },
    lines: pdfLines,
    vatBreakdown: invoice.vatBreakdown.map((group) => ({
      label: group.label,
      reverseCharge: group.reverseCharge,
      netCents: group.netCents,
      vatCents: group.vatCents,
    })),
    totals: {
      subtotalCents: invoice.subtotalCents,
      vatTotalCents: invoice.vatTotalCents,
      grandTotalCents: invoice.grandTotalCents,
    },
  };
}

function discountLabel(line: InvoiceLine, currency: string): string | null {
  if (line.discountValue <= 0) return null;
  if (line.discountType === "percentage") {
    return `-${basisPointsToPercentString(line.discountValue)}%`;
  }
  const effective = line.subtotalCents - line.totalCents;
  return effective > 0 ? `-${formatPdfAmount(effective, currency)}` : null;
}
