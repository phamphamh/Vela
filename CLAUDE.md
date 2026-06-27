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
| Auth | **Better Auth** (GitHub OAuth) | Wired. `lib/auth.ts` (server) + `lib/auth-client.ts` (React). Sessions/users/accounts live in our Postgres via the Prisma adapter. The GitHub OAuth token is stored on `Account.accessToken` and is how we read the customer's repos. |
| Agent runtime | **Claude Agent SDK** | The orchestrator + codebase agents are built on Anthropic's Claude Agent SDK |
| Package manager | **Bun** | Use `bun` for installs and scripts |
| Deployment | **Vercel** | Web app deploys to Vercel |

### Important stack constraints

- **Auth is Better Auth + GitHub OAuth.** Server instance in `lib/auth.ts`
  (`betterAuth` + `prismaAdapter(db)`), React client in `lib/auth-client.ts`
  (`useSession`, `signIn`, `signOut`), route handler at
  `app/api/auth/[...all]/route.ts`. Requires `BETTER_AUTH_SECRET`,
  `BETTER_AUTH_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` in `.env` (read via
  `lib/env.ts` — never `process.env.*` directly). Read the user's session
  server-side with `auth.api.getSession({ headers: await headers() })`. The GitHub
  access token lives on `Account.accessToken`; use it to call the GitHub API.
  **Never log the token.** Repo *writing* / PRs will later use a **GitHub App**
  (installation id reserved on `Project.githubInstallationId`) — not the OAuth token.
- **No blanket route protection yet.** There's no `middleware.ts`; API routes
  self-guard via `getSession` (401). Add gating when the dashboard uses real data.
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
- ✅ Dashboard pages (`/dashboard/*`) + onboarding flow (`/onboarding`) on the
  design system.
- ✅ **Better Auth + GitHub OAuth** wired (`lib/auth.ts`, `lib/auth-client.ts`,
  `app/api/auth/[...all]`). Onboarding Connect → real GitHub sign-in; Repo step →
  real repos from `GET /api/github/repos`; selecting one persists a `Project` via
  `POST /api/projects`.

Next steps (not yet done):

- Provide a real Postgres `DATABASE_URL` in `.env` (local: `postgresql://localhost:5432/lead`)
  and run `bun run db:migrate` to create the first migration. Register a GitHub
  OAuth App and set the auth env vars (see the Auth constraint above).
- ✅ **Codebase audit is real.** `lib/agents/audit.ts` runs a discovery agent
  (Opus 4.8, agentic `read_file` tool-use loop over the GitHub tree) to locate
  the landing/onboarding/paywall surfaces, then per-surface analyzer agents
  (parallel, structured outputs) score each and propose changes. `lib/github.ts`
  reads the repo over the REST API (no clone). `POST /api/audit` streams progress
  as NDJSON (`AuditEvent`); the onboarding Audit → Report steps consume it.
  Requires `ANTHROPIC_API_KEY` in `.env`.
- ✅ **Audit is persisted + the dashboard reads real data.** Each onboarding
  codebase audit is saved as a `ProjectAudit` (full `AuditResult` JSON + avg score)
  in `POST /api/audit/repo`. The **Surfaces** page (`app/dashboard/surfaces`) renders
  that audit — detected surfaces, issues, and a ranked opportunity backlog where each
  row has a **Launch test** button (`LaunchOpportunityButton`) that fires the launch
  agent → PR. The **Experiments** list + **detail** pages now read real experiments
  (`lib/experiments.ts`) with uplift/confidence computed from `Variant` rollups via a
  two-proportion z-test (`lib/stats.ts`); detail has gated **Activate / Ship winner /
  Abandon** controls (`POST /api/experiments/[id]/{status,decision}`). Overview, Agent,
  and Insights pages are still mock.
