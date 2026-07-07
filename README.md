# WI-Platform

The production-ready foundation for every RR Foundry **Workflow-Intelligence** application.
This repository is the **platform foundation only** (Milestone 1) — product features are built on top of it.

## Stack (fixed)

Next.js 15 · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase (Auth + Postgres) · Drizzle ORM · Resend · Vercel · Zod · React Hook Form · TanStack Query.

## Getting started

```bash
cp .env.example .env.local      # fill in Supabase / DATABASE_URL / Resend
npm install
npm run db:push                 # apply the base schema to your database
npm run dev                     # http://localhost:3000
```

## Scripts

| Script | Purpose |
|---|---|
| `dev` / `build` / `start` | Next.js dev / production build / serve |
| `lint` / `lint:fix` | ESLint (flat config, `next` + `typescript` + `prettier`) |
| `typecheck` | `tsc --noEmit` (strict) |
| `format` / `format:check` | Prettier (+ Tailwind class sorting) |
| `db:generate` / `db:migrate` / `db:push` / `db:studio` | Drizzle Kit |

## Structure

```
src/
  app/                     # App Router
    (auth)/login/          # auth pages
    (app)/                 # protected app (layout guards via requireUser)
    auth/{callback,signout}/route.ts
    error.tsx · global-error.tsx · not-found.tsx
  components/
    ui/                    # shadcn primitives (button, input, label, card, sonner)
    layout/                # app-shell, main-nav
    providers.tsx          # Theme + TanStack Query + Toaster
  config/                  # site + navigation config
  lib/
    env.ts                 # Zod-validated environment
    logger.ts · errors.ts  # logging + typed errors
    supabase/              # browser + server + middleware clients
    db/                    # Drizzle client + base schema
    auth/                  # getUser / requireUser / signOut
    email/                 # Resend
  middleware.ts            # session refresh + route protection
```

## Governance

Built to RR Foundry's Engineering OS (branch → verify → approve → merge). Architecture is documented in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). The stack is fixed by mandate; no new architectural decisions are taken here.
