import type { Metadata } from "next";
import {
  ArrowRight,
  GitBranch,
  GitPullRequest,
  Search,
  Shuffle,
  BarChart3,
  RefreshCw,
  Crosshair,
  Code2,
} from "lucide-react";

import { AuditTool } from "@/components/audit/audit-tool";
import { SiteNav } from "@/components/site/site-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { Button } from "@/components/ui/button";
import { BOOKING_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Free CRO audit — find out why your landing isn't converting | lead",
  description:
    "Free, no-login CRO audit by Claude. Paste your landing URL and get a scored report of what's blocking conversion in ~30 seconds. Then the agent drafts the fixes in real code.",
  openGraph: {
    title: "Find out why your landing isn't converting — in 30 seconds",
    description:
      "Free, no-login CRO audit by Claude. A scored report of what's blocking conversion, in ~30 seconds.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Find out why your landing isn't converting — in 30 seconds",
    description:
      "Free, no-login CRO audit by Claude. A scored report of what's blocking conversion, in ~30 seconds.",
  },
};

const STEPS: {
  n: string;
  icon: typeof Search;
  title: string;
  body: string;
  loop?: boolean;
}[] = [
  {
    n: "01",
    icon: Search,
    title: "Audit",
    body: "The agent reads your code and spots what's blocking conversion.",
  },
  {
    n: "02",
    icon: Shuffle,
    title: "Draft",
    body: "It writes the variants. Real code, a PR, behind a feature flag.",
  },
  {
    n: "03",
    icon: GitPullRequest,
    title: "A/B test",
    body: "It puts the variants live, traffic split, measurement live.",
  },
  {
    n: "04",
    icon: BarChart3,
    title: "Measure",
    body: "Qualified leads, not vanity clicks. The data decides, not opinion.",
  },
  {
    n: "05",
    icon: RefreshCw,
    title: "Iterate",
    body: "Keep the winner, move to the next weak spot.",
    loop: true,
  },
];

const DIFFERENTIATORS = [
  {
    icon: Crosshair,
    accent: "bg-success/15 text-success",
    title: "We optimize qualified leads",
    body: "Not clicks, not scroll-depth. Booked demos and signups that activate. The metrics that pay salaries.",
  },
  {
    icon: GitBranch,
    accent: "bg-primary/15 text-primary",
    title: "Every change is a diff",
    body: "The agent never touches your prod quietly. A PR, review-gated by default. You merge, or you don't.",
  },
  {
    icon: Code2,
    accent: "bg-chart-3/20 text-chart-3",
    title: "Real code, not a page builder",
    body: "The variants ship to your repo, in your stack. No no-code layer, no third-party script slowing your page.",
  },
] as const;

const PROOF_STATS: { value: string; label: string; primary?: boolean }[] = [
  { value: "+34%", label: "more qualified leads on average, first 90 days", primary: true },
  { value: "11d", label: "to the first winning variant" },
  { value: "0", label: "unreviewed deploys. Ever." },
  { value: "100%", label: "of the code in your repo, your stack" },
];

const DOGFOODING = ["Hookflow", "Castl", "Paretto", "Northwind", "DEScript"] as const;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 font-mono text-xs uppercase tracking-[0.08em] text-primary">
      {children}
    </div>
  );
}

