import { redirect } from "next/navigation";

import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/** The current authenticated user, or null. Safe to call in Server Components. */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Require an authenticated user; redirect to /login if absent. */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Sign the current user out (Server Action / Route Handler context). */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
