import {
  ArrowUpRight,
  Check,
  GitBranch,
  Sparkles,
  TrendingUp,
} from "lucide-react";

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

type ExStatus = "RUNNING" | "QUEUED" | "CONCLUSIVE" | "DRAFT";

const active: {
  surface: string;
  title: string;
  status: ExStatus;
  uplift: string;
  confidence: string;
  visitors: string;
}[] = [
  {
    surface: "Paywall",
    title: "Pricing emphasis",
    status: "RUNNING",
    uplift: "+12.4%",
    confidence: "95%",
    visitors: "3,201",
  },
  {
    surface: "Onboarding",
    title: "Shorter signup",
    status: "CONCLUSIVE",
    uplift: "+9.1%",
    confidence: "98%",
    visitors: "5,402",
  },
  {
    surface: "Landing",
    title: "Hero headline",
    status: "RUNNING",
    uplift: "+3.2%",
    confidence: "71%",
    visitors: "2,140",
  },
  {
    surface: "Paywall",
    title: "Annual default",
    status: "QUEUED",
    uplift: "—",
    confidence: "—",
    visitors: "—",
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

/* --- helpers ---------------------------------------------------------- */

function StatusBadge({ status }: { status: ExStatus }) {
  if (status === "RUNNING") {
    return (
      <Badge className="gap-1.5 bg-success text-success-foreground">
        <span className="size-1.5 rounded-full bg-current" />
        Running
      </Badge>
    );
  }
  if (status === "CONCLUSIVE") {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-primary/40 text-primary"
      >
        <span className="size-1.5 rounded-full bg-current" />
        Conclusive
      </Badge>
    );
  }
  if (status === "QUEUED") {
    return <Badge variant="secondary">Queued</Badge>;
  }
  return <Badge variant="secondary">Draft</Badge>;
}

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

      {/* active experiments table */}
      <Card>
        <CardHeader>
          <CardTitle>Active experiments</CardTitle>
          <CardDescription>
            Live and queued across all surfaces.
          </CardDescription>
          <CardAction>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              View all
              <ArrowUpRight className="size-4" />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {/* column headers */}
          <div className="hidden grid-cols-12 gap-3 border-b border-border pb-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground sm:grid">
            <div className="col-span-5">Experiment</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Uplift</div>
            <div className="col-span-2 text-right">Confidence</div>
            <div className="col-span-1 text-right">Visitors</div>
          </div>
          <div className="divide-y divide-border">
            {active.map((e) => (
              <div
                key={`${e.surface}-${e.title}`}
                className="grid grid-cols-2 items-center gap-3 py-3 sm:grid-cols-12"
              >
                <div className="col-span-2 flex items-center gap-2.5 sm:col-span-5">
                  <GitBranch className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {e.title}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {e.surface}
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <StatusBadge status={e.status} />
                </div>
                <div
                  className={cn(
                    "text-right font-mono text-sm tabular-nums sm:col-span-2",
                    e.uplift.startsWith("+") && "text-primary",
                  )}
                >
                  {e.uplift !== "—" && (
                    <TrendingUp className="mr-1 inline size-3.5 align-[-2px]" />
                  )}
                  {e.uplift}
                </div>
                <div className="hidden text-right font-mono text-sm tabular-nums text-muted-foreground sm:col-span-2 sm:block">
                  {e.confidence}
                </div>
                <div className="hidden text-right font-mono text-sm tabular-nums text-muted-foreground sm:col-span-1 sm:block">
                  {e.visitors}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
