import { index, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

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

/** Membership actions recorded to the append-only audit log. */
export const auditAction = pgEnum("audit_action", [
  "member.invited",
  "invitation.accepted",
  "invitation.rejected",
  "invitation.revoked",
  "invitation.resent",
  "member.role_changed",
  "member.removed",
  "ownership.transferred",
]);

/**
 * Append-only audit trail for membership changes. Actor/target are denormalised
 * (email + id) so entries stay readable even after a user or invitation is
 * deleted; `metadata` holds action-specific detail (e.g. old/new role).
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
    metadata: jsonb("metadata").notNull().default({}).$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("audit_log_org_created_idx").on(t.organizationId, t.createdAt)],
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
