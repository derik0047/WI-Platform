import { defineConfig } from "drizzle-kit";

// drizzle-kit loads this file with its own bundler (no Next path aliases and it
// does not import the app runtime), so read the URL from the environment directly.
// A placeholder keeps `generate` working offline; `migrate`/`push` need the real URL.
const url = process.env.DATABASE_URL ?? "postgresql://localhost:5432/placeholder";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
