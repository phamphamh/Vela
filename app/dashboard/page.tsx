import Link from "next/link";
import { ArrowUpRight, Check, Sparkles } from "lucide-react";

import {
  ActiveExperiments,
  type ActiveExperiment,
} from "@/components/dashboard/experiment-preview";
import { RealtimeOverview } from "@/components/dashboard/realtime-overview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* --- mock data -------------------------------------------------------- */

const kpis = [
  { label: "Active experiments", value: "5", sub: "2 awaiting review" },
  { label: "Win rate", value: "38%", sub: "last 30 days" },
  {
    label: "Cumulative uplift",
    value: "+18.2%",
    sub: "since connecting",
    accent: true,
  },
  { label: "Visitors in test", value: "12,480", sub: "last 14 days" },
];

const active: ActiveExperiment[] = [
  {
    id: "142",
    surface: "Paywall",
    title: "Pricing emphasis",
    status: "RUNNING",
    uplift: "+12.4%",
    confidence: "95%",
    visitors: "3,201",
    hypothesis:
      "Leading with annual savings (vs. the monthly price) reduces price anchoring and lifts checkout starts.",
    preview: {
      kind: "paywall",
      url: "acme.com/pricing",
      before: { plan: "Pro", price: "$29", period: "/mo", cta: "Start free trial" },
      after: {
        plan: "Pro",
        price: "$279",
        period: "/yr",
        badge: "Save 20%",
        subnote: "$23/mo billed annually",
        cta: "Start free trial",
      },
    },
  },
  {
    id: "139",
    surface: "Onboarding",
    title: "Shorter signup",
    status: "CONCLUSIVE",
    uplift: "+9.1%",
    confidence: "98%",
    visitors: "5,402",
    hypothesis:
      "Cutting the signup form to email-only and deferring the rest raises activation.",
    preview: {
      kind: "onboarding",
      url: "acme.com/signup",
      before: {
        fields: ["Full name", "Work email", "Company", "Team size", "Role", "Password"],
        cta: "Create account",
      },
      after: {
        fields: ["Work email"],
        cta: "Continue",
        note: "We’ll email you a magic link — no password.",
      },
    },
  },
  {
    id: "141",
    surface: "Landing",
    title: "Hero headline",
    status: "RUNNING",
    uplift: "+3.2%",
    confidence: "71%",
    visitors: "2,140",
    hypothesis:
      "An outcome-led headline beats the feature-led one on signups from cold traffic.",
    preview: {
      kind: "landing",
      url: "acme.com",
      before: {
        headline: "Feature-rich analytics for modern teams",
        sub: "Dashboards, reports, and integrations in one place.",
        cta: "Learn more",
      },
      after: {
        headline: "Know what your users do — in 5 minutes",
        sub: "Live dashboards from day one. No setup, no SQL.",
        cta: "Start free",
        proof: "Trusted by 2,000+ teams",
      },
    },
  },
  {
    id: "143",
    surface: "Paywall",
    title: "Annual default",
    status: "QUEUED",
    uplift: "—",
    confidence: "—",
    visitors: "—",
    hypothesis:
      "Pre-selecting the annual plan with a savings cue increases ARPU without raising churn.",
    preview: {
      kind: "paywall",
      url: "acme.com/pricing",
      before: { plan: "Billed monthly", price: "$29", period: "/mo", cta: "Choose plan" },
      after: {
        plan: "Billed annually",
        price: "$23",
        period: "/mo",
        badge: "Best value · Save 20%",
        subnote: "$279 billed yearly",
        cta: "Choose plan",
      },
    },
  },
];

const review: {
  surface: string;
  title: string;
  kind: "draft" | "conclusive";
  note: string;
}[] = [
  {
    surface: "Paywall",
    title: "Annual plan emphasis",
    kind: "draft",
    note: "Agent drafted 1 variant",
  },
  {
    surface: "Onboarding",
    title: "Shorter signup",
    kind: "conclusive",
    note: "+9.1% at 98% confidence",
  },
  {
    surface: "Landing",
    title: "Social proof above the fold",
    kind: "draft",
    note: "Agent drafted 2 variants",
  },
];

const activity = [
  { text: "Drafted paywall variant “annual emphasis”", time: "12m" },
  { text: "Reached significance on onboarding test", time: "1h" },
  { text: "Opened PR #318 on acme/web", time: "2h" },
  { text: "Analyzed landing page", time: "3h" },
  { text: "Started experiment #142", time: "5h" },
];

/* --- page ------------------------------------------------------------- */

export default function OverviewPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono">acme/web</span> · last 14 days
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Sparkles className="size-4" />
          Run audit
        </Button>
      </div>

      {/* live tracking — real data from the SDK ingest pipeline */}
      <RealtimeOverview />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="space-y-1">
              <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                {k.label}
              </div>
              <div
                className={cn(
                  "font-mono text-3xl font-semibold tabular-nums",
                  k.accent && "text-primary",
                )}
              >
                {k.value}
              </div>
              <div className="text-xs text-muted-foreground">{k.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* two-column: review + activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Needs your review</CardTitle>
            <CardDescription>
              Drafts to approve and conclusive tests to decide.
            </CardDescription>
            <CardAction>
              <Badge variant="secondary" className="tabular-nums">
                {review.length}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {review.map((r) => (
              <div
                key={r.title}
                className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <Badge variant="outline" className="shrink-0">
                  {r.surface}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{r.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {r.note}
                  </div>
                </div>
                {r.kind === "conclusive" ? (
                  <div className="flex items-center gap-2">
                    <Button size="sm">Ship winner</Button>
                    <Button size="sm" variant="ghost">
                      View
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button size="sm">Approve</Button>
                    <Button size="sm" variant="ghost">
                      View diff
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent activity</CardTitle>
            <CardDescription>Orchestrator · review-gated</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 text-sm">
            {activity.map((a) => (
              <div key={a.text} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <Check className="size-3" />
                </span>
                <span className="min-w-0 flex-1 text-muted-foreground">
                  {a.text}
                </span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground/70">
                  {a.time}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* active experiments — click a row to preview the change */}
      <Card>
        <CardHeader>
          <CardTitle>Active experiments</CardTitle>
          <CardDescription>
            Live and queued across all surfaces — click to preview the change.
          </CardDescription>
          <CardAction>
            <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
              <Link href="/dashboard/experiments">
                View all
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ActiveExperiments data={active} />
        </CardContent>
      </Card>
    </div>
  );
}
