import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCode2,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { ExperimentControls } from "@/components/dashboard/experiment-controls";
import { MeterBar, StatusBadge, type ExperimentStatus } from "@/components/dashboard/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/auth";
import { getExperimentDetail } from "@/lib/experiments";
import { cn } from "@/lib/utils";

const CONF_TARGET = 0.95;

export default async function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const e = session ? await getExperimentDetail(session.user.id, id) : null;
  if (!e) notFound();

  const conf = e.confidence ?? 0;
  const eligible = conf >= CONF_TARGET && e.status === "RUNNING";
  const treatmentLeads = (e.uplift ?? 0) > 0;
  const hasData = e.visitors > 0;

  const metrics = [
    {
      label: "Uplift",
      value: e.uplift !== null ? `${e.uplift >= 0 ? "+" : ""}${(e.uplift * 100).toFixed(1)}%` : "—",
      sub: "treatment vs. control",
      accent: e.uplift !== null && e.uplift >= 0,
      icon: TrendingUp,
    },
    {
      label: "Confidence",
      value: e.confidence !== null ? `${Math.round(e.confidence * 100)}%` : "—",
      sub: "statistical significance",
      icon: CheckCircle2,
    },
    {
      label: "Visitors",
      value: e.visitors.toLocaleString(),
      sub: "in test, both arms",
      icon: Users,
    },
    {
      label: "Running",
      value: e.running,
      sub: "since launch",
      icon: Clock,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-7">
      <Link
        href="/dashboard/experiments"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Experiments
      </Link>

      {/* header */}
      <div className="space-y-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{e.surface}</Badge>
            <StatusBadge status={e.status as ExperimentStatus} />
            <span className="font-mono text-xs text-muted-foreground">
              #{e.prNumber ?? e.id.slice(0, 6)} · {e.running}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{e.title}</h1>
          {e.hypothesis && (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {e.hypothesis}
            </p>
          )}
        </div>

        <ExperimentControls
          id={e.id}
          status={e.status}
          prUrl={e.prUrl}
          prNumber={e.prNumber}
        />

        {e.status === "QUEUED" && (
          <div className="flex items-start gap-2 rounded-md border border-primary/25 bg-primary/[0.04] px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>
              <strong className="font-medium text-foreground">
                Merge the PR to launch.
              </strong>{" "}
              Lead detects the merge and starts splitting traffic{" "}
              {100 - e.split}/{e.split} automatically — or hit “Activate now” if
              you&apos;ve already deployed.
            </span>
          </div>
        )}
      </div>

      {/* visual before/after preview (same image embedded in the PR) */}
      <Card className="overflow-hidden p-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/experiments/${e.id}/preview.svg`}
          alt={`Before and after preview of ${e.title}`}
          className="w-full"
        />
      </Card>

      {/* live metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label}>
              <CardContent className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                    {m.label}
                  </span>
                  <Icon className="size-4 text-muted-foreground/60" />
                </div>
                <div
                  className={cn(
                    "font-mono text-3xl font-semibold tabular-nums",
                    m.accent && "text-primary",
                  )}
                >
                  {m.value}
                </div>
                <div className="text-xs text-muted-foreground">{m.sub}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* significance progress */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Statistical confidence</span>
            <span className="font-mono tabular-nums text-muted-foreground">
              {Math.round(conf * 100)}% / 95% target
            </span>
          </div>
          <MeterBar value={conf * 100} tone={eligible ? "success" : "primary"} />
          <p className="text-xs text-muted-foreground">
            {!hasData ? (
              <>
                No traffic yet. Once the experiment is live and visitors flow in,
                uplift and confidence build here in real time.
              </>
            ) : eligible ? (
              <>
                The treatment crossed the 95% threshold — eligible to ship.
              </>
            ) : (
              <>Collecting data — keep the test running until it reaches 95%.</>
            )}
          </p>
        </CardContent>
      </Card>

      {/* variants */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Variants</h2>
          <Badge variant="secondary" className="tabular-nums">
            2
          </Badge>
        </div>

        {([
          { v: e.control, kind: "control" as const, winner: false },
          { v: e.treatment, kind: "treatment" as const, winner: treatmentLeads && hasData },
        ]).map(({ v, kind, winner }) => (
          <Card key={kind} className={cn(winner && "border-primary/40")}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs text-muted-foreground">
                  {kind === "control" ? "A" : "B"}
                </span>
                {v.label}
                {kind === "control" ? (
                  <Badge variant="secondary">Control</Badge>
                ) : (
                  <Badge variant="outline" className="border-primary/40 text-primary">
                    Treatment
                  </Badge>
                )}
                {winner && (
                  <Badge className="gap-1 bg-success text-success-foreground">
                    <CheckCircle2 className="size-3" />
                    Leading
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                {kind === "control" ? 100 - e.split : e.split}% traffic ·{" "}
                {v.impressions.toLocaleString()} visitors ·{" "}
                {v.conversions.toLocaleString()} conversions
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                    Conv. rate
                  </div>
                  <div className="font-mono text-xl font-semibold tabular-nums">
                    {(v.rate * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="col-span-2 flex flex-col justify-center gap-1.5">
                  <MeterBar value={Math.min(100, v.rate * 100 * 5)} tone={winner ? "success" : "muted"} />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {v.conversions} / {v.impressions.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* the copy this variant renders + (for treatment) how it ships */}
              <Separator />
              <div className="space-y-1.5">
                <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  Renders
                </div>
                <p className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm leading-snug">
                  {v.content ?? "—"}
                </p>
              </div>

              {kind === "treatment" && (
                <>
                  {e.hypothesis && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                        <Sparkles className="size-3.5 text-primary" />
                        Agent reasoning
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {e.hypothesis}
                      </p>
                    </div>
                  )}
                  {e.targetPath && (
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                      <FileCode2 className="size-3.5" />
                      {e.targetPath}
                      <span className="text-muted-foreground/60">
                        · served to the B cohort via the Lead SDK flag
                      </span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
