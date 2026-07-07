import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";

import * as schema from "./schema";

/**
 * Drizzle client over postgres.js. `prepare: false` is required for the
 * Supabase transaction pooler (port 6543). A dev singleton avoids exhausting
 * connections across HMR reloads. Server-only.
 */
const globalForDb = globalThis as unknown as {
  __client?: ReturnType<typeof postgres>;
};

const client = globalForDb.__client ?? postgres(env.DATABASE_URL, { prepare: false });

if (env.NODE_ENV !== "production") {
  globalForDb.__client = client;
}

export const db = drizzle(client, { schema });

export { schema };
