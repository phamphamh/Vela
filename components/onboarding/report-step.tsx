"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CircleCheckBig,
  CreditCard,
  LayoutTemplate,
  Route,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { LaunchExperiment } from "@/components/dashboard/launch-experiment";
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
import {
  type AuditResult,
  type Impact,
  type SurfaceKey,
} from "@/lib/agents/types";
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

function scoreTone(score: number) {
  if (score >= 70) return "text-success";
  if (score >= 55) return "text-chart-2";
  return "text-destructive";
}

export function ReportStep({
  repoName,
  audit,
}: {
  repoName: string;
  audit: AuditResult;
}) {
  const surfaces = audit.surfaces;
  const opportunityCount = surfaces.reduce((n, s) => n + s.advice.length, 0);
  const avgScore =
    surfaces.length > 0
      ? Math.round(
          surfaces.reduce((n, s) => n + s.score, 0) / surfaces.length,
        )
      : 0;

  // The highest-impact opportunity seeds the launch agent (High → Medium → Low).
  const rank: Record<Impact, number> = { High: 0, Medium: 1, Low: 2 };
  const topOpportunity = surfaces
    .flatMap((s) => s.advice.map((a) => ({ surface: s.key, advice: a })))
    .sort((x, y) => rank[x.advice.impact] - rank[y.advice.impact])[0];

  const summary = [
    { label: "Surfaces detected", value: String(surfaces.length) },
    { label: "Opportunities", value: String(opportunityCount) },
    { label: "Avg health", value: `${avgScore}/100`, accent: true },
    { label: "To first test", value: "~5 min" },
  ];

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* header */}
      <div className="space-y-2 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-success/15 text-success">
          <CircleCheckBig className="size-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit complete</h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what the agent found in{" "}
          <span className="font-mono">{repoName}</span> and where the biggest
          wins are.
        </p>
      </div>

      {/* summary KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summary.map((s) => (
          <Card key={s.label}>
            <CardContent className="space-y-0.5 px-4">
              <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                {s.label}
              </div>
              <div
                className={cn(
                  "font-mono text-2xl font-semibold tabular-nums",
                  s.accent && "text-primary",
                )}
              >
                {s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {surfaces.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            The agent didn&apos;t find a landing, onboarding, or paywall surface
            in this repository. Try connecting the repo that holds your
            marketing or product UI.
          </CardContent>
        </Card>
      )}

      {/* per-surface audits */}
      <div className="space-y-4">
        {surfaces.map((s) => {
          const Icon = SURFACE_ICON[s.key];
          // Keep the onboarding report scannable — the full detail lives in the
          // dashboard. Show only the top issue and the top two opportunities.
          const topIssue = s.issues[0];
          const topAdvice = s.advice.slice(0, 2);
          const moreCount =
            s.advice.length - topAdvice.length + Math.max(0, s.issues.length - 1);

          return (
            <Card key={s.key}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="flex items-center gap-2.5 text-lg">
                    <span className="flex size-8 items-center justify-center rounded-md border border-border bg-muted/40">
                      <Icon className="size-5 text-primary" />
                    </span>
                    {s.name}
                  </CardTitle>
                  <span
                    className={cn(
                      "font-mono text-lg font-semibold tabular-nums",
                      scoreTone(s.score),
                    )}
                  >
                    {s.score}
                    <span className="text-sm text-muted-foreground">/100</span>
                  </span>
                </div>
                <CardDescription className="text-base leading-relaxed">
                  {s.summary}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <MeterBar
                  value={s.score}
                  tone={s.score >= 70 ? "success" : "primary"}
                />

                {topIssue && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-chart-2" />
                    <span>{topIssue}</span>
                  </div>
                )}

                {/* top opportunities */}
                <div className="space-y-4 border-t border-border pt-4">
                  <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                    Top {topAdvice.length > 1 ? "opportunities" : "opportunity"}
                  </div>
                  {topAdvice.map((a) => (
                    <div key={a.title} className="flex items-start gap-3">
                      <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-medium">{a.title}</span>
                          <Badge
                            variant="outline"
                            className={cn("font-normal", impactTone[a.impact])}
                          >
                            {a.impact}
                          </Badge>
                          <span className="font-mono text-xs tabular-nums text-primary">
                            {a.est}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {a.rationale}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        asChild
                      >
                        <Link href="/dashboard/experiments">Draft</Link>
                      </Button>
                    </div>
                  ))}
                  {moreCount > 0 && (
                    <p className="pl-7 text-xs text-muted-foreground">
                      +{moreCount} more finding{moreCount > 1 ? "s" : ""} in the
                      dashboard
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CTA — launch the first real A/B test from the top opportunity. */}
      {surfaces.length > 0 && (
        <div className="space-y-3">
          <LaunchExperiment
            refresh={false}
            hint={
              topOpportunity
                ? {
                    surface: topOpportunity.surface,
                    title: topOpportunity.advice.title,
                    rationale: topOpportunity.advice.rationale,
                  }
                : undefined
            }
          />
          <div className="text-center">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard" className="text-muted-foreground">
                Skip to dashboard
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
