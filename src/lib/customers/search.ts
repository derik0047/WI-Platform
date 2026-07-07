/**
 * Escape LIKE/ILIKE wildcards (`%`, `_`) and the escape character (`\`) so a
 * user's search term is matched literally. Postgres LIKE uses backslash as the
 * default escape character, so the escaped pattern is safe with a plain
 * `ilike(col, '%' + escapeLike(term) + '%')`.
 */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/** Build a contains-pattern for ILIKE from a raw term, or null if empty. */
export function containsPattern(term: string): string | null {
  const trimmed = term.trim();
  if (trimmed.length === 0) return null;
  return `%${escapeLike(trimmed)}%`;
}
