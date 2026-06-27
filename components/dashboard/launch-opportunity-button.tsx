"use client";

import { Check, ExternalLink, GitPullRequest, Loader2, Radio, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLaunch, type LaunchHint } from "@/components/dashboard/use-launch";

/**
 * Compact "launch this opportunity" control for the Surfaces backlog. Fires the
 * experiment agent seeded with the opportunity, then shows inline progress and
 * the PR it opened — the same flow as the big panel, condensed to one row.
 */
export function LaunchOpportunityButton({
  hint,
  alreadyLaunched,
}: {
  hint: LaunchHint;
  alreadyLaunched?: boolean;
}) {
  const { state, step, done, error, run } = useLaunch();

  if (state === "idle" && alreadyLaunched) {
    return (
      <Button size="sm" variant="ghost" className="shrink-0 text-muted-foreground" disabled>
        <Check className="size-3.5 text-success" />
        Launched
      </Button>
    );
  }

  if (state === "running") {
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin text-primary" />
        <span className="max-w-[160px] truncate">{step}</span>
      </span>
    );
  }

  if ((state === "queued" || state === "live") && done) {
    return (
      <Button size="sm" variant="outline" className="shrink-0" asChild>
        <a href={done.prUrl} target="_blank" rel="noreferrer">
          {state === "live" ? (
            <Radio className="size-3.5 animate-pulse text-success" />
          ) : (
            <GitPullRequest className="size-3.5 text-success" />
          )}
          {state === "live" ? "Live · PR" : `PR #${done.prNumber}`}
          <ExternalLink className="size-3.5" />
        </a>
      </Button>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <Button size="sm" variant="outline" onClick={() => run(hint)}>
        <Sparkles className="size-3.5" />
        {state === "error" ? "Retry" : "Launch test"}
      </Button>
      {state === "error" && error && (
        <span className="max-w-[180px] text-right text-[10px] text-destructive">{error}</span>
      )}
    </div>
  );
}
