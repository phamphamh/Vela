"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ExternalLink,
  GitPullRequest,
  Loader2,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SetupState = "idle" | "running" | "done" | "error";

/**
 * One-click "set up tracking for me" — runs the setup agent (POST /api/setup-sdk,
 * NDJSON stream) and shows live progress + the resulting PR. Self-contained so it
 * can sit on the dashboard or in Settings.
 */
export function SetupSdkButton({
  repoFullName,
  className,
}: {
  repoFullName?: string;
  className?: string;
}) {
  const router = useRouter();
  const [state, setState] = React.useState<SetupState>("idle");
  const [step, setStep] = React.useState("");
  const [edits, setEdits] = React.useState<string[]>([]);
  const [pr, setPr] = React.useState<{
    url: string;
    number: number;
    conversions: string[];
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function run() {
    setState("running");
    setStep("Starting the agent…");
    setEdits([]);
    setPr(null);
    setError(null);
    try {
      const res = await fetch("/api/setup-sdk", { method: "POST" });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Setup request failed.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const e = JSON.parse(line) as
            | { type: "status"; label: string; detail?: string }
            | { type: "edit"; path: string; description: string }
            | { type: "done"; prUrl: string; prNumber: number; conversions: string[] }
            | { type: "error"; message: string };
          if (e.type === "status") {
            setStep(e.detail ? `${e.label} — ${e.detail}` : e.label);
          } else if (e.type === "edit") {
            setEdits((prev) => [...prev, `${e.path} · ${e.description}`]);
          } else if (e.type === "done") {
            setPr({ url: e.prUrl, number: e.prNumber, conversions: e.conversions });
            setState("done");
            router.refresh();
          } else if (e.type === "error") {
            setError(e.message);
            setState("error");
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup failed.");
      setState("error");
    }
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-md border border-primary/30 bg-primary/[0.04] p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Sparkles className="size-4 text-primary" />
            Set up tracking for me
          </div>
          <p className="text-xs text-muted-foreground">
            The agent reads{repoFullName ? ` ${repoFullName}` : " your repo"},
            installs the SDK, and marks your signup &amp; checkout conversions — as
            a PR you review. Nothing ships until you merge.
          </p>
        </div>
        {state !== "done" && (
          <Button size="sm" onClick={run} disabled={state === "running"}>
            {state === "running" ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Working…
              </>
            ) : (
              <>
                <GitPullRequest className="size-3.5" />
                {state === "error" ? "Try again" : "Open a PR"}
              </>
            )}
          </Button>
        )}
      </div>

      {state === "running" && (
        <div className="space-y-1.5 border-t border-primary/15 pt-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin text-primary" />
            {step}
          </div>
          {edits.map((e) => (
            <div
              key={e}
              className="flex items-center gap-1.5 pl-5 font-mono text-[11px] text-muted-foreground"
            >
              <Check className="size-3 text-success" />
              {e}
            </div>
          ))}
        </div>
      )}

      {state === "error" && error && (
        <p className="border-t border-primary/15 pt-3 text-xs text-destructive">
          {error}
        </p>
      )}

      {state === "done" && pr && (
        <div className="space-y-2 border-t border-primary/15 pt-3">
          <div className="flex items-center gap-2 text-sm">
            <Check className="size-4 text-success" />
            <span className="font-medium">PR #{pr.number} opened</span>
            {pr.conversions.length > 0 && (
              <span className="text-xs text-muted-foreground">
                · conversions: {pr.conversions.join(", ")}
              </span>
            )}
          </div>
          <Button size="sm" variant="outline" asChild>
            <a href={pr.url} target="_blank" rel="noreferrer">
              Review &amp; merge PR
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
          <p className="text-xs text-muted-foreground">
            Merge it, deploy, and tracking goes live automatically.
          </p>
        </div>
      )}
    </div>
  );
}
