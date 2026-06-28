import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Check,
  Folder,
  GitBranch,
  GitPullRequest,
  RefreshCw,
  Search,
  Shuffle,
  TrendingUp,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Faq } from "@/components/marketing/faq"
import { HeroMetric } from "@/components/marketing/hero-metric"
import { SiteFooter } from "@/components/site/site-footer"
import { SiteNav } from "@/components/site/site-nav"

export const metadata: Metadata = {
  title: "Vela — Your landing optimizes itself. In real code.",
  description:
    "Vela is the autonomous CRO agent for B2B SaaS. It connects your GitHub repo, audits your code, drafts variants as review-gated PRs, A/B tests them on real traffic, and iterates — you review and merge.",
}

/* --- small building blocks -------------------------------------------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 font-mono text-xs uppercase tracking-[0.08em] text-primary">
      {children}
    </div>
  )
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M12 2A10 10 0 0 0 8.84 21.5c.5.08.66-.23.66-.5v-1.7C6.73 19.91 6.14 18 6.14 18A2.69 2.69 0 0 0 5 16.5c-.91-.62.07-.6.07-.6a2.1 2.1 0 0 1 1.53 1 2.15 2.15 0 0 0 2.91.83 2.16 2.16 0 0 1 .63-1.34C8 16.17 5.62 15.3 5.62 11.5a3.87 3.87 0 0 1 1-2.71 3.58 3.58 0 0 1 .1-2.64s.84-.27 2.75 1a9.63 9.63 0 0 1 5 0c1.91-1.29 2.75-1 2.75-1a3.58 3.58 0 0 1 .1 2.64 3.87 3.87 0 0 1 1 2.71c0 3.81-2.34 4.66-4.57 4.91a2.39 2.39 0 0 1 .69 1.85V21c0 .27.16.59.67.5A10 10 0 0 0 12 2z" />
    </svg>
  )
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-sm text-foreground">
      <Check
        className="mt-px size-[17px] flex-none text-success"
        strokeWidth={2.2}
      />
      {children}
    </li>
  )
}

/* --- page ------------------------------------------------------------- */

