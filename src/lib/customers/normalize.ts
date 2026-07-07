import type { CustomerStatus } from "@/lib/db/schema";
import type { CustomerFormValues } from "@/lib/validations/customer";

/**
 * Normalised, storage-ready customer fields. Optional strings become `null`
 * (never stored as empty strings) so filtering and display treat "missing"
 * consistently. Pure and unit-tested.
 */
export type NormalizedCustomer = {
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  addressLine: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
  kvkNumber: string | null;
  vatNumber: string | null;
  notes: string | null;
  status: CustomerStatus;
};

/** Trim and collapse empty strings to null. */
function nullify(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeCustomerInput(values: CustomerFormValues): NormalizedCustomer {
  const email = nullify(values.email);
  const vatNumber = nullify(values.vatNumber);
  return {
    companyName: values.companyName.trim(),
    contactName: nullify(values.contactName),
    email: email ? email.toLowerCase() : null,
    phone: nullify(values.phone),
    addressLine: nullify(values.addressLine),
    postalCode: nullify(values.postalCode),
    city: nullify(values.city),
    country: values.country.trim() || "Netherlands",
    kvkNumber: nullify(values.kvkNumber),
    vatNumber: vatNumber ? vatNumber.toUpperCase() : null,
    notes: nullify(values.notes),
    status: values.status,
  };
}
