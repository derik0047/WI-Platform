import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import type { VatGroup } from "@/lib/invoices/totals";

/**
 * `profiles` mirrors Supabase `auth.users` (1:1 by id) and holds app-owned
 * profile data. The data layer upserts a profile when the user first creates an
 * organization (until a Supabase signup trigger owns this).
 */
export const profiles = pgTable("profiles", {
  // Matches auth.users.id (managed by Supabase Auth).
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

/** Membership roles, most-privileged first. */
export const organizationRole = pgEnum("organization_role", ["owner", "admin", "member"]);

/** A tenant. Every product row must carry an `organization_id` and be accessed
 *  through the org-scoped data layer (`lib/data/organizations`). */
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

/** Join table: which users belong to which organizations, and at what role. */
export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: organizationRole("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("organization_members_org_user_unique").on(t.organizationId, t.userId),
    index("organization_members_user_idx").on(t.userId),
  ],
);

export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;
export type OrganizationRole = (typeof organizationRole.enumValues)[number];

/** Lifecycle of an emailed invitation. Time-based expiry is derived from
 *  `expires_at`, so it is not a stored status. */
export const invitationStatus = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "rejected",
  "revoked",
]);

/** Pending/settled invitations to join an organization. One live (pending,
 *  unexpired) invitation per (organization, email) is enforced in the data layer. */
export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: organizationRole("role").notNull().default("member"),
    // Opaque, URL-safe secret used to look up the invitation from the email link.
    token: text("token").notNull().unique(),
    status: invitationStatus("status").notNull().default("pending"),
    invitedByUserId: uuid("invited_by_user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    // Set when the invitation is accepted/rejected/revoked.
    respondedByUserId: uuid("responded_by_user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("invitations_org_idx").on(t.organizationId),
    index("invitations_email_idx").on(t.email),
  ],
);

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type InvitationStatus = (typeof invitationStatus.enumValues)[number];

/** Actions recorded to the append-only audit log (membership + invoices). */
export const auditAction = pgEnum("audit_action", [
  "member.invited",
  "invitation.accepted",
  "invitation.rejected",
  "invitation.revoked",
  "invitation.resent",
  "member.role_changed",
  "member.removed",
  "ownership.transferred",
  "invoice.created",
  "invoice.updated",
  "invoice.status_changed",
  "invoice.deleted",
  "invoice.line_added",
  "invoice.line_updated",
  "invoice.line_removed",
  "invoice.line_reordered",
  "invoice.totals_recalculated",
]);

/**
 * Append-only, org-scoped audit trail. Actor/target are denormalised (email + id)
 * so entries stay readable even after a referenced row is deleted. `target_type`
 * + `target_id` point at the affected entity (e.g. "invoice"); `metadata` holds
 * action-specific detail (e.g. old/new role, old/new status). Membership events
 * leave target_type null and use target_email instead.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    action: auditAction("action").notNull(),
    actorId: uuid("actor_id"),
    actorEmail: text("actor_email"),
    targetEmail: text("target_email"),
    targetType: text("target_type"),
    targetId: uuid("target_id"),
    metadata: jsonb("metadata").notNull().default({}).$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("audit_log_org_created_idx").on(t.organizationId, t.createdAt),
    index("audit_log_org_target_idx").on(t.organizationId, t.targetType, t.targetId),
  ],
);

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
export type AuditAction = (typeof auditAction.enumValues)[number];

/** Customer lifecycle: active customers are the working set; archived are hidden
 *  by default but retained (never hard-deleted by archiving). */
export const customerStatus = pgEnum("customer_status", ["active", "archived"]);

/**
 * A customer (company) belonging to an organization. This is the first product
 * table; like all product data it carries `organization_id` and is only ever
 * reached through the org-scoped data layer (`lib/data/customers`), which is
 * where multi-tenant isolation is enforced.
 */
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    companyName: text("company_name").notNull(),
    contactName: text("contact_name"),
    email: text("email"),
    phone: text("phone"),
    addressLine: text("address_line"),
    postalCode: text("postal_code"),
    city: text("city"),
    country: text("country").notNull().default("Netherlands"),
    // Dutch Chamber of Commerce (KVK) number.
    kvkNumber: text("kvk_number"),
    // Dutch VAT (BTW) number.
    vatNumber: text("vat_number"),
    notes: text("notes"),
    status: customerStatus("status").notNull().default("active"),
    createdByUserId: uuid("created_by_user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("customers_org_idx").on(t.organizationId),
    index("customers_org_status_idx").on(t.organizationId, t.status),
    // Includes id so the list's (company_name, id) sort has a stable, unique,
    // index-backed total order (prevents OFFSET pagination skips/dupes on ties).
    index("customers_org_company_idx").on(t.organizationId, t.companyName, t.id),
  ],
);

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type CustomerStatus = (typeof customerStatus.enumValues)[number];

/** Invoice lifecycle. Transitions are enforced in lib/invoices/status. */
export const invoiceStatus = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
]);

/**
 * Per-organization, per-year invoice number sequence. Incremented atomically via
 * an upsert (`ON CONFLICT DO UPDATE ... last_seq + 1`) inside the create
 * transaction, so concurrent invoice creation never collides.
 */
