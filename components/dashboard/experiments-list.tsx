"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  FlaskConical,
  GitBranch,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import { LaunchExperiment } from "@/components/dashboard/launch-experiment";
import { StatusBadge, type ExperimentStatus } from "@/components/dashboard/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type ExperimentRow } from "@/lib/experiments";
import { cn } from "@/lib/utils";

const SURFACES = ["All surfaces", "Landing", "Onboarding", "Paywall"] as const;
const STATUSES = [
  "All statuses",
  "DRAFT",
  "QUEUED",
  "RUNNING",
  "CONCLUSIVE",
  "COMPLETED",
  "ABANDONED",
] as const;

function Uplift({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const pct = value * 100;
  const positive = pct >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono tabular-nums",
        positive ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {positive ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}

export function ExperimentsList({
  experiments,
  repoFullName,
}: {
  experiments: ExperimentRow[];
  repoFullName: string | null;
}) {
  const [query, setQuery] = React.useState("");
  const [surface, setSurface] = React.useState<(typeof SURFACES)[number]>("All surfaces");
  const [status, setStatus] = React.useState<(typeof STATUSES)[number]>("All statuses");
  const [showLaunch, setShowLaunch] = React.useState(experiments.length === 0);

  const filtered = experiments.filter((e) => {
    if (surface !== "All surfaces" && e.surface !== surface) return false;
    if (status !== "All statuses" && e.status !== status) return false;
    if (
      query &&
      !`${e.title} ${e.hypothesis} ${e.surface}`.toLowerCase().includes(query.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Experiments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every test the agent runs
            {repoFullName ? (
              <>
                {" "}on <span className="font-mono">{repoFullName}</span>
              </>
            ) : null}
            .
          </p>
        </div>
        <Button size="sm" onClick={() => setShowLaunch((v) => !v)}>
          {showLaunch ? <X className="size-4" /> : <Plus className="size-4" />}
          {showLaunch ? "Close" : "New experiment"}
        </Button>
      </div>

      {showLaunch && <LaunchExperiment />}

      {experiments.length === 0 ? (
        !showLaunch && (
          <Card>
            <CardContent className="space-y-3 py-12 text-center">
              <FlaskConical className="mx-auto size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No experiments yet. Launch your first A/B test — the agent writes
                the variant and opens a reviewable PR.
              </p>
              <Button size="sm" onClick={() => setShowLaunch(true)}>
                <Plus className="size-4" />
                New experiment
              </Button>
            </CardContent>
          </Card>
        )
      ) : (
        <>
          {/* filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search hypotheses…"
                className="pl-8"
              />
            </div>
            <Select value={surface} onValueChange={(v) => setSurface(v as (typeof SURFACES)[number])}>
              <SelectTrigger size="sm" className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SURFACES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as (typeof STATUSES)[number])}>
              <SelectTrigger size="sm" className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s === "All statuses" ? s : s.toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* table */}
          <Card className="py-0">
            <CardContent className="px-0">
              <div className="hidden grid-cols-12 gap-3 border-b border-border px-5 py-2.5 font-mono text-[11px] uppercase tracking-wide text-muted-foreground md:grid">
                <div className="col-span-4">Experiment</div>
                <div className="col-span-2">Surface</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2 text-right">Uplift</div>
                <div className="col-span-1 text-right">Conf.</div>
                <div className="col-span-1 text-right">Running</div>
              </div>

              <div className="divide-y divide-border">
                {filtered.map((e) => (
                  <Link
                    key={e.id}
                    href={`/dashboard/experiments/${e.id}`}
                    className="group grid grid-cols-1 items-center gap-x-3 gap-y-2 px-5 py-3.5 transition-colors hover:bg-accent/50 md:grid-cols-12"
                  >
                    <div className="flex min-w-0 items-start gap-2.5 md:col-span-4">
                      <GitBranch className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{e.title}</span>
                          {e.prNumber && (
                            <span className="shrink-0 font-mono text-xs text-muted-foreground/70">
                              #{e.prNumber}
                            </span>
                          )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {e.hypothesis}
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <Badge variant="outline" className="font-normal">
                        {e.surface}
                      </Badge>
                    </div>

                    <div className="md:col-span-2">
                      <StatusBadge status={e.status as ExperimentStatus} />
                    </div>

                    <div className="flex items-center justify-between text-sm md:col-span-2 md:justify-end">
                      <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground md:hidden">
                        Uplift
                      </span>
                      <Uplift value={e.uplift} />
                    </div>

                    <div className="flex items-center justify-between md:col-span-1 md:justify-end">
                      <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground md:hidden">
                        Confidence
                      </span>
                      <span className="font-mono text-sm tabular-nums text-muted-foreground">
                        {e.confidence !== null ? `${Math.round(e.confidence * 100)}%` : "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between md:col-span-1 md:justify-end md:gap-1">
                      <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground md:hidden">
                        Running
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{e.running}</span>
                      <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 max-md:hidden" />
                    </div>
                  </Link>
                ))}

                {filtered.length === 0 && (
                  <div className="px-5 py-16 text-center">
                    <p className="text-sm text-muted-foreground">
                      No experiments match these filters.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <p className="text-center font-mono text-xs text-muted-foreground">
            {filtered.length} of {experiments.length} experiments
          </p>
        </>
      )}
    </div>
  );
}
