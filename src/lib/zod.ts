import type { ZodError } from "zod";

/** First human-readable issue from a Zod error, for surfacing to the user. */
export function firstIssueMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}
