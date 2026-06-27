# Handoff: `lead` — Marketing Landing + Free Audit Lead Magnet

## Overview
Two pages for **lead**, an autonomous CRO ("auto-CRO") agent for B2B SaaS. lead connects a
GitHub repo, audits the code, drafts variants (real code, PR + feature flag), A/B tests them on
real traffic, measures qualified leads, and iterates — review-gated by default.

1. **`Accueil` — the main marketing landing (`/`)**: explains the product, the autonomous loop,
   the product surface, a comparison vs alternatives, proof/dogfooding, FAQ, and CTAs.
2. **`Landing` — the free audit tool (lead magnet)**: a no-login page (linked from the header /
   shared on social) where a user pastes a URL and gets a live, Claude-generated CRO audit
   (score + findings). It is a free, login-less slice of the product's first pass.

Primary conversion goal: **Book a demo**. Secondary: run the free audit (top of funnel).

## About the Design Files
The files in this bundle (`Accueil.dc.html`, `Landing.dc.html`, `support.js`) are **design
references created in HTML** — prototypes showing intended look and behavior, **not production
code to copy directly**. They are built in a small in-house component runtime (`support.js`,
the `<x-dc>` / `{{ }}` template system); **do not** port that runtime.

The task is to **recreate these designs in the target codebase** using its established stack
and patterns. The accompanying product spec targets **Next.js 16 · React 19 · Tailwind v4 ·
shadcn/ui · Geist**, with the **lead "Warm Precision"** design system already defined in
`app/globals.css` (OKLCH tokens, light + dark). Use those existing tokens/components — the hex/
oklch values below are provided so you can match the prototype exactly where the design system
doesn't already dictate a value.

To preview a file: open it in a browser (it loads `support.js` from the same folder).

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, layout, copy, and interactions.
Recreate pixel-faithfully using the codebase's existing `components/ui/*` and design tokens.
Copy is final and in **English**. The audit tool's behavior (states, live Claude call, fallback)
is functional and should be reproduced as real server logic per the product spec.

---

## Screens / Views

### 1. Home — `Accueil.dc.html`  → implement as `app/page.tsx`
Server-rendered marketing page, max content width **1160px**, 24px gutters. Sticky top nav.
Section order (top → bottom):

1. **Nav** (sticky, 60px tall, hairline bottom border, translucent blurred bg).
   - Left: logo = 24px orange rounded square (6px radius) with a white `refresh-cw` lucide
     glyph + wordmark **lead** (600) + a mono pill **auto-CRO** (1px border, 5px radius).
   - Center: links — *How it works* (`#how`), *Product* (`#product`), *Comparison* (`#compare`),
     *FAQ* (`#faq`). Muted, hover → foreground.
   - Right: ghost link *Free audit* → `Landing` (audit page); primary **Book a demo** button
     (36px, 6px radius, arrow icon) → `BOOKING_URL`.
2. **Hero** (2-col grid, `minmax(330px,1fr)`, 48px gap; collapses to 1 col).
   - Left: live status pill (pulsing green dot + mono "The CRO agent that ships, not advises"),
     H1 *"Your landing optimizes **itself.** In real code."* (clamp 36→58px, weight 600,
     letter-spacing −.03em, "itself." in primary orange), sub-paragraph, two CTAs
     (**Book a demo** primary + *Audit my landing — free* outline → `Landing`), two check
     reassurance items.
   - Right: **"control room" dashboard mock** card (see Components).
3. **Trust strip** — muted band: mono label "Growth teams already dogfooding" + 6 greyed
   wordmarks (Hookflow, Castl, Paretto, Northwind, DEScript, Velour). *Placeholders.*
4. **Problem** — eyebrow "The problem", H2, intro, 3 numbered columns (numbers in destructive red).
5. **How it works** — eyebrow "The loop, on autopilot", H2, 5 connected cards in a hairline grid
   (`minmax(190px,1fr)`, 2px gaps over a border-colored bg): Audit · Draft · A/B test · Measure ·
   Iterate. Each: lucide icon in an orange-tint square, mono step number, title, description.
   The 5th (Iterate) icon square is solid orange and shows "↻ on loop".
6. **Product deep-dive** — eyebrow "The product", H2, then **3 alternating** text+mock rows
   (`minmax(300px,1fr)`, 40px gap): STEP 1 *Connect your repo* (GitHub connect mock), STEP 2
   *Real code, in a PR* (PR diff mock; row reversed via `order`), STEP 3 *Measure leads, not
   clicks* (A/B results mock). Each text side has an eyebrow w/ icon, H3 (23px/600), paragraph,
   and a 3-item check list.
