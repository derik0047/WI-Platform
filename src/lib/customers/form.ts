import { DEFAULT_COUNTRY } from "@/config/countries";
import type { Customer } from "@/lib/db/schema";
import type { CustomerFormValues } from "@/lib/validations/customer";

/**
 * Maps between stored customers (nullable columns) and form values (plain
 * strings). Kept in one place so create/edit pages share the null↔"" mapping;
 * `normalizeCustomerInput` performs the inverse on write.
 */

export function emptyCustomerForm(): CustomerFormValues {
  return {
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    addressLine: "",
    postalCode: "",
    city: "",
    country: DEFAULT_COUNTRY,
    kvkNumber: "",
    vatNumber: "",
    notes: "",
    status: "active",
  };
}

export function customerToFormValues(customer: Customer): CustomerFormValues {
  return {
    companyName: customer.companyName,
    contactName: customer.contactName ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    addressLine: customer.addressLine ?? "",
    postalCode: customer.postalCode ?? "",
    city: customer.city ?? "",
    country: customer.country,
    kvkNumber: customer.kvkNumber ?? "",
    vatNumber: customer.vatNumber ?? "",
    notes: customer.notes ?? "",
    status: customer.status,
  };
}
