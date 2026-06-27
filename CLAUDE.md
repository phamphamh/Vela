# CLAUDE.md

Guidance for Claude Code (and humans) working in this repository.

## What this project is

**Lead** (working name) is a SaaS platform that helps companies who own SaaS
products **improve and ship high-converting landing pages, onboarding flows, and
paywalls** — automatically.

The core loop:

1. A user logs in and connects their **GitHub** account, granting access to their
   product's repository.
2. A **powerful agent orchestrator** analyzes the codebase to understand the
   landing / onboarding / paywall surfaces.
3. The agent proposes and writes changes (copy, layout, pricing presentation,
   flow ordering, …).
4. Changes are deployed as **A/B test variants**.
5. We collect conversion data, evaluate experiments, and the orchestrator
   launches the next round of experiments.

In short: an autonomous conversion-rate-optimization engine driven by AI agents
operating on the customer's own codebase.

> The product name is not final. Internally we call it **lead**.

**Product & dashboard spec:** see [`docs/product.md`](docs/product.md) for the
full flow, dashboard IA, page contents, experiment lifecycle, and the locked
decisions (PR + SDK delivery, our-own-SDK tracking, review-gated autonomy).

## Tech stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | **Next.js** (App Router) | Single app (not a monorepo for now) |
| Language | **TypeScript** | Strict mode |
| UI | **shadcn/ui** + **Tailwind CSS** | Design system is TBD — see below |
| Database | **PostgreSQL** | Hosted Postgres (e.g. Neon/Supabase Postgres) |
| ORM | **Prisma** | Schema-first, migrations via Prisma |
| Auth | **Clerk** *(deferred)* | **Not wired up yet** — we ship fast first. Clerk is the chosen provider when we add it. |
| Agent runtime | **Claude Agent SDK** | The orchestrator + codebase agents are built on Anthropic's Claude Agent SDK |
| Package manager | **Bun** | Use `bun` for installs and scripts |
| Deployment | **Vercel** | Web app deploys to Vercel |

### Important stack constraints

- **No auth right now.** We deliberately skip authentication to ship fast. Do
  **not** add Clerk, middleware-based route protection, or user-session gating
  unless explicitly asked. When we do add auth, it will be **Clerk**. Design data
  models with a future `userId` / `orgId` in mind, but don't block on it.
- **Single Next.js app.** The agent orchestrator runs inside this app for now
  (API routes / route handlers / background work). If the orchestrator needs to
  become a separate long-running service later, we'll split it out then — don't
  pre-build that separation.
- **Use the design system.** See the "Design system" section below. Build from
  the tokens and shadcn/ui primitives; don't hand-roll bespoke components or use
  raw hex/ad-hoc colors. Add new shadcn components via its CLI, not by copying.

## Design system — "Warm Precision"

A clean, dev-tool aesthetic (tight 6px radius, hairline borders, dense layout,
tabular numerals) on a **warm palette**: beige canvas, espresso ink, a confident
**orange** accent. Light-first, with a warm espresso dark theme.

- **Tokens** live in `app/globals.css` as oklch CSS variables, mapped to Tailwind
  via `@theme inline`. There's a `:root` (light) block and a `.dark` block.
  **Always style through semantic tokens** (`bg-background`, `bg-card`,
  `bg-primary`, `text-muted-foreground`, `border-border`, `bg-success`, the
  `chart-1..5` palette, etc.) — never raw hex or `zinc-*`/`slate-*` utilities.
- **Radius** base is `--radius: 0.375rem` (6px). Use `rounded-sm/md/lg/xl…`.
- **Shadows** are warm and low-spread: `shadow-xs/sm/md/lg`.
- **Type:** Geist (sans, UI) + Geist Mono (data, labels). Put `tabular-nums` on
  any column of numbers/metrics.
- **Theming:** `next-themes` via `components/theme-provider.tsx` (in the root
  layout, `attribute="class"`, `defaultTheme="light"`). Toggle:
  `components/theme-toggle.tsx` (CSS-driven icon swap — no `mounted` flag).
- **Styleguide:** the home page (`app/page.tsx`) is a live styleguide — colors,
  type scale, radius/elevation, every component, and an in-context "Experiments"
  surface. Use it as the reference when building new UI. (It will be replaced by
  the real app shell later; keep the styleguide reachable.)
- To add components: `bunx --bun shadcn@latest add <name>`.

## Anthropic / Claude usage

We build on Claude. Follow these rules whenever writing code that calls Claude or
configures an agent:

- **Default model: `claude-opus-4-8`** for the orchestrator and any
  intelligence-sensitive agent work.
