import { z } from "zod";

/** Lowercase letters/numbers in hyphen-separated groups, e.g. `acme`, `acme-2`. */
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "At least 2 characters").max(100, "At most 100 characters"),
});

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2, "At least 2 characters").max(100, "At most 100 characters"),
  slug: z
    .string()
    .trim()
    .min(2, "At least 2 characters")
    .max(60, "At most 60 characters")
    .regex(SLUG_REGEX, "Use lowercase letters, numbers and hyphens"),
});

export const setActiveOrganizationSchema = z.object({
  organizationId: z.string().uuid(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type SetActiveOrganizationInput = z.infer<typeof setActiveOrganizationSchema>;
