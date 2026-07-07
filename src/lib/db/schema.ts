import { index, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

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
