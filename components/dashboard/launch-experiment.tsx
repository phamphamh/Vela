"use client";

import {
  ArrowRight,
  Check,
  ExternalLink,
  FlaskConical,
  GitPullRequest,
  Loader2,
  Radio,
  Rocket,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLaunch, type LaunchHint, type SurfaceKey } from "@/components/dashboard/use-launch";
import { cn } from "@/lib/utils";

const SURFACE_LABEL: Record<SurfaceKey, string> = {
  landing: "Landing",
  onboarding: "Onboarding",
  paywall: "Paywall",
};

/**
 * Full launch panel: kicks off the experiment agent, shows the proposed copy
 * change + a before/after preview, the PR it opened, and the "merge → live"
 * explanation. Used on the onboarding report and the dashboard live band.
 */
export function LaunchExperiment({
  hint,
  className,
  refresh = true,
}: {
  hint?: LaunchHint;
  className?: string;
  // Whether the launch should call router.refresh() on progress. True on the
  // dashboard (refreshes the server-rendered experiment lists); MUST be false in
  // the onboarding flow, where the page is driven by local step state — a refresh
  // there resets the wizard back to the start.
  refresh?: boolean;
}) {
  const { state, step, proposal, done, error, run, activateNow } =
    useLaunch({ refresh });

  return (
    <div
      className={cn(
        "space-y-4 rounded-md border border-primary/30 bg-primary/[0.04] p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <FlaskConical className="size-4 text-primary" />
            Launch your first A/B test
          </div>
          <p className="text-xs text-muted-foreground">
            The agent picks your highest-leverage copy change, writes both
            variants behind the SDK flag, and opens a PR. Merging it goes live.
          </p>
        </div>
        {(state === "idle" || state === "error") && (
          <Button size="sm" onClick={() => run(hint)}>
            <Rocket className="size-3.5" />
            {state === "error" ? "Try again" : "Design the test"}
          </Button>
        )}
      </div>

      {state === "running" && (
        <div className="flex items-center gap-2 border-t border-primary/15 pt-3 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin text-primary" />
          {step}
        </div>
      )}

      {state === "error" && error && (
        <p className="border-t border-primary/15 pt-3 text-xs text-destructive">
          {error}
        </p>
      )}

      {proposal && (
        <div className="space-y-3 border-t border-primary/15 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{SURFACE_LABEL[proposal.surface]}</Badge>
            <span className="text-sm font-medium">{proposal.title}</span>
            <span className="font-mono text-xs tabular-nums text-primary">
              {proposal.expectedLift}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {proposal.hypothesis}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <VariantCard label="A · Control" tone="control" copy={proposal.control} />
            <VariantCard label="B · Treatment" tone="variant" copy={proposal.treatment} />
          </div>
        </div>
      )}

      {(state === "queued" || state === "live") && done && (
        <div className="space-y-3 border-t border-primary/15 pt-3">
          {state === "live" ? (
            <div className="flex items-center gap-2 text-sm">
              <Radio className="size-4 animate-pulse text-success" />
              <span className="font-medium text-success">Experiment is live</span>
              <span className="text-xs text-muted-foreground">
                · {done.split}% of visitors now see variant B
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <Check className="size-4 text-success" />
              <span className="font-medium">PR #{done.prNumber} opened</span>
              <Badge variant="secondary" className="font-normal">
                Queued
              </Badge>
            </div>
          )}

          <p className="rounded-md border border-primary/20 bg-background/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            {state === "live" ? (
              <>
                Traffic is split {100 - done.split}/{done.split}. Watch uplift and
                confidence build on the experiment page, and ship the winner when
                it&apos;s conclusive.
              </>
            ) : (
              <>
                <strong className="font-medium text-foreground">
                  Merging this PR launches the test live.
                </strong>{" "}
                Review the diff, merge, and deploy — Lead detects the merge and
                starts splitting traffic {100 - done.split}/{done.split}{" "}
                automatically. Nothing changes for visitors until then.
              </>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant={state === "live" ? "outline" : "default"} asChild>
              <a href={done.prUrl} target="_blank" rel="noreferrer">
                <GitPullRequest className="size-3.5" />
                {state === "live" ? "View PR" : "Review & merge PR"}
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
            {state === "queued" && (
              <>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Waiting for merge…
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={activateNow}
                >
                  Already deployed? Activate now
                  <ArrowRight className="size-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VariantCard({
  label,
  tone,
  copy,
}: {
  label: string;
  tone: "control" | "variant";
  copy: string;
}) {
  return (
    <div
      className={cn(
        "space-y-1.5 rounded-md border bg-background p-3",
        tone === "variant" ? "border-primary/40" : "border-border",
      )}
    >
      <div
        className={cn(
          "font-mono text-[10px] uppercase tracking-wide",
          tone === "variant" ? "text-primary" : "text-muted-foreground",
        )}
      >
        {label}
      </div>
      <p className="text-sm leading-snug">{copy}</p>
    </div>
  );
}