- ✅ **Visitor tracking is real.** Our own SDK (`public/sdk.js`) auto-captures
  pageviews + clicks (and `data-lead-conversion` / `lead('conversion', …)`) on the
  customer's site and beacons batches to `POST /api/ingest` (CORS, keyed by
  `Project.sdkKey`). Events land in the `Event` table (+ `Variant` impression/
  conversion rollups). `lib/metrics.ts` aggregates them; the dashboard home's
  **Live tracking** band (`components/dashboard/realtime-overview.tsx`) shows real
  visitors / pageviews / clicks / conversions / conv-rate / most-clicked, with the
  install snippet in the empty state. The rest of the dashboard is still mock.
- ✅ **A/B experiment launch is real.** `lib/agents/launch-experiment.ts` (Opus 4.8,
  `read_file` loop) picks one high-leverage **copy** A/B test on a surface and opens a
  **reviewable PR** that tags the element with `data-lead-exp="<id>"` +
  `data-lead-b="<treatment copy>"` (control copy stays the visible default). The
  Experiment + two `Variant`s are created first (status `DRAFT`) to mint the ids the
  edit embeds; on PR open the experiment becomes `QUEUED`. `POST /api/experiments/launch`
  streams `LaunchEvent` NDJSON. The PR body embeds a **rendered Before/After image** so
  reviewers see the copy change, not just two data-attributes in the diff:
  `lib/preview-svg.ts` builds the SVG; for **public repos** `lib/preview-png.ts` (sharp)
  rasterizes it to PNG, which the launch agent commits into the branch
  (`.lead/previews/experiment-<id>.png`) and embeds via `raw.githubusercontent.com` — so
  it renders in the PR with **no public Lead deployment** to proxy. Private repos (whose
  raw URLs need auth) fall back to `GET /api/experiments/[id]/preview.svg` (works once
  Lead is deployed public). The experiment detail page shows the same SVG. The trigger is
  the `LaunchExperiment` panel in the
  onboarding Report step (seeded with the top audit opportunity) and the dashboard
  **Live tracking** band. The SDK (`public/sdk.js`) now does **variant assignment**:
  deterministic FNV bucketing per `experimentId`, swaps in the treatment for the B
  cohort, emits `EXPOSURE` once, and attributes conversions to the assigned variant
  (sessionStorage). The **flag** is `GET /api/experiments/active?key=<sdkKey>` (CORS) —
  it serves only `RUNNING` experiments, so a test goes live the moment we flip it (and
  stops instantly, no redeploy). `GET /api/experiments/[id]/status` auto-flips
  `QUEUED → RUNNING` once the PR is merged (polled by the launch UI; `POST` force-
  activates). Schema gained `QUEUED`/`CONCLUSIVE`, `Experiment.{title,split,prNumber,
  prUrl,prBranch,targetPath}`, and `Variant.{content,weight}`.
- Next on experiments: **stats off `Event`/`Variant` rollups** (uplift + significance)
  and wiring the experiment list/detail pages to real data (still mock), plus
  decision controls (ship winner / abandon) that flip status + open a follow-up PR.
- ✅ **Setup agent + GitHub App PR writes.** `lib/agents/setup-sdk.ts` reads the repo
  (Opus 4.8, `read_file` loop), finds the global head/layout + signup/checkout
  conversions, injects the tracking `<script>` and `data-lead-conversion` markers,
  and opens a **reviewable PR**. Writes use a **GitHub App installation token**
  (`lib/github-app.ts` — RS256 JWT from `leadhackathonyc.private-key.pem`, app id +
  installation derived from `/user/installations`; reads still use the OAuth token).
  Multi-file commit + PR helpers in `lib/github.ts`. `POST /api/setup-sdk` streams
  `SetupEvent` NDJSON; trigger is the "Set it up for me → Open a PR" panel in the
  Settings install card. Note: the injected snippet URL is `BETTER_AUTH_URL` (set a
  public Vela URL for prod) and the PR is review-gated.
