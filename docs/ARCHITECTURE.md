# WI-Platform — Architecture Report (Milestone 1)

**Scope.** The production-ready *foundation* every Workflow-Intelligence app builds on. Product features are explicitly **out of scope** for this milestone.

## 1. Stack (fixed by mandate — no decisions taken here)

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, RSC) · React 19 |
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) |
| Styling / UI | Tailwind CSS **v4** (CSS-first) · shadcn/ui (new-york) |
| Auth | Supabase Auth (SSR cookies via `@supabase/ssr`) |
| Data | Supabase Postgres · Drizzle ORM (postgres.js driver) |
| Validation | Zod (env + forms) |
| Forms | React Hook Form (+ `@hookform/resolvers`) |
| Server state | TanStack Query |
| Email | Resend |
| Hosting / CI | Vercel · GitHub Actions |

## 2. Layered design

```
Presentation   app/ (RSC + client islands) · components/ui · components/layout
Application    lib/auth · server actions / route handlers · components/providers
Domain/Data    lib/db (Drizzle) + schema · Supabase
Cross-cutting  lib/env · lib/logger · lib/errors · middleware (session/guard)
```

- **Server-first.** Server Components by default; `"use client"` only where interactivity is required (login form, nav, providers, error boundaries).
- **Two Supabase clients.** Browser (`lib/supabase/client`) and server (`lib/supabase/server`) plus a middleware session refresher (`lib/supabase/middleware`) — the canonical SSR pattern; `getUser()` in middleware revalidates tokens on every request.
- **Defence in depth for auth.** Middleware redirects unauthenticated users from protected prefixes; the `(app)` layout independently calls `requireUser()`.

## 3. What Milestone 1 configures

| Deliverable | Where |
|---|---|
| Project init + tooling | `package.json`, `tsconfig.json`, `next.config.ts`, `.nvmrc`, `.editorconfig` |
| Linting | `eslint.config.mjs` (flat: `next` + `typescript` + `prettier`) |
| Formatting | `prettier.config.mjs` (+ Tailwind sorting), `.prettierignore` |
| Environment management | `src/lib/env.ts` (Zod, fail-fast), `.env.example` |
| Supabase | `src/lib/supabase/*`, `src/middleware.ts` |
| Drizzle | `drizzle.config.ts`, `src/lib/db/*` (base `profiles` schema) |
| Authentication | `src/lib/auth/*`, `(auth)/login`, `auth/callback`, `auth/signout` |
| Shared UI | `src/app/globals.css`, `components/ui/*`, `components.json` |
| Layouts | `app/layout.tsx`, `(app)/layout.tsx`, `components/layout/app-shell` |
| Navigation | `src/config/nav.ts`, `components/layout/main-nav` |
| Error handling | `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`, `lib/errors.ts` |
| Logging | `src/lib/logger.ts` (pretty dev / JSON prod) |
| CI | `.github/workflows/ci.yml` (lint · typecheck · format · build) |

## 4. Key implementation notes

- **Tailwind v4** is CSS-first: no `tailwind.config.ts`; tokens live in `globals.css` (`@theme inline`, oklch), `@tailwindcss/postcss` in `postcss.config.mjs`. shadcn `components.json` points at the CSS file.
- **Env validation** runs at build (imported by `next.config.ts`) so a misconfigured deploy fails fast; server-only vars are never validated on the client; `NEXT_PUBLIC_*` are referenced literally so they inline into the client bundle.
- **DB pooling.** `postgres(url, { prepare: false })` for the Supabase transaction pooler; a dev singleton avoids exhausting connections under HMR.
- **Typed routes** are enabled; the nav config only references existing routes.

## 5. Deliberately deferred (not built in Milestone 1)

Product features and their tables; a Supabase trigger to populate `profiles` on signup; role/permission model; rate limiting; observability/error-reporting service integration; a component library beyond the core primitives; tests (unit/e2e harness); email templates. These attach cleanly to the foundation above and are the subject of later milestones.

## 6. Governance

The stack is fixed; this report documents (not re-decides) it. Subsequent work follows RR Foundry's Engineering OS: branch per unit of work, verification before merge, approval before merge.
