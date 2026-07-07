import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Foundation schema. `profiles` mirrors Supabase `auth.users` (1:1 by id) and
 * holds app-owned profile data. Populate it from a Supabase trigger on user
 * creation (data-layer concern, added with the first product). Product tables
 * are added later; this file stays the single Drizzle schema entry point.
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
