import { redirect } from "next/navigation";

import type { User } from "@supabase/supabase-js";

import { UnauthorizedError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

/** The current authenticated user, or null. Safe to call in Server Components. */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Require an authenticated user; redirect to /login if absent. Use in pages/actions. */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Require an authenticated user; throw 401 if absent. Use in API route handlers. */
export async function requireApiUser(): Promise<User> {
  const user = await getUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Sign the current user out (Server Action / Route Handler context). */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
