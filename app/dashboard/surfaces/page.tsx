import { headers } from "next/headers";
import Link from "next/link";
import {
  AlertTriangle,
  CreditCard,
  LayoutTemplate,
  Route,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { LaunchOpportunityButton } from "@/components/dashboard/launch-opportunity-button";
import { MeterBar } from "@/components/dashboard/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/auth";
import { getLatestAudit } from "@/lib/experiments";
import { type Impact, type SurfaceAudit, type SurfaceKey } from "@/lib/agents/types";
import { cn } from "@/lib/utils";

const SURFACE_ICON: Record<SurfaceKey, LucideIcon> = {
  landing: LayoutTemplate,
  onboarding: Route,
  paywall: CreditCard,
};

const impactTone: Record<Impact, string> = {
  High: "border-primary/40 text-primary",
  Medium: "border-chart-2/50 text-foreground",
  Low: "text-muted-foreground",
};

// The audit's advice is qualitative; map impact to a bar value for ranking.
const IMPACT_SCORE: Record<Impact, number> = { High: 85, Medium: 62, Low: 40 };

function scoreTone(score: number) {
  if (score >= 70) return "text-success";
  if (score >= 55) return "text-chart-2";
  return "text-destructive";
}

function SurfacePanel({
  s,
  launchedTitles,
}: {
  s: SurfaceAudit;
  launchedTitles: Set<string>;
}) {
  // Rank opportunities by impact, strongest first.
  const opportunities = [...s.advice].sort(
    (a, b) => IMPACT_SCORE[b.impact] - IMPACT_SCORE[a.impact],
  );

  return (
    <div className="space-y-6">
      {/* summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-1">
            <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Health score
            </div>
            <div className={cn("font-mono text-3xl font-semibold tabular-nums", scoreTone(s.score))}>
              {s.score}
              <span className="text-base text-muted-foreground">/100</span>
            </div>
            <MeterBar value={s.score} tone={s.score >= 70 ? "success" : "primary"} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1">
            <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Opportunities
            </div>
            <div className="font-mono text-3xl font-semibold tabular-nums">
              {s.advice.length}
            </div>
            <div className="text-xs text-muted-foreground">ranked by impact</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1">
            <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Source files
            </div>
            <div className="truncate pt-1 font-mono text-sm">
              {s.routes[0] ?? "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              {s.routes.length > 1 ? `+${s.routes.length - 1} more` : "the agent analyzed"}
            </div>
          </CardContent>
        </Card>
      </div>

      {s.summary && (
        <p className="text-sm leading-relaxed text-muted-foreground">{s.summary}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* detected issues */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Detected issues</CardTitle>
            <CardDescription>What the agent flagged in the code.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {s.issues.length === 0 && (
              <p className="text-sm text-muted-foreground">No blocking issues found.</p>
            )}
            {s.issues.map((issue) => (
              <div key={issue} className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-chart-2" />
                <span className="text-sm text-muted-foreground">{issue}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* opportunity backlog — each launches a real PR */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Opportunity backlog</CardTitle>
            <CardDescription>
              Agent-proposed changes, ranked by expected impact. Launch one and the
              agent opens a reviewable A/B-test PR.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {opportunities.map((o, i) => (
              <div
                key={o.title}
                className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0"
              >
                <span className="mt-0.5 font-mono text-xs text-muted-foreground/60">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{o.title}</span>
                    <Badge variant="outline" className={cn("font-normal", impactTone[o.impact])}>
                      {o.impact} impact
                    </Badge>
                    <span className="font-mono text-[11px] tabular-nums text-primary">
                      {o.est}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{o.rationale}</p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <MeterBar value={IMPACT_SCORE[o.impact]} className="max-w-[140px]" />
                  </div>
                </div>
                <LaunchOpportunityButton
                  hint={{ surface: s.key, title: o.title, rationale: o.rationale }}
                  alreadyLaunched={launchedTitles.has(o.title.toLowerCase())}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function SurfacesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const { result, repoFullName, createdAt, launchedTitles } = session
    ? await getLatestAudit(session.user.id)
    : { result: null, repoFullName: null, createdAt: null, launchedTitles: new Set<string>() };

  const surfaces = result?.surfaces ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Surfaces</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conversion surfaces the agent analyzed
            {repoFullName ? (
              <>
                {" "}on <span className="font-mono">{repoFullName}</span>
              </>
            ) : null}
            , with ranked opportunities.
            {createdAt && (
              <span className="text-muted-foreground/70">
                {" "}· last scan {new Date(createdAt).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link href="/onboarding">
            <Sparkles className="size-4" />
            Re-scan surfaces
          </Link>
        </Button>
      </div>

      {surfaces.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No audit yet. Run the codebase audit to detect your landing,
              onboarding, and paywall surfaces and their opportunities.
            </p>
            <Button size="sm" asChild>
              <Link href="/onboarding">
                <Sparkles className="size-4" />
                Run the audit
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={surfaces[0].key} className="gap-6">
          <TabsList>
            {surfaces.map((s) => {
              const Icon = SURFACE_ICON[s.key];
              return (
                <TabsTrigger key={s.key} value={s.key} className="gap-1.5">
                  <Icon className="size-4" />
                  {s.name}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {surfaces.map((s) => (
            <TabsContent key={s.key} value={s.key}>
              <SurfacePanel s={s} launchedTitles={launchedTitles} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
