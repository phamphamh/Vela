# lead — Product & Dashboard Spec

> Source of truth for what the product does and how the dashboard is organized.
> Implementation guidance lives in `CLAUDE.md`.

## Vision

**lead** helps companies that own SaaS products ship **high-converting landing
pages, onboarding flows, and paywalls** automatically. The user connects GitHub;
an agent orchestrator analyzes the codebase, drafts changes, ships them as A/B
test variants, measures conversion, and iterates — a continuous
conversion-rate-optimization loop driven by AI agents on the customer's own code.

The dashboard exists to make that loop **visible, trustworthy, and steerable**.

## Locked decisions

| Decision | Choice | What it means |
|---|---|---|
| **Variant delivery** | **PR + our SDK** | The agent opens a PR that puts the variant behind a feature flag using our lightweight SDK. The customer's existing CI deploys it; the SDK decides which variant each visitor sees. Changes are real, reviewable code. "Deploy" in the UI = approve → PR opened/merged → flag flipped live. |
| **Conversion tracking** | **Our own SDK events** | The SDK emits impression + conversion events to our ingest endpoint. We own assignment and the experiment statistics. One integration for the customer. |
| **Autonomy (default)** | **Review-gated** | The agent finds opportunities and drafts variants automatically, but a human approves before any deploy. An autonomy dial lets customers loosen this over time (semi-auto → autonomous + guardrails). |

Implications: every code change is a reviewable diff; hard-to-reverse actions
(deploy, ship winner, roll back) are gated; the agent's activity is logged for
trust.

## The core loop

```
        ┌─────────────────────────────────────────────────────────┐
        ▼                                                           │
  ① Analyze repo → ② Find opportunity → ③ Agent drafts variant(s)  │
        (audit)        (per surface)        (real code diff)        │
                                                  │                 │
                                                  ▼                 │
  ⑥ Decide ◀── ⑤ Collect data ◀── ④ Deploy as A/B test            │
   (ship / iterate / drop)   (significance)   (PR + flag)           │
        │                                                           │
        └──────────────► learnings feed the next opportunity ───────┘
```

- **First run:** connect GitHub → pick repo → agent scans and produces an
  **audit** (detected surfaces + ranked opportunities) → configure deploy +
  install SDK → approve the first experiment.
- **Steady state:** the loop runs continuously; the human reviews/decides at the
  gates they care about (review-gated by default).

## Information architecture

Left-nav sections (project switcher + theme toggle live in the top bar):

| Section | Purpose |
|---|---|
| **Overview** | The pulse: active experiments, cumulative uplift, what needs attention, recent agent activity. |
| **Experiments** | The heart: list + detail across the full lifecycle. |
| **Surfaces** | Landing / Onboarding / Paywall views with ranked opportunities per surface. |
| **Agent** | Orchestrator activity log, run history, the autonomy dial, the work queue. |
| **Insights** | Conversion trends, per-surface funnels, and a learnings library. |
| **Project & Settings** | Connected repo, branches, deploy config, integrations (GitHub / SDK / deploy), team, billing (later). |

## Pages

### Overview
- KPI row: active experiments, win rate, cumulative uplift, visitors in test.
- **Needs-review queue:** drafts awaiting approval + conclusive experiments
  awaiting a decision.
- Recent agent activity feed.

### Experiments — list
- Filter by surface / status. Each row: surface, hypothesis, status, uplift,
  confidence, sample size.

### Experiments — detail (the most important screen)
- Header: hypothesis, surface, status, time running.
- **Variants** (control + treatments): each shows the **actual code diff** the
  agent wrote and its reasoning.
- **Live metrics:** visitors, conversions, conversion rate, **uplift + statistical
  confidence**, sample size, projected time-to-significance.
- **Decision controls:** Ship winner · Extend · Abandon · Roll back (gated).

### Surfaces
- Per surface: current state, detected issues, a backlog of agent-proposed
  opportunities ranked by expected impact.

### Agent
- Chronological activity log, per-run detail, autonomy setting, work queue.

### Insights
- Conversion over time, per-surface funnels, learnings library.

### Project & Settings
- Repo connection, branches, deploy config, SDK install/keys, integrations,
  team, billing (later).

## Experiment lifecycle

```
DRAFT ─approve→ QUEUED ─deploy→ RUNNING ─significance→ CONCLUSIVE
  │                                  │                     │
  └────────── ABANDONED ◀────────────┴── ship winner →  COMPLETED
```

| State | Meaning | Trigger to next |
|---|---|---|
| `DRAFT` | Agent proposed + drafted variant(s); awaiting approval. | Human approves |
| `QUEUED` | Approved; PR open, awaiting deploy/flag flip. | Deploy succeeds |
| `RUNNING` | Live, collecting data. | Significance reached |
| `CONCLUSIVE` | Significance reached; decision pending. | Ship / abandon |
| `COMPLETED` | Winner shipped. | — |
| `ABANDONED` | Dropped at any point. | — |

## Data model

**Current** (`prisma/schema.prisma`): `Project`, `Experiment`, `Variant`,
enums `Surface`, `ExperimentStatus`, `VariantKind`.

**Planned additions** to support the loop:
- `ExperimentStatus`: add **`QUEUED`** and **`CONCLUSIVE`**.
- **`Opportunity`** — an agent-found improvement on a surface (the backlog),
  before it becomes an experiment. Fields: surface, title, rationale, expected
  impact, status.
- **`Change`** — the concrete diff a variant ships: PR URL, branch, diff summary,
  status (open/merged/reverted). Replaces the flat `Variant.changeRef`.
- **`AgentRun` / `ActivityEvent`** — the observability log behind the Agent page.
- **`Goal`** — the conversion goal(s) an experiment measures (e.g. signup,
  checkout), since tracking is our own SDK events.
- **`EventRollup` / `MetricSnapshot`** — aggregated impression/conversion counts
  per variant feeding the stats (raw events live in the ingest pipeline).
- `Project` additions: SDK key, GitHub installation id, deploy/integration config.
- `Variant` additions: traffic split / weight.

## Suggested build order

1. **Extend the Prisma schema** — new states + `Opportunity`, `Change`,
   `AgentRun`, `Goal`, metrics; first migration.
2. **Dashboard shell** — `app/(dashboard)` layout: sidebar nav + top bar
   (project switcher, theme toggle), built from the design system.
3. **Overview** page (mock data).
4. **Experiments** list + detail (mock data).
5. **Surfaces**, **Agent**, **Insights** pages (mock data).
6. Wire real data; then the agent orchestrator and the SDK (separate tracks).

> Auth (Clerk) stays deferred; pages render without a session for now.