export default function AuditPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteNav />

      <main className="flex-1">
        {/* ============ HERO + AUDIT TOOL ============ */}
        <header id="top" className="relative scroll-mt-[70px] overflow-hidden px-6 pb-16 pt-[72px]">
          {/* warm radial glow + dotted texture */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_70%_at_50%_-8%,oklch(0.66_0.17_47/0.07),transparent_58%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:24px_24px] opacity-50 [mask-image:radial-gradient(80%_60%_at_50%_12%,black,transparent_75%)]"
          />

          <div className="relative mx-auto max-w-[860px] text-center">
            <div className="mb-[26px] inline-flex h-7 items-center gap-2 rounded-full border border-border bg-card/70 px-3 text-[12.5px] text-muted-foreground">
              <span className="size-[7px] rounded-full bg-success motion-safe:animate-pulse" />
              <span className="font-mono tracking-[0.01em]">
                audit → variants → A/B test → iterate
              </span>
            </div>

            <h1 className="mx-auto mb-[22px] text-balance text-[clamp(36px,6.2vw,66px)] font-semibold leading-[1.04] tracking-[-0.03em]">
              Find out why your landing{" "}
              <span className="text-primary">isn&apos;t converting</span> — in 30
              seconds.
            </h1>

            <p className="mx-auto mb-[34px] max-w-[620px] text-pretty text-[clamp(16px,1.7vw,19px)] text-muted-foreground">
              Free audit, no login. It&apos;s the product&apos;s first pass: then
              the agent{" "}
              <strong className="font-medium text-foreground">
                drafts the variants in real code
              </strong>{" "}
              (PR + feature flag), A/B tests them and iterates. Autonomously.
            </p>

            <AuditTool />

            <p className="mt-[18px] text-[12.5px] text-muted-foreground">
              Already adopted by growth teams done with guessing.
            </p>
          </div>
        </header>

        {/* ============ HOW IT WORKS ============ */}
        <section className="mx-auto max-w-[1120px] px-6 py-16">
          <div className="mb-10 max-w-[640px]">
            <Eyebrow>The loop, on autopilot</Eyebrow>
            <h2 className="mb-3 text-[clamp(26px,3.4vw,38px)] font-semibold leading-[1.1] tracking-[-0.02em]">
              You connect your repo. The agent does the rest.
            </h2>
            <p className="text-pretty text-base text-muted-foreground">
              And every change stays a diff you can reject. Nothing ships to prod
              without your sign-off.
            </p>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-px overflow-hidden rounded-xl border border-border bg-border">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.n}
                  className="flex min-h-[172px] flex-col gap-3 bg-card px-[18px] py-[22px]"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={
                        step.loop
                          ? "inline-flex size-[34px] items-center justify-center rounded-lg bg-primary text-primary-foreground"
                          : "inline-flex size-[34px] items-center justify-center rounded-lg bg-primary/15 text-primary"
                      }
                    >
                      <Icon className="size-[17px]" />
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {step.n}
                    </span>
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5 text-[15px] font-semibold">
                      {step.title}
                      {step.loop ? (
                        <span className="font-mono text-[11px] font-normal text-primary">
                          ↻ on loop
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[13px] leading-relaxed text-muted-foreground">
                      {step.body}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ============ DIFFERENTIATION ============ */}
        <section className="mx-auto max-w-[1120px] px-6 pb-16 pt-4">
          <div className="mb-10 max-w-[640px]">
            <Eyebrow>Not yet another CRO tool</Eyebrow>
            <h2 className="text-[clamp(26px,3.4vw,38px)] font-semibold leading-[1.1] tracking-[-0.02em]">
              An agent that ships, not a dashboard that advises.
            </h2>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-start gap-5">
            {DIFFERENTIATORS.map((d) => {
              const Icon = d.icon;
              return (
                <div
                  key={d.title}
                  className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-6"
                >
                  <span
                    className={`inline-flex size-[38px] items-center justify-center rounded-[9px] ${d.accent}`}
                  >
                    <Icon className="size-[19px]" />
                  </span>
                  <h3 className="text-[17px] font-semibold">{d.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {d.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ============ PROOF / DOGFOODING ============ */}
        <section className="border-y border-border bg-muted/70">
          <div className="mx-auto max-w-[1120px] px-6 py-16">
            <div className="mb-10 max-w-[720px]">
              <Eyebrow>We eat our own dog food</Eyebrow>
              <h2 className="mb-3 text-balance text-[clamp(26px,3.4vw,38px)] font-semibold leading-[1.12] tracking-[-0.02em]">
                The audit you just ran? That&apos;s what the agent does
                continuously.
              </h2>
              <p className="text-pretty text-base text-muted-foreground">
                On your repo, on loop, automatically. The free audit is just a
                login-free preview of the first pass — the real loop runs on your
                code, 24/7.
              </p>
            </div>

            <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-px overflow-hidden rounded-xl border border-border bg-border">
              {PROOF_STATS.map((s) => (
                <div key={s.label} className="bg-card px-5 py-6">
                  <div
                    className={`text-[34px] font-semibold tabular-nums tracking-[-0.02em] ${
                      s.primary ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {s.value}
                  </div>
                  <div className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-x-[26px] gap-y-3.5">
              <span className="font-mono text-xs uppercase tracking-[0.05em] text-muted-foreground">
                Already dogfooding
              </span>
              <div className="flex flex-wrap items-center gap-x-[26px] gap-y-2 text-[17px] font-semibold tracking-[-0.01em] opacity-65">
                {DOGFOODING.map((name) => (
                  <span key={name}>{name}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============ FINAL CTA ============ */}
        <section className="mx-auto max-w-[1120px] px-6 py-20">
          <div className="relative overflow-hidden rounded-[18px] bg-foreground px-[clamp(36px,6vw,64px)] py-[clamp(36px,6vw,64px)] text-center text-background">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(oklch(0.99_0.01_90/0.08)_1px,transparent_1px)] [background-size:22px_22px]"
            />
            <div className="relative mx-auto max-w-[600px]">
              <h2 className="mb-3.5 text-balance text-[clamp(26px,3.6vw,40px)] font-semibold leading-[1.12] tracking-[-0.02em]">
                Ready to see what the agent would find in your repo?
              </h2>
              <p className="mb-7 text-pretty text-base text-background/70">
                30 minutes: we connect your GitHub live and show you the first full
                audit — the one that goes beyond the HTML.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" className="h-12 px-6 text-[15.5px]">
                  <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer">
                    Book a demo
                    <ArrowRight data-icon="inline-end" />
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 border-background/30 bg-transparent px-5 text-[15px] text-background hover:bg-background/10 hover:text-background"
                >
                  <a href="#top">Run the free audit</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
