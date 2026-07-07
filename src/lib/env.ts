import { z } from "zod";

/**
 * Centralised, type-safe environment access.
 * Server-only vars are validated only on the server; NEXT_PUBLIC_* everywhere.
 * Imported by next.config.ts so a misconfigured environment fails the build/boot.
 */

const isServer = typeof window === "undefined";

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
});

// Reference each var literally so Next.js can inline NEXT_PUBLIC_* into the client bundle.
const runtimeEnv = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
};

type Env = z.infer<typeof serverSchema> & z.infer<typeof clientSchema>;

function loadEnv(): Env {
  const schema = isServer ? serverSchema.merge(clientSchema) : clientSchema;
  const parsed = schema.safeParse(runtimeEnv);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  // On the client only client keys are present; the cast keeps a single ergonomic type.
  return parsed.data as Env;
}

export const env = loadEnv();