- Use **`claude-haiku-4-5`** for cheap, high-volume, or simple sub-agent tasks
  (e.g. quick classification, file triage). Use **`claude-sonnet-4-6`** for a
  middle ground when Opus is overkill but Haiku is too weak.
- Use the official Anthropic TypeScript SDK / Claude Agent SDK — never hand-roll
  HTTP calls or use OpenAI-compatible shims.
- These model IDs are complete as written — **do not append date suffixes**.
- When in doubt about Claude API specifics (thinking, tool use, model choice,
  agent design), consult the `claude-api` skill rather than relying on memory —
  the API surface moves fast.

The "agent that analyzes a customer repo, edits it, and opens PRs" maps cleanly
onto Anthropic's **Managed Agents** surface (sandboxed per-session containers,
GitHub repo mounting, the agent loop hosted by Anthropic). Keep this in mind as
the orchestration matures — it may be a better fit than running the loop
ourselves for the codebase-mutation agents.

## Project structure (target)

This is the intended shape as the app grows — create directories as needed.

```
app/                 # Next.js App Router (routes, layouts, route handlers)
  api/               # Route handlers (agent endpoints, GitHub webhooks, etc.) (TODO)
components/
  ui/                # shadcn/ui components (generated via shadcn CLI)
lib/
  db.ts              # Prisma client singleton (driver-adapter based)
  utils.ts           # shadcn `cn()` helper
  generated/prisma/  # Generated Prisma client — GITIGNORED, run db:generate
  agents/            # Claude Agent SDK orchestrator + agent definitions (TODO)
prisma/
  schema.prisma      # Database schema (provider only — URL lives in config)
prisma.config.ts     # Prisma CLI config (datasource URL, migrations path)
components.json      # shadcn/ui config
public/              # Static assets
```

> `create-next-app` also generated an `AGENTS.md`. **`CLAUDE.md` is the source of
> truth** — keep guidance here.

## Conventions

- **Imports:** use the `@/` path alias for internal modules.
- **Server vs client:** default to Server Components; add `"use client"` only
  when a component needs interactivity.
- **Data access:** all DB access goes through the Prisma client singleton in
  `lib/db.ts` — never instantiate `PrismaClient` ad hoc (it leaks connections in
  dev hot-reload). We're on **Prisma 7**: there is no `url` in `schema.prisma`;
  the connection URL lives in `prisma.config.ts` (CLI) and is passed at runtime
  via the `@prisma/adapter-pg` driver adapter in `lib/db.ts`. The generated
  client lives in `lib/generated/prisma/` (gitignored, regenerated on install).
  Switching to Neon serverless later = swap to `@prisma/adapter-neon`.
- **Env vars:** read through a typed/validated config module; never reference
  `process.env.*` scattered across the codebase. Never commit secrets.
- **Styling:** Tailwind utility classes + shadcn primitives. No CSS-in-JS, no
  ad-hoc global CSS beyond `globals.css`.
- **Secrets:** GitHub tokens, Anthropic API keys, and DB URLs live in `.env`
  (gitignored) locally and in Vercel project settings in production. Customer
  GitHub credentials must never be logged or persisted in plaintext.

## Commands

Bun is the package manager (installed at `~/.bun/bin`).

```bash
bun install            # install dependencies (runs `prisma generate` postinstall)
bun run dev            # start the Next.js dev server
bun run build          # production build
bun run start          # run the production build
bun run lint           # lint
bun run db:generate    # regenerate the Prisma client
bun run db:migrate     # apply DB migrations in development (prisma migrate dev)
bun run db:studio      # open Prisma Studio
bunx --bun shadcn@latest add <component>   # add a shadcn/ui component
```

## Current status

Scaffolded and building (`bun run build` passes). Done:

- ✅ Next.js 16 (App Router) + TypeScript + Tailwind v4, `@/` import alias.
- ✅ shadcn/ui initialized (`components.json`, `components/ui/button.tsx`, `lib/utils.ts`).
- ✅ Prisma 7 skeleton — `Project` / `Experiment` / `Variant` models, `pg`
  driver adapter, client singleton in `lib/db.ts`.
- ✅ "Warm Precision" design system — oklch token system (light + dark),
  `next-themes` toggle, shadcn primitives, and a live styleguide at `/`.

Next steps (not yet done):

- Provide a real Postgres `DATABASE_URL` in `.env` (currently the Prisma
  placeholder) and run `bun run db:migrate` to create the first migration.
- Stand up the Claude Agent SDK orchestrator skeleton in `lib/agents/`.
- Build the connect-GitHub flow and the experiments dashboard.
- Add Clerk auth when we're ready (currently deferred).
