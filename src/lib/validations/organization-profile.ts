import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max);

// Bounds a base64 logo data URL (~256 KB image → ~350 KB of text).
const MAX_LOGO_DATAURL_LEN = 360_000;

/**
 * Company profile form. All fields optional (blank allowed); the data layer
 * converts "" to null on write. Numeric inputs stay as strings for RHF-friendly
 * input/output types.
 */
export const organizationProfileSchema = z.object({
  legalName: optionalText(200),
  addressLine: optionalText(300),
  postalCode: optionalText(20),
  city: optionalText(120),
  country: optionalText(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid email"),
  phone: optionalText(50),
  website: optionalText(200),
  kvkNumber: optionalText(20),
  vatNumber: optionalText(30),
  iban: optionalText(40),
  bic: optionalText(20),
  bankName: optionalText(120),
  paymentTerms: optionalText(1000),
  logoDataUrl: z
    .string()
    .max(MAX_LOGO_DATAURL_LEN, "Logo image is too large (max ~256 KB)")
    .refine(
      (v) => v === "" || /^data:image\/(png|jpe?g);base64,/.test(v),
      "Use a PNG or JPEG image",
    ),
});

export type OrganizationProfileFormValues = z.infer<typeof organizationProfileSchema>;
