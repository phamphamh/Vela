# Vela — autonomous conversion-rate optimization, driven by AI agents

> Built for the **Unaite × Y Combinator** hackathon.
>
> **🔗 Live app: [lead.159.69.41.115.sslip.io](https://lead.159.69.41.115.sslip.io)** · **📅 Book a demo: [cal.com/youssefb/test-easycro](https://cal.com/youssefb/test-easycro)**

Vela helps companies that own SaaS products ship **high-converting landing pages,
onboarding flows, and paywalls — automatically**. You connect your GitHub repo, an
agent orchestrator reads your actual codebase, drafts real code changes, ships them
as **A/B test variants behind a feature flag**, measures conversion, and iterates.

It's a continuous conversion-rate-optimization (CRO) loop, run by AI agents on the
customer's **own code** — every change is a reviewable pull request, never a black box.

> Working name in the repo is **lead**; the product is **Vela**.

---

## The core loop

```
        ┌──────────────────────────────────────────────────────────┐
        ▼                                                            │
  ① Analyze repo → ② Find opportunity → ③ Agent drafts variant(s)   │
        (audit)        (per surface)        (real code diff)         │
                                                  │                  │
                                                  ▼                  │
  ⑥ Decide  ◀── ⑤ Collect data ◀── ④ Deploy as A/B test            │
   (ship / iterate / drop)   (significance)   (PR + flag)            │
        │                                                            │
        └──────────────► learnings feed the next opportunity ────────┘
```

1. **Connect** — log in with GitHub OAuth; Vela reads your repo over the GitHub API (no clone).
2. **Audit** — a discovery agent (Claude Opus 4.8, agentic file-read loop) locates your
   landing / onboarding / paywall surfaces; per-surface analyzer agents score them and
   propose changes.
3. **Launch** — the launch agent picks one high-leverage copy test and opens a
   **reviewable PR** that tags the element with our SDK data-attributes (control copy stays
   the visible default). The PR body embeds a rendered **Before/After preview image**.
4. **Track** — our own lightweight SDK (`public/sdk.js`) captures pageviews, clicks, and
   conversions, does deterministic variant assignment, and beacons events to our ingest endpoint.
5. **Measure & decide** — the dashboard computes uplift + confidence via a two-proportion
   z-test; gated **Activate / Ship winner / Abandon** controls flip the flag live with no redeploy.

---

## Why it's different

- **Real code, not a visual overlay.** Variants ship as pull requests against the customer's
  repo. Reviewable diffs, their CI, their deploy.
- **One integration.** A single SDK snippet owns both **variant delivery** and **conversion
  tracking** — we own assignment and the statistics.
- **Review-gated autonomy.** The agent finds opportunities and drafts variants automatically,
  but a human approves before anything goes live. An autonomy dial loosens this over time.
- **Live flag flipping.** `GET /api/experiments/active` serves only `RUNNING` experiments, so a
  test goes live (and stops) the instant you flip it — no redeploy.

---

## Architecture

| Layer | Choice |
| --- | --- |
| Framework | **Next.js 16** (App Router), TypeScript strict |
| UI | **shadcn/ui** + **Tailwind v4** — "Warm Precision" design system (oklch tokens, light + dark) |
| Database | **PostgreSQL** via **Prisma 7** (`pg` driver adapter) |
| Auth | **Better Auth** + GitHub OAuth |
| Agents | **Claude Agent SDK / Anthropic SDK** — orchestrator on `claude-opus-4-8` |
| Repo writes | **GitHub App** installation token (RS256 JWT) for PRs; OAuth token for reads |
| Tracking | First-party SDK (`public/sdk.js`) → `POST /api/ingest` |
| Deployment | Self-hosted via **Coolify** ([live here](https://lead.159.69.41.115.sslip.io)) |

### What's actually built (not mocked)

- ✅ GitHub OAuth + repo connect → persisted `Project`
- ✅ **Real codebase audit** — discovery + per-surface analyzer agents, streamed as NDJSON,
  persisted as a `ProjectAudit`
- ✅ **Real A/B launch** — agent opens a PR with embedded Before/After preview; experiment +
  variants minted first to embed their ids
- ✅ **Real visitor tracking** — first-party SDK, CORS ingest, impression/conversion rollups,
  live dashboard band
- ✅ **Real stats + decision controls** — two-proportion z-test uplift/confidence; gated
  Activate / Ship winner / Abandon
- ✅ **Setup agent** — injects the tracking snippet + conversion markers via a reviewable PR

---

## Try it live — no setup, no clone

Vela is **already deployed and running**. There's nothing to install — just open it
in your browser and test the real product:

### 👉 [lead.159.69.41.115.sslip.io](https://lead.159.69.41.115.sslip.io)

Then:

1. **Log in with GitHub** and connect a repo.
2. Watch the **audit agent** read the codebase and surface real opportunities.
3. **Launch an A/B test** — a reviewable pull request is opened on the repo, with an
   embedded Before/After preview.
4. See conversions and **uplift / confidence** flow into the dashboard.

Prefer a guided walkthrough? **[Book a 1:1 demo →](https://cal.com/youssefb/test-easycro)**

---

## Repo map

```
app/
  api/            # audit, experiments, github, ingest, projects, setup-sdk, auth
  dashboard/      # surfaces, experiments, insights, agent, settings, overview
  onboarding/     # connect → repo → audit → report flow
lib/
  agents/         # audit.ts, launch-experiment.ts, setup-sdk.ts (Claude Agent SDK)
  github.ts       # repo reads (REST) + multi-file commit / PR helpers
  github-app.ts   # GitHub App JWT → installation token (PR writes)
  metrics.ts      # event aggregation
  stats.ts        # two-proportion z-test
  preview-svg.ts  # Before/After preview rendering
public/sdk.js     # first-party tracking + variant-assignment SDK
docs/product.md   # full product & dashboard spec
```

---

Built with [Claude Code](https://claude.com/claude-code) for the Unaite × Y Combinator hackathon.