export default function Home() {
  return (
    <div className="flex min-h-full flex-col overflow-x-hidden bg-background">
      <SiteNav />

      {/* ============ HERO ============ */}
      <header id="top" className="relative px-6 pt-16 pb-14">
        {/* warm radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background:radial-gradient(80%_60%_at_78%_-5%,color-mix(in_oklch,var(--primary),transparent_92%),transparent_55%)]"
        />
        {/* dotted grid mask */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-45 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(180deg,black,transparent_70%)]"
        />

        <div className="relative mx-auto grid max-w-[1160px] grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* left */}
          <div>
            <div className="mb-[22px] inline-flex h-7 items-center gap-2 rounded-full border border-border bg-card/70 px-3 text-[12.5px] text-muted-foreground">
              <span className="size-[7px] animate-pulse rounded-full bg-success motion-reduce:animate-none" />
              <span className="font-mono">
                The CRO agent that ships, not advises
              </span>
            </div>
            <h1 className="mb-5 text-[clamp(36px,5vw,58px)] font-semibold leading-[1.05] tracking-[-0.03em] text-balance">
              Your landing optimizes <span className="text-primary">itself.</span>{" "}
              In real code.
            </h1>
            <p className="mb-[30px] max-w-[520px] text-[clamp(16px,1.6vw,18.5px)] text-pretty text-muted-foreground">
              <strong className="font-medium text-foreground">Vela</strong>{" "}
              connects your GitHub repo, audits your code, drafts variants (PR +
              feature flag), A/B tests them on real traffic and iterates —
              autonomously. You review and merge. Or you don&apos;t.
            </p>
            <div className="mb-[22px] flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-[46px] px-[22px] text-[15px]">
                <Link href="/onboarding" data-cta="get-started">
                  Get started
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-[46px] px-[18px] text-[15px] hover:border-primary"
              >
                <Link href="/audit" data-cta="free-audit">Audit my landing — free</Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-success" strokeWidth={2.2} />
                No unreviewed deploys
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-success" strokeWidth={2.2} />
                100% in your repo
              </span>
            </div>
          </div>

          {/* right: control room dashboard mock */}
          <div className="relative">
            <div className="overflow-hidden rounded-[14px] bg-card shadow-[0_0_0_1px_var(--border),0_24px_60px_-28px_color-mix(in_oklch,var(--foreground),transparent_60%)]">
              {/* window chrome */}
              <div className="flex h-[38px] items-center gap-2 border-b border-border bg-muted/65 px-3.5">
                <span className="size-[9px] rounded-full bg-foreground/20" />
                <span className="size-[9px] rounded-full bg-foreground/20" />
                <span className="size-[9px] rounded-full bg-foreground/20" />
                <span className="ml-1.5 font-mono text-[11.5px] text-muted-foreground">
                  Vela · control room
                </span>
                <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[11px] text-success">
                  <span className="size-1.5 animate-pulse rounded-full bg-success motion-reduce:animate-none" />
                  agent active
                </span>
              </div>
              <div className="p-[18px]">
                {/* metric */}
                <div className="mb-[18px] flex items-end justify-between gap-4">
                  <div>
                    <div className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
                      Qualified leads · 30d
                    </div>
                    <div className="flex items-baseline gap-2.5">
                      <HeroMetric target={342} />
                      <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold tabular-nums text-success">
                        <TrendingUp className="size-3.5" strokeWidth={2.4} />
                        +34%
                      </span>
                    </div>
                  </div>
                  <svg
                    width="150"
                    height="52"
                    viewBox="0 0 150 52"
                    className="flex-none"
                    aria-hidden
                  >
                    <polyline
                      points="0,44 22,40 44,42 66,30 88,26 110,16 132,12 150,6 150,52 0,52"
                      fill="var(--primary)"
                      fillOpacity={0.08}
                      stroke="none"
                    />
                    <polyline
                      points="0,44 22,40 44,42 66,30 88,26 110,16 132,12 150,6"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="150" cy="6" r="3" fill="var(--primary)" />
                  </svg>
                </div>
                {/* experiments */}
                <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
                  Running experiments
                </div>
                <div className="flex flex-col overflow-hidden rounded-lg border border-border">
                  <div className="flex items-center gap-2.5 border-b border-border px-3 py-[11px]">
                    <span className="flex-none font-mono text-[11px] text-muted-foreground">
                      exp_47
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px]">
                      Hero headline · A/B
                    </span>
                    <span className="text-[11.5px] font-semibold tabular-nums text-success">
                      +18%
                    </span>
                    <span className="inline-flex h-[19px] items-center rounded-full bg-success/15 px-2 font-mono text-[11px] font-medium text-success">
                      winner
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 border-b border-border px-3 py-[11px]">
                    <span className="flex-none font-mono text-[11px] text-muted-foreground">
                      exp_52
                    </span>
                    <span className="min-w-0 flex-1 text-[12.5px]">
                      Pricing CTA · A/B/C
                    </span>
                    <div className="h-[5px] w-[54px] flex-none overflow-hidden rounded-full bg-muted">
                      <div className="h-full w-[64%] bg-chart-2" />
                    </div>
                    <span className="inline-flex h-[19px] items-center rounded-full bg-chart-2/20 px-2 font-mono text-[11px] font-medium text-chart-2">
                      running
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-[11px]">
                    <span className="flex-none font-mono text-[11px] text-muted-foreground">
                      exp_53
                    </span>
                    <span className="min-w-0 flex-1 text-[12.5px]">
                      Social proof position
                    </span>
                    <span className="inline-flex h-[19px] items-center rounded-full bg-muted px-2 font-mono text-[11px] font-medium text-muted-foreground">
                      queued
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ============ TRUST STRIP ============ */}
      <div className="border-y border-border bg-muted/55">
        <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-center gap-x-[22px] gap-y-3 px-6 py-[18px]">
          <span data-lead-exp="cmqxkpyay00071dpepaitycqm" data-lead-b="Growth teams shipping CRO wins with Vela" className="font-mono text-xs uppercase tracking-[0.05em] text-muted-foreground">
            Growth teams already dogfooding
          </span>
          <div className="flex flex-wrap items-center gap-x-[26px] gap-y-2 text-base font-semibold tracking-tight opacity-60">
            <span>Hookflow</span>
            <span>Castl</span>
            <span>Paretto</span>
            <span>Northwind</span>
            <span>DEScript</span>
            <span>Velour</span>
          </div>
        </div>
      </div>

      {/* ============ PROBLEM ============ */}
      <section className="mx-auto max-w-[1160px] px-6 pt-[72px] pb-2">
        <div className="mb-10 max-w-[680px]">
          <Eyebrow>The problem</Eyebrow>
          <h2 className="mb-3.5 text-[clamp(26px,3.4vw,40px)] font-semibold leading-[1.1] tracking-[-0.02em] text-balance">
            Classic CRO is slow, expensive, and ends up in the backlog.
          </h2>
          <p className="text-base text-pretty text-muted-foreground">
            You know your landing could convert better. But between the $6k/mo
            agency, the tool that only does dashboards, and a product roadmap
            that&apos;s already full — nothing ever moves.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              n: "01",
              t: "Agencies advise, they don't ship",
              d: "You get a 40-slide PDF. Implementation lands back on your team — and comes after everything else.",
            },
            {
              n: "02",
              t: "CRO tools measure, they don't fix",
              d: "Endless heatmaps and session replays. You know something's off, but writing the code is still on you.",
            },
            {
              n: "03",
              t: "CRO always loses the trade-off",
              d: "Against a feature or a critical bug, “change the H1” never wins the sprint. The test never ships.",
            },
          ].map((item) => (
            <div key={item.n} className="flex flex-col gap-2.5">
              <span className="font-mono text-[13px] text-destructive">
                {item.n}
              </span>
              <div className="text-[15.5px] font-semibold">{item.t}</div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section
        id="how"
        className="mx-auto max-w-[1160px] scroll-mt-[70px] px-6 py-16"
      >
        <div className="mb-10 max-w-[680px]">
          <Eyebrow>The loop, on autopilot</Eyebrow>
          <h2 className="mb-3.5 text-[clamp(26px,3.4vw,40px)] font-semibold leading-[1.1] tracking-[-0.02em]">
            You connect your repo. The agent runs the loop.
          </h2>
          <p className="text-base text-pretty text-muted-foreground">
            Five steps that chain together on their own — and every change stays
            a diff you can reject.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              n: "01",
              icon: Search,
              t: "Audit",
              d: "The agent reads your code and spots what's blocking conversion.",
            },
            {
              n: "02",
              icon: GitBranch,
              t: "Draft",
              d: "It writes the variants. Real code, a PR, behind a feature flag.",
            },
            {
              n: "03",
              icon: Shuffle,
              t: "A/B test",
              d: "Variants live, traffic split, measured live on your real visitors.",
            },
            {
              n: "04",
              icon: BarChart3,
              t: "Measure",
              d: "Qualified leads, not vanity clicks. The data decides, not the HiPPO.",
            },
            {
              n: "05",
              icon: RefreshCw,
              t: "Iterate",
              d: "Keeps the winner, starts again on the next weak point.",
              loop: true,
            },
          ].map((step) => {
            const Icon = step.icon
            return (
              <div
                key={step.n}
                className="flex min-h-[176px] flex-col gap-3 bg-card px-[18px] py-[22px]"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={
                      step.loop
                        ? "inline-flex size-[34px] items-center justify-center rounded-lg bg-primary text-primary-foreground"
                        : "inline-flex size-[34px] items-center justify-center rounded-lg bg-primary/12 text-primary"
                    }
                  >
                    <Icon className="size-[17px]" strokeWidth={2} />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {step.n}
                  </span>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center gap-[7px] text-[15px] font-semibold">
                    {step.t}
                    {step.loop ? (
                      <span className="font-mono text-[11px] text-primary">
                        ↻ on loop
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[13px] leading-relaxed text-muted-foreground">
                    {step.d}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ============ PRODUCT DEEP-DIVE ============ */}
      <section
        id="product"
        className="mx-auto max-w-[1160px] scroll-mt-[70px] px-6 pt-12 pb-2"
      >
        <div className="mb-12 max-w-[680px]">
          <Eyebrow>The product</Eyebrow>
          <h2 className="text-[clamp(26px,3.4vw,40px)] font-semibold leading-[1.1] tracking-[-0.02em]">
            An agent inside your repo. Not a layer on top.
          </h2>
        </div>

        {/* feature 1 : connect repo */}
        <div className="mb-16 grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="mb-3.5 inline-flex items-center gap-[7px] font-mono text-xs text-primary">
              <span className="inline-flex size-[22px] items-center justify-center rounded-md bg-primary/12">
                <GithubMark className="size-[13px]" />
              </span>
              STEP 1
            </div>
            <h3 className="mb-3 text-[23px] font-semibold tracking-[-0.01em]">
              Connect your repo in 2 minutes
            </h3>
            <p className="mb-4 max-w-[460px] text-[15.5px] leading-relaxed text-muted-foreground">
              A GitHub app, scoped permissions, and you&apos;re off. The agent
              works on branches — never on your main without your green light.
            </p>
            <ul className="flex flex-col gap-2.5">
              <CheckItem>Read / PR permissions only</CheckItem>
              <CheckItem>Next.js, React, Vue, Astro, SvelteKit…</CheckItem>
              <CheckItem>Revocable in one click, anytime</CheckItem>
            </ul>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_16px_40px_-26px_color-mix(in_oklch,var(--foreground),transparent_60%)]">
            <div className="flex h-9 items-center gap-2 border-b border-border px-3.5 font-mono text-[11.5px] text-muted-foreground">
              <GithubMark className="size-3.5" />
              github · connection
            </div>
            <div className="flex flex-col gap-2 p-3.5">
              <div className="flex items-center gap-2.5 rounded-lg border border-primary bg-primary/[0.06] px-3 py-2.5">
                <Folder
                  className="size-[15px] text-muted-foreground"
                  strokeWidth={2}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium">
                    acme/marketing-site
                  </div>
                  <div className="font-mono text-[11.5px] text-muted-foreground">
                    main · Next.js 16
                  </div>
                </div>
                <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-success/15 px-2.5 font-mono text-[11.5px] font-medium text-success">
                  <span className="size-1.5 rounded-full bg-success" />
                  connected
                </span>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 opacity-70">
                <Folder
                  className="size-[15px] text-muted-foreground"
                  strokeWidth={2}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium">
                    acme/app-dashboard
                  </div>
                  <div className="font-mono text-[11.5px] text-muted-foreground">
                    main · React
                  </div>
                </div>
                <span className="text-[12px] font-medium text-primary">
                  Connect
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* feature 2 : real code, review-gated */}
        <div className="mb-16 grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div className="lg:order-2">
            <div className="mb-3.5 inline-flex items-center gap-[7px] font-mono text-xs text-primary">
              <span className="inline-flex size-[22px] items-center justify-center rounded-md bg-primary/12">
                <GitPullRequest className="size-[13px]" strokeWidth={2} />
              </span>
              STEP 2
            </div>
            <h3 className="mb-3 text-[23px] font-semibold tracking-[-0.01em]">
              Real code, in a PR. You stay in control.
            </h3>
            <p className="mb-4 max-w-[460px] text-[15.5px] leading-relaxed text-muted-foreground">
              Every variant arrives as a review-gated pull request, behind a
              feature flag. You read the diff, comment, merge — or close it.
              Nothing ships to prod without you.
            </p>
            <ul className="flex flex-col gap-2.5">
              <CheckItem>Review-gated by default — zero auto-merge</CheckItem>
              <CheckItem>Your code style, your design system</CheckItem>
              <CheckItem>Instant rollback via the flag</CheckItem>
            </ul>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_16px_40px_-26px_color-mix(in_oklch,var(--foreground),transparent_60%)] lg:order-1">
            <div className="flex items-center gap-2 border-b border-border px-3.5 py-3">
              <GitPullRequest className="size-[15px] text-primary" strokeWidth={2} />
              <span className="text-[13px] font-semibold">
                Variant: outcome-driven hero CTA
              </span>
              <span className="ml-auto inline-flex h-5 items-center gap-1.5 rounded-full bg-chart-2/20 px-2 font-mono text-[11px] text-chart-2">
                <span className="size-1.5 rounded-full bg-chart-2" />
                review-gated
              </span>
            </div>
            <div className="py-1.5 font-mono text-[12px] leading-[1.75]">
              <div className="flex px-3 py-px text-muted-foreground">
                <span className="w-[26px] flex-none opacity-50">12</span>
                <span>&lt;a class=&quot;btn-primary&quot;&gt;</span>
              </div>
              <div className="flex bg-destructive/[0.08] px-3 py-px text-destructive">
                <span className="w-[26px] flex-none opacity-60">−13</span>
                <span>&nbsp;&nbsp;Get started</span>
              </div>
              <div className="flex bg-success/10 px-3 py-px text-success">
                <span className="w-[26px] flex-none opacity-60">+13</span>
                <span>&nbsp;&nbsp;Book a demo — 20 min</span>
              </div>
              <div className="flex px-3 py-px text-muted-foreground">
                <span className="w-[26px] flex-none opacity-50">14</span>
                <span>&lt;/a&gt;</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 border-t border-border bg-muted/60 px-3.5 py-[11px]">
              <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-success">
                <Check className="size-3.5" strokeWidth={2.4} />
                checks passed
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                +1 −1 · 1 file
              </span>
              <span className="ml-auto inline-flex h-7 items-center rounded-md bg-success px-3 text-[12.5px] font-semibold text-success-foreground">
                Merge
              </span>
            </div>
          </div>
        </div>

        {/* feature 3 : measure */}
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="mb-3.5 inline-flex items-center gap-[7px] font-mono text-xs text-primary">
              <span className="inline-flex size-[22px] items-center justify-center rounded-md bg-primary/12">
                <BarChart3 className="size-[13px]" strokeWidth={2} />
              </span>
              STEP 3
            </div>
            <h3 className="mb-3 text-[23px] font-semibold tracking-[-0.01em]">
              Measure leads, not clicks
            </h3>
            <p className="mb-4 max-w-[460px] text-[15.5px] leading-relaxed text-muted-foreground">
              The agent wires conversion to what actually matters: booked demos,
              activated signups, pipeline. Statistical significance computed,
              winner promoted automatically — loser rolled back.
            </p>
            <ul className="flex flex-col gap-2.5">
              <CheckItem>Goal = qualified lead, not page-view</CheckItem>
              <CheckItem>Significance before any decision</CheckItem>
              <CheckItem>Connect your existing CRM / analytics</CheckItem>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-[18px] shadow-[0_16px_40px_-26px_color-mix(in_oklch,var(--foreground),transparent_60%)]">
            <div className="mb-[18px] flex items-center justify-between">
              <span className="text-[13px] font-semibold">
                exp_47 · Hero headline
              </span>
              <span className="inline-flex h-5 items-center rounded-full bg-success/15 px-2 font-mono text-[11px] text-success">
                significant · 96%
              </span>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <div className="mb-1.5 flex justify-between text-[12px]">
                  <span className="font-mono text-muted-foreground">
                    A · control
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    4.2% · 51 leads
                  </span>
                </div>
                <div className="h-6 overflow-hidden rounded-md bg-muted">
                  <div className="h-full w-[56%] bg-chart-5" />
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-[12px]">
                  <span className="inline-flex items-center gap-1.5 font-mono font-semibold">
                    B · variant <span className="text-success">winner</span>
                  </span>
                  <span className="font-semibold tabular-nums">
                    5.0% · 68 leads
                  </span>
                </div>
                <div className="h-6 overflow-hidden rounded-md bg-muted">
                  <div className="h-full w-full bg-primary" />
                </div>
              </div>
            </div>
            <div className="mt-[18px] flex items-center gap-2 border-t border-border pt-3.5">
              <TrendingUp className="size-[15px] text-success" strokeWidth={2.2} />
              <span className="text-[13px] font-medium">
                +18% qualified demos
              </span>
              <span className="ml-auto font-mono text-[12px] text-muted-foreground">
                promoted to prod →
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ COMPARISON ============ */}
      <section
        id="compare"
        className="mx-auto max-w-[1160px] scroll-mt-[70px] px-6 py-[72px]"
      >
        <div className="mb-9 max-w-[680px]">
          <Eyebrow>Comparison</Eyebrow>
          <h2 className="text-[clamp(26px,3.4vw,40px)] font-semibold leading-[1.1] tracking-[-0.02em]">
            Why not an agency, a tool, or a hire?
          </h2>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="bg-muted/65">
                <th className="px-4 py-3.5 text-left font-mono text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                  Criterion
                </th>
                <th className="border-l border-border bg-primary/[0.07] px-4 py-3.5 text-center font-semibold text-primary">
                  Vela
                </th>
                <th className="border-l border-border px-4 py-3.5 text-center font-medium text-muted-foreground">
                  CRO agency
                </th>
                <th className="border-l border-border px-4 py-3.5 text-center font-medium text-muted-foreground">
                  CRO tool
                </th>
                <th className="border-l border-border px-4 py-3.5 text-center font-medium text-muted-foreground">
                  In-house hire
                </th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[
                {
                  c: "Writes the code for you",
                  lead: <span className="text-success">✓ PRs ready</span>,
                  agency: "—",
                  tool: "—",
                  hire: <span className="text-success">✓</span>,
                },
                {
                  c: "Runs 24/7, on loop",
                  lead: <span className="text-success">✓</span>,
                  agency: "—",
                  tool: "—",
                  hire: "—",
                },
                {
                  c: "Code in your repo, your stack",
                  lead: <span className="text-success">✓</span>,
                  agency: "sometimes",
                  tool: (
                    <span className="text-destructive">third-party script</span>
                  ),
                  hire: <span className="text-success">✓</span>,
                },
                {
                  c: "Time to first test",
                  lead: <span className="font-semibold">days</span>,
                  agency: "weeks",
                  tool: "days",
                  hire: "months",
                },
                {
                  c: "Indicative monthly cost",
                  lead: <span className="font-semibold">$$</span>,
                  agency: "$$$$",
                  tool: "$$",
                  hire: "$$$$$",
                },
              ].map((row) => (
                <tr key={row.c} className="border-t border-border">
                  <td className="px-4 py-3.5 text-foreground">{row.c}</td>
                  <td className="border-l border-border bg-primary/[0.04] px-4 py-3.5 text-center">
                    {row.lead}
                  </td>
                  <td className="border-l border-border px-4 py-3.5 text-center text-muted-foreground">
                    {row.agency}
                  </td>
                  <td className="border-l border-border px-4 py-3.5 text-center text-muted-foreground">
                    {row.tool}
                  </td>
                  <td className="border-l border-border px-4 py-3.5 text-center text-muted-foreground">
                    {row.hire}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============ PROOF ============ */}
      <section className="border-y border-border bg-muted/70">
        <div className="mx-auto max-w-[1160px] px-6 py-16">
          <div className="mb-9 max-w-[720px]">
            <Eyebrow>We eat our own dog food</Eyebrow>
            <h2 className="mb-3 text-[clamp(26px,3.4vw,40px)] font-semibold leading-[1.12] tracking-[-0.02em] text-balance">
              The free audit you can run? That&apos;s exactly what the agent does
              continuously on your repo.
            </h2>
            <p className="text-base text-pretty text-muted-foreground">
              The public audit is a login-free preview of the first pass. Connect
              your GitHub and the real loop runs on your code, 24/7.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4">
            {[
              {
                v: "+34%",
                d: "more qualified leads on average, first 90 days",
                primary: true,
              },
              { v: "11d", d: "to the first winning variant" },
              { v: "0", d: "unreviewed deploys. Ever." },
              { v: "100%", d: "of the code in your repo, your stack" },
            ].map((stat) => (
              <div key={stat.v} className="bg-card px-5 py-6">
                <div
                  className={
                    stat.primary
                      ? "text-[34px] font-semibold tracking-[-0.02em] tabular-nums text-primary"
                      : "text-[34px] font-semibold tracking-[-0.02em] tabular-nums"
                  }
                >
                  {stat.v}
                </div>
                <div className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
                  {stat.d}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ AUDIT FUNNEL BAND ============ */}
      <section className="mx-auto max-w-[1160px] px-6 py-16">
        <div className="grid grid-cols-1 items-center gap-7 rounded-2xl border border-border bg-card p-[clamp(28px,4vw,44px)] shadow-[0_16px_44px_-30px_color-mix(in_oklch,var(--foreground),transparent_60%)] lg:grid-cols-2">
          <div>
            <div className="mb-3.5 inline-flex h-[26px] items-center gap-2 rounded-full bg-primary/10 px-[11px] font-mono text-[12px] text-primary">
              no login · ~30s
            </div>
            <h2 className="mb-2.5 text-[clamp(22px,2.8vw,30px)] font-semibold leading-[1.15] tracking-[-0.02em] text-balance">
              Not ready to connect your repo yet?
            </h2>
            <p className="text-[15.5px] text-pretty text-muted-foreground">
              Start with the free audit. Paste your landing URL and Claude
              returns a score and 4 concrete actions — exactly what the agent
              would do first.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 px-[22px] text-[15.5px]"
            >
              <Link href="/audit" data-cta="free-audit">
                Audit my landing — free
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <span className="inline-flex items-center gap-[7px] text-[12.5px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success" />
              Powered by Claude · no card required
            </span>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section
        id="faq"
        className="mx-auto max-w-[760px] scroll-mt-[70px] px-6 pt-12 pb-6"
      >
        <div className="mb-8">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="text-[clamp(26px,3.4vw,38px)] font-semibold leading-[1.1] tracking-[-0.02em]">
            The questions we get asked
          </h2>
        </div>
        <Faq />
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="mx-auto max-w-[1160px] px-6 pt-14 pb-20">
        <div className="relative overflow-hidden rounded-[18px] bg-foreground p-[clamp(36px,6vw,64px)] text-center text-background">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 [background-image:radial-gradient(color-mix(in_oklch,var(--background),transparent_92%)_1px,transparent_1px)] [background-size:22px_22px]"
          />
          <div className="relative mx-auto max-w-[620px]">
            <h2 className="mb-3.5 text-[clamp(26px,3.6vw,42px)] font-semibold leading-[1.1] tracking-[-0.02em] text-balance">
              Connect your repo. Let the agent ship.
            </h2>
            <p className="mb-7 text-base text-pretty text-background/75">
              30 live minutes: we connect your GitHub, run the first full audit
              and show you the first variant. You stay in control of everything.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="h-12 px-6 text-[15.5px]">
                <Link href="/onboarding" data-cta="get-started">
                  Get started
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Link
                href="/audit"
                data-cta="free-audit"
                className="inline-flex h-12 items-center rounded-[9px] border border-background/30 px-5 text-[15px] font-medium text-background transition-colors hover:bg-background/10"
              >
                Run the free audit
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
