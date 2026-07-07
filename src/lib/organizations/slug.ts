/** Convert arbitrary text into a URL-safe slug (pure). */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumeric runs -> single hyphen
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}

/**
 * Resolve a unique slug from `base` using an injectable availability check.
 * The predicate keeps this pure/testable — the DB lookup is passed in.
 */
export async function resolveUniqueSlug(
  base: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base) || "org";
  if (!(await isTaken(root))) return root;

  for (let suffix = 2; suffix < 1000; suffix++) {
    const candidate = `${root}-${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }

  throw new Error(`Could not resolve a unique slug for "${base}"`);
}
