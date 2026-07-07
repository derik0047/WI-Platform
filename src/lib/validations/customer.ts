import { z } from "zod";

/** Stored customer status. */
export const customerStatusSchema = z.enum(["active", "archived"]);

// Optional email: allow empty, otherwise a valid (normalised) address. Bounded
// like every other text field (RFC 5321 max address length).
const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email is too long")
  .refine(
    (v) => v === "" || z.string().email().safeParse(v).success,
    "Enter a valid email address",
  );

// Dutch Chamber of Commerce (KVK) numbers are exactly 8 digits when present.
const kvkField = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{8}$/.test(v), "KVK number must be 8 digits");

/**
 * Form schema. Optional fields are typed as plain strings (empty allowed) so the
 * form's input and output types match — the data layer converts "" to null on
 * write (see `lib/customers/normalize`). This keeps react-hook-form's resolver
 * types clean (no transforms that change field types).
 */
export const customerFormSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required").max(200),
  contactName: z.string().trim().max(200),
  email: emailField,
  phone: z.string().trim().max(50),
  addressLine: z.string().trim().max(300),
  postalCode: z.string().trim().max(20),
  city: z.string().trim().max(120),
  country: z.string().trim().min(1, "Country is required").max(120),
  kvkNumber: kvkField,
  vatNumber: z.string().trim().max(20),
  notes: z.string().trim().max(5000),
  status: customerStatusSchema,
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

/** Status filter for the list, including "all". */
export const customerStatusFilterSchema = z.enum(["all", "active", "archived"]);
export type CustomerStatusFilter = z.infer<typeof customerStatusFilterSchema>;

/**
 * List query params, parsed from the URL. `.catch(...)` makes each field robust
 * to malformed input (a hand-edited query string never throws — it falls back).
 */
export const customerQuerySchema = z.object({
  q: z.string().trim().max(200).catch(""),
  status: customerStatusFilterSchema.catch("all"),
  country: z.string().trim().max(120).catch(""),
  page: z.coerce.number().int().catch(1),
});

export type CustomerQuery = z.infer<typeof customerQuerySchema>;

/** Payload for archive/restore. */
export const setCustomerStatusSchema = z.object({
  status: customerStatusSchema,
});