export const invoiceCounters = pgTable(
  "invoice_counters",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    lastSeq: integer("last_seq").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.year] })],
);

/**
 * An invoice header belonging to an organization. Like all product data it
 * carries `organization_id` and is only reached through the org-scoped data layer
 * (`lib/data/invoices`). The `*_cents` totals and `vat_breakdown` are derived from
 * the invoice's line items and recomputed automatically on every line change (see
 * lib/data/invoice-totals); they are stored in integer minor units.
 */
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // Restrict: a customer with invoices cannot be hard-deleted (archive instead).
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    invoiceNumber: text("invoice_number").notNull(),
    status: invoiceStatus("status").notNull().default("draft"),
    currency: text("currency").notNull().default("EUR"),
    issueDate: date("issue_date", { mode: "string" }).notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    notes: text("notes"),
    // Derived totals (recomputed on every line change). Net of VAT, then VAT, then
    // grand total; vat_breakdown is the per-rate/reverse-charge summary.
    subtotalCents: bigint("subtotal_cents", { mode: "number" }).notNull().default(0),
    vatTotalCents: bigint("vat_total_cents", { mode: "number" }).notNull().default(0),
    grandTotalCents: bigint("grand_total_cents", { mode: "number" }).notNull().default(0),
    vatBreakdown: jsonb("vat_breakdown").$type<VatGroup[]>().notNull().default([]),
    createdByUserId: uuid("created_by_user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("invoices_org_number_unique").on(t.organizationId, t.invoiceNumber),
    index("invoices_org_status_idx").on(t.organizationId, t.status),
    index("invoices_org_customer_idx").on(t.organizationId, t.customerId),
    // Supports the default list sort (issue_date desc, id) with a stable order.
    index("invoices_org_issue_idx").on(t.organizationId, t.issueDate, t.id),
  ],
);

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceStatus = (typeof invoiceStatus.enumValues)[number];

/** How a line discount is expressed: a percentage or a fixed amount. */
export const discountType = pgEnum("discount_type", ["percentage", "fixed"]);

/**
 * A line item on an invoice. Carries `organization_id` (tenant key, per the
 * product-table convention) and belongs to a draft-only-editable invoice via
 * `invoice_id` (cascade). Money is stored in integer minor units (cents);
 * `discount_value` is basis points when `discount_type` = percentage, else cents.
 * `subtotal_cents`/`total_cents` are derived at write time from the inputs by the
 * data layer (lib/data/invoice-lines). Invoice-level totals are out of scope.
 */
export const invoiceLines = pgTable(
  "invoice_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull().default("1"),
    unit: text("unit").notNull().default("pcs"),
    unitPriceCents: bigint("unit_price_cents", { mode: "number" }).notNull().default(0),
    discountType: discountType("discount_type").notNull().default("percentage"),
    // Basis points (1% = 100) when discount_type = percentage; cents when = fixed.
    discountValue: bigint("discount_value", { mode: "number" }).notNull().default(0),
    // VAT rate reference in basis points (e.g. 2100 = 21%). Aggregated by the
    // totals engine (lib/invoices/totals); ignored for reverse-charge lines.
    vatRateBp: integer("vat_rate_bp").notNull().default(2100),
    // Reverse charge (VAT shifted to the customer): this line's VAT is 0 and it
    // forms its own group in the VAT summary, regardless of vat_rate_bp.
    reverseCharge: boolean("reverse_charge").notNull().default(false),
    subtotalCents: bigint("subtotal_cents", { mode: "number" }).notNull().default(0),
    totalCents: bigint("total_cents", { mode: "number" }).notNull().default(0),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("invoice_lines_org_idx").on(t.organizationId),
    // Ordered listing per invoice (position, id tiebreaker for stable order).
    index("invoice_lines_invoice_pos_idx").on(t.invoiceId, t.position, t.id),
  ],
);

export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type NewInvoiceLine = typeof invoiceLines.$inferInsert;
export type DiscountType = (typeof discountType.enumValues)[number];

/**
 * An organization's company profile: the issuing party's details for invoice
 * documents (address, tax numbers, payment/bank details and logo). 1:1 with an
 * organization. All fields are optional; the invoice PDF falls back to the
 * organization name when the legal name is unset.
 */
export const organizationProfiles = pgTable("organization_profiles", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  legalName: text("legal_name"),
  addressLine: text("address_line"),
  postalCode: text("postal_code"),
  city: text("city"),
  country: text("country"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  kvkNumber: text("kvk_number"),
  vatNumber: text("vat_number"),
  iban: text("iban"),
  bic: text("bic"),
  bankName: text("bank_name"),
  paymentTerms: text("payment_terms"),
  // Data URL (data:image/png|jpeg;base64,...), embedded in the PDF. Bounded in the
  // data layer / form; decoded by lib/invoices/pdf/logo.
  logoDataUrl: text("logo_data_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type OrganizationProfile = typeof organizationProfiles.$inferSelect;
export type NewOrganizationProfile = typeof organizationProfiles.$inferInsert;
