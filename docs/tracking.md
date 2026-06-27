# Tracking — install & verify

How a customer connects their site so the dashboard gets real visitor data. This
is the "our own SDK events" half of the loop (see `docs/product.md`).

## Where the key comes from

Every connected repo (`Project`) gets a public **SDK key** (`lead_pk_…`) minted on
connect. The customer finds it in the app at **Dashboard → Settings → SDK &
tracking**, which shows the key, the install snippet, and a live connection
status. (Projects created before tracking existed get a key generated on first
view — see `lib/sdk-key.ts`.)

The key is **public** — it only identifies the project to the ingest endpoint, so
it's safe to ship in client HTML.

## Install (one line)

Paste into the `<head>` of the product's site:

```html
<script src="https://YOUR_APP/sdk.js" data-key="lead_pk_…" defer></script>
```

That's the whole install. `public/sdk.js` then automatically:

- sends a **pageview** on load and on SPA route changes (`history.pushState` / `popstate`),
- captures **clicks** on `a`, `button`, `[role=button]`, and `[data-lead-event]`,
- batches events and flushes via `navigator.sendBeacon` on page-hide (no perf hit).

## Mark conversions

A conversion is the goal an experiment moves (signup, checkout, …). Two ways:

```html
<!-- markup, no JS -->
<a data-lead-conversion href="/signup">Start free</a>
```

```js
// programmatic
lead('conversion', 'signup', { plan: 'pro' });
```

Other helpers: `lead('track', 'hero_cta')` for a custom click, and
`lead('exposure', experimentId, variantId)` (or a `data-lead-exp` / `data-lead-variant`
wrapper) to record that a visitor saw a specific variant — that's what attributes
a conversion to a variant once experiments are live.

## How it flows

```
sdk.js  ──sendBeacon batch──▶  POST /api/ingest  ──(sdkKey → Project)──▶  Event table
                                                                          + Variant rollups
                                                                                │
                                  lib/metrics.ts aggregates ◀────────────────────┘
                                                                                │
                          Dashboard "Live tracking" + Settings status ◀──────────┘
```

## Verify it's working

Fastest → slowest:

1. **Settings → SDK & tracking → "Send test event."** Fires a real event through
   `/api/ingest` with your key; the status flips to **Connected** within a few seconds.
2. **Test harness:** open `https://YOUR_APP/sdk-test.html?key=lead_pk_…`. Loads the
   real SDK, has buttons to fire pageview/click/conversion, and logs the exact JSON
   sent to `/api/ingest`. Good for confirming the SDK before touching your own site.
3. **On your real site:** after deploying the snippet, open any page and watch the
   browser **Network tab** for a `POST` (or beacon) to `/api/ingest` returning `202`.
   Then the dashboard's **Live tracking** band shows visitors / clicks / conversions.
4. **CLI smoke test:** `bun run scripts/track-smoke.ts` (dev server running) posts
   sample events through the endpoint and prints the aggregated metrics.

## Gotchas

- After any **schema change**, restart `bun run dev` — a long-running dev server
  holds a stale generated Prisma client and `/api/ingest` will 500 with
  `Unknown argument …`.
- The ingest endpoint is intentionally public (keyed by `sdkKey`) and CORS-open, so
  the customer's site can post cross-origin. An unknown key is silently accepted
  (204) so we don't leak which keys are valid.