7. **Comparison** — eyebrow "Comparison", H2, a horizontally-scrollable `<table>` (min-width
   680px). Columns: *Criterion · lead · CRO agency · CRO tool · In-house hire*. The **lead**
   column header is orange and its cells have a faint orange tint. 5 rows of ✓ / — / short text.
8. **Proof** — muted full-bleed band (top+bottom hairline). Eyebrow "We eat our own dog food",
   H2, intro, then a 4-up stat grid (hairline grid like How it works): **+34%**, **11d**, **0**,
   **100%** with captions. *Placeholder metrics.*
9. **Audit funnel band** — card (16px radius), 2-col: copy ("Not ready to connect your repo
   yet?") + primary CTA *Audit my landing — free* → `Landing`, with a "Powered by Claude · no
   card required" line.
10. **FAQ** — eyebrow "FAQ", H2, single-open **accordion** (5 items) in a bordered card. Each
    row: full-width button (question + a `+` glyph that rotates to 45° = ×), answer panel below
    that shows/hides. See Interactions.
11. **Final CTA** — full-width dark card (bg = foreground espresso, text = bg beige), 18px radius,
    dotted texture overlay, centered H2 + sub + **Book a demo** primary + *Run the free audit*
    outline (→ `Landing`).
12. **Footer** — hairline top; brand blurb (left) + two link columns (Product / Company);
    sub-row with "© 2026 lead" and "Audit powered by Claude".

### 2. Free Audit Tool — `Landing.dc.html`  → implement as `app/audit/page.tsx` + `components/audit/*`
Same nav/footer chrome (logo links back to Home). Centered hero (max 860px):
- Status pill ("audit → variants → A/B test → iterate"), H1 *"Find out why your landing **isn't
  converting** — in 30 seconds."*, sub-paragraph.
- **Audit card** (the lead magnet, 14px radius, lifted shadow, "terminal" header bar with 3 dots
  + "lead · free audit" + "no login"). The card body is a **state machine** (see below).
- Below: muted line "Already adopted by growth teams done with guessing."
- The page also repeats How it works / Differentiation / Proof / Final CTA sections (lighter
  variants of the Home ones) so the audit page stands alone if shared directly.

#### Audit card states
- **idle** — `URL` label (mono, uppercase), URL input (46px, mono) + **Audit my landing** primary
  button (submit). Below: "Try:" + 3 example chips (`stripe.com`, `linear.app`, `notion.so`) that
  fill the input, and a "~30s · by Claude" note.
- **error** — same form + an inline red message (e.g. invalid / non-http URL).
- **loading** — spinner + "Auditing…", a mono **status log** that reveals steps one by one
  (Connecting → Reading HTML → Extracting → Claude evaluates → Analyzing → Compiling), each
  marked `▸` (current) / `✓` (done), plus 3 pulsing skeleton bars. Minimum ~2.6s dwell.
- **result** — circular **score gauge** (0–100, color by band) + label (Urgent <50 / Needs work
  50–74 / Solid ≥75) + one-line summary + host; a **findings list** (4–6 rows: index, severity
  pill, category tag, title, recommendation, evidence quote); footer CTAs: **Have the agent fix
  this** (→ `BOOKING_URL`), **Share the report** (copies a share link, label flips to "Link
  copied ✓"), **Audit another URL** (reset).

---

## Interactions & Behavior
- **Nav / CTAs**: anchor scroll to sections (`scroll-margin-top:70px` under the sticky nav).
  Book-a-demo opens `BOOKING_URL` in a new tab.
- **FAQ accordion** (Home): single-open. Clicking the open item closes it (all-closed allowed).
  Item 0 open on load. The `+` glyph rotates `0 → 45deg` (200ms) to read as ×. Answer toggled via
  `hidden`. Implement with a `useState<number>` open-index.
- **Audit submit** (audit page):
  1. Normalize URL (prepend `https://` if missing; reject non-http(s)).
  2. Enter `loading`; start a ~720ms interval advancing the status log.
  3. Run the audit AND a `delay(2600)` in parallel (so the animation reads), then show `result`.
  4. On any thrown error, fall back to a baked demo result (the demo should never hard-fail in UI).
- **Score count-up**: on result, animate the displayed score 0 → value over ~950ms (easeOutCubic),
  driving both the number and the gauge `stroke-dashoffset`.
- **Hero metric count-up** (Home): animate 0 → 342 over ~1200ms on mount.
- **Share**: copies `https://lead.dev/audit/<id>` to clipboard; button label → "Link copied ✓"
  for 1.8s. In production this should be the real `/audit/[id]` share URL.
- **Animations**: pulsing live dots (`pulseDot`), spinner (`spin`), skeleton (`skPulse`), bar
  fills (`grow` width 0→target). All subtle; respect `prefers-reduced-motion` in production.
- **Responsive**: every multi-column block uses `repeat(auto-fit, minmax(…, 1fr))` or flex-wrap;
  the comparison table is horizontally scrollable. Validate mobile + desktop, light + (intended) dark.

## State Management (audit tool)
- `phase`: `'idle' | 'loading' | 'result' | 'error'`
- `url: string` (controlled input)
- `statusIdx: number` (drives the status log)
- `result: AuditResult | null`, `displayScore: number` (animated), `errorMsg: string`,
  `shared: boolean`

### Data / API (per product spec — to build for real in the app)
The prototype calls Claude **client-side** via a sandbox helper and tries to read the target page
through a public reader, then asks for **structured JSON**. **In production, do this server-side**:
- `POST /api/audit { url?, text?, email? }`:
  1. If `url`: server-side `fetch` with timeout (~8s), size cap (~1.5MB), explicit User-Agent,
     and **anti-SSRF** (http/https only, block private/loopback IPs).
  2. Extract `<title>`, meta description, H1/H2/H3, CTA/button/link text, first paragraphs
     (lightweight, no heavy HTML parser). If too thin (likely SPA) and no `text` → return
     `{ needsPaste: true }` so the UI can offer a paste box.
  3. Call Claude (e.g. Opus) with **forced structured output** (tool `submit_audit`), validate
     server-side, retry once. Persist an `Audit` row (url, email, score, full result JSON, source).
  4. Return `{ id, result }`. Render `/audit/[id]` as a server page with dynamic Open Graph for
     good link sharing. Every audit run = a lead.
- Env: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `BOOKING_URL` (Cal/Calendly), `AGENT_MODEL`.

### `AuditResult` schema (validate server-side)
```
score: number            // 0..100
summary: string          // 1-2 sentences, English
findings: Array<{        // 4 to 6 items, most→least severe
  title: string
  severity: 'P0'|'P1'|'P2'|'P3'
  category: 'clarity'|'cta'|'proof'|'friction'|'value'
  recommendation: string // concrete action
  evidence: string       // exact quote from their page
}>
```
Severity → UI: **P0 Critical** (red), **P1 High** (orange), **P2 Medium** (gold), **P3 Minor**
(muted). Score bands: **<50 Urgent / red**, **50–74 Needs work / orange**, **≥75 Solid / green**.

## Design Tokens
Use the existing **lead** `globals.css` tokens (OKLCH, light + dark). Values used here (light):
- `--bg` (background) `oklch(0.965 0.012 84)` · `--fg` (foreground) `oklch(0.245 0.014 62)`
- `--card` `oklch(0.99 0.007 86)` · `--muted` `oklch(0.935 0.012 84)` ·
  `--muted-fg` `oklch(0.54 0.022 68)`
- `--border` `oklch(0.885 0.016 82)`
- `--primary` (orange) `oklch(0.66 0.17 47)` · `--primary-fg` `oklch(0.99 0.01 90)`
- `--success` `oklch(0.6 0.13 150)` · gold `oklch(0.76 0.13 70)` · teal `oklch(0.58 0.07 210)` ·
  destructive `oklch(0.58 0.21 28)`
- Radius: base **6px** (`--radius`); cards use 8–18px (8 small, 12 standard, 14 audit card,
  16–18 bands). Pills 9999px.
- Shadows: warm, low-spread (e.g. card lift `0 16px 40px -26px oklch(0.28 0.03 60 / .4)`).
- Typography: **Geist** (sans) + **Geist Mono** (labels, code, numbers). Weights 400/500/600/700.
  Headings 600, tight letter-spacing (−.02 to −.03em). Body 14–16px. Mono used for eyebrows,
  step numbers, status log, badges, stats. **Tabular numerals** on all metrics/scores.
- Spacing: 24px gutters; section vertical padding ~48–80px; common gaps 8/10/12/16/20/40px.

## Assets
- **Icons**: inline SVG in the **lucide** style (search, git-branch/pull-request, split, bar-chart,
  refresh-cw, check, arrow-right, chevron, upload, github mark, folder). Use the `lucide-react`
  package in the app instead of inline SVG.
- **Fonts**: Geist + Geist Mono (Google Fonts in the prototype; use `next/font` Geist in the app).
- **Logos / metrics / experiment data**: all **placeholders** — replace with real brand assets,
  real numbers, and real experiment data.
- No raster images are used.

## Files
- `Accueil.dc.html` — main marketing landing (reference).
- `Landing.dc.html` — free audit tool page, incl. the audit state machine + Claude-call logic
  (reference for behavior; rebuild server-side per the spec).
- `support.js` — prototype runtime only; **do not port**.
