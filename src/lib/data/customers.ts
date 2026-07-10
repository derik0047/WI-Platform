import "server-only";

import { and, asc, count, eq, ilike, or, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { customers, type Customer, type CustomerStatus } from "@/lib/db/schema";
import { requireMembership } from "@/lib/data/organizations";
import { AppError, NotFoundError } from "@/lib/errors";
import { normalizeCustomerInput } from "@/lib/customers/normalize";
import { containsPattern } from "@/lib/customers/search";
import { paginate, resolvePageParams, type Paginated } from "@/lib/pagination";
import type { CustomerFormValues, CustomerQuery } from "@/lib/validations/customer";

/**
 * Org-scoped customer data access. Every function requires a validated membership
 * for the given organization and scopes all reads/writes by `organization_id`,
 * which is how multi-tenant isolation is enforced over Drizzle's privileged
 * connection. This is the ONLY place customer rows are touched.
 */

/** Row shape returned for list/table views (omits large fields like notes). */
export type CustomerListItem = {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string;
  status: CustomerStatus;
  createdAt: Date;
  updatedAt: Date;
};

const listColumns = {
  id: customers.id,
  companyName: customers.companyName,
  contactName: customers.contactName,
  email: customers.email,
  phone: customers.phone,
  city: customers.city,
  country: customers.country,
  status: customers.status,
  createdAt: customers.createdAt,
  updatedAt: customers.updatedAt,
};

/** Build the WHERE predicate for a customer query (org scope + filters + search). */
function buildCustomerFilter(organizationId: string, query: CustomerQuery): SQL {
  const conditions: SQL[] = [eq(customers.organizationId, organizationId)];

  if (query.status !== "all") {
    conditions.push(eq(customers.status, query.status));
  }
  if (query.country) {
    conditions.push(eq(customers.country, query.country));
  }

  const pattern = containsPattern(query.q);
  if (pattern) {
    const search = or(
      ilike(customers.companyName, pattern),
      ilike(customers.contactName, pattern),
      ilike(customers.email, pattern),
      ilike(customers.city, pattern),
      ilike(customers.kvkNumber, pattern),
      ilike(customers.vatNumber, pattern),
    );
    if (search) conditions.push(search);
  }

  // At least the org-scope condition is always present.
  return and(...conditions) as SQL;
}

/** A page of customers for an organization, filtered and searched. */
export async function listCustomers(
  userId: string,
  organizationId: string,
  query: CustomerQuery,
): Promise<Paginated<CustomerListItem>> {
  await requireMembership(userId, organizationId);
  const { page, pageSize, offset } = resolvePageParams({ page: query.page });
  const where = buildCustomerFilter(organizationId, query);

  const [rows, totals] = await Promise.all([
    db
      .select(listColumns)
      .from(customers)
      .where(where)
      // id is a unique tiebreaker: keeps OFFSET paging stable across page queries
      // when multiple customers share a company_name.
      .orderBy(asc(customers.companyName), asc(customers.id))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(customers).where(where),
  ]);

  return paginate(rows, totals[0]?.value ?? 0, { page, pageSize });
}

/** A single customer by id, scoped to the organization. Throws if not found. */
export async function getCustomer(
  userId: string,
  organizationId: string,
  customerId: string,
): Promise<Customer> {
  await requireMembership(userId, organizationId);
  const [row] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId)))
    .limit(1);
  if (!row) throw new NotFoundError("Customer not found");
  return row;
}

/** Does a customer with this id exist in the organization? (For cross-module
 *  reuse, e.g. invoices — the caller has already validated membership.) */
export async function customerBelongsToOrg(
  organizationId: string,
  customerId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId)))
    .limit(1);
  return Boolean(row);
}

/** Minimal id/name pairs for active customers (e.g. an invoice customer picker). */
export type CustomerOption = { id: string; companyName: string };

export async function listCustomerOptions(
  userId: string,
  organizationId: string,
): Promise<CustomerOption[]> {
  await requireMembership(userId, organizationId);
  return db
    .select({ id: customers.id, companyName: customers.companyName })
    .from(customers)
    .where(and(eq(customers.organizationId, organizationId), eq(customers.status, "active")))
    .orderBy(asc(customers.companyName));
}

/** Create a customer in the organization. */
export async function createCustomer(
  userId: string,
  organizationId: string,
  values: CustomerFormValues,
): Promise<Customer> {
  await requireMembership(userId, organizationId);
  const data = normalizeCustomerInput(values);
  const [row] = await db
    .insert(customers)
    .values({ ...data, organizationId, createdByUserId: userId })
    .returning();
  if (!row) throw new AppError("INTERNAL", "Failed to create customer");
  return row;
}

/** Update a customer (scoped to the organization). Throws if not found. */
export async function updateCustomer(
  userId: string,
  organizationId: string,
  customerId: string,
  values: CustomerFormValues,
): Promise<Customer> {
  await requireMembership(userId, organizationId);
  const data = normalizeCustomerInput(values);
  const [row] = await db
    .update(customers)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId)))
    .returning();
  if (!row) throw new NotFoundError("Customer not found");
  return row;
}

/** Archive or restore a customer (scoped to the organization). */
export async function setCustomerStatus(
  userId: string,
  organizationId: string,
  customerId: string,
  status: CustomerStatus,
): Promise<Customer> {
  await requireMembership(userId, organizationId);
  const [row] = await db
    .update(customers)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId)))
    .returning();
  if (!row) throw new NotFoundError("Customer not found");
  return row;
}

/** Permanently delete a customer (scoped to the organization). Throws if not
 *  found, or a friendly CONFLICT if the customer is still referenced (e.g. has
 *  invoices — those use ON DELETE restrict). */
export async function deleteCustomer(
  userId: string,
  organizationId: string,
  customerId: string,
): Promise<void> {
  await requireMembership(userId, organizationId);
  try {
    const deleted = await db
      .delete(customers)
      .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId)))
      .returning({ id: customers.id });
    if (deleted.length === 0) throw new NotFoundError("Customer not found");
  } catch (error) {
    // 23503 = foreign_key_violation (customer still referenced by invoices).
    if (error && typeof error === "object" && "code" in error && error.code === "23503") {
      throw new AppError(
        "CONFLICT",
        "This customer has invoices and can't be deleted. Archive it instead.",
      );
    }
    throw error;
  }
}
