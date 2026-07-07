/**
 * Deterministic, timezone-stable formatting. Using UTC ISO slices keeps
 * server- and client-rendered output identical (no hydration mismatch).
 */

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}
