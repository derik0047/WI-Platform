/** Discriminated result returned by Server Actions to client forms. */
export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };
