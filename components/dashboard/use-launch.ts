"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export type SurfaceKey = "landing" | "onboarding" | "paywall";

export type LaunchHint = {
  surface?: SurfaceKey;
  title?: string;
  rationale?: string;
};

export type Proposal = {
  surface: SurfaceKey;
  title: string;
  hypothesis: string;
  control: string;
  treatment: string;
  expectedLift: string;
};

export type Done = {
  experimentId: string;
  prUrl: string;
  prNumber: number;
  title: string;
  surface: SurfaceKey;
  control: string;
  treatment: string;
  split: number;
};

type LaunchEvent =
  | { type: "status"; label: string; detail?: string }
  | ({ type: "proposal" } & Proposal)
  | { type: "edit"; path: string; description: string }
  | ({ type: "done" } & Done)
  | { type: "error"; message: string };

export type LaunchState = "idle" | "running" | "queued" | "live" | "error";

/**
 * Drives the experiment-launch agent end-to-end: streams the proposal + the PR
 * it opens (POST /api/experiments/launch), then polls the experiment status so
 * the UI flips to "live" the moment the PR is merged + deployed.
 */
export function useLaunch(options?: { refresh?: boolean }) {
  const refreshEnabled = options?.refresh ?? true;
  const router = useRouter();
  // router.refresh() re-fetches server components. On the dashboard that's how
  // the experiment lists update; in the onboarding wizard (driven by local step
  // state) it resets the flow to the start, so it's disabled there.
  const refresh = React.useCallback(() => {
    if (refreshEnabled) router.refresh();
  }, [refreshEnabled, router]);
  const [state, setState] = React.useState<LaunchState>("idle");
  const [step, setStep] = React.useState("");
  const [proposal, setProposal] = React.useState<Proposal | null>(null);
  const [done, setDone] = React.useState<Done | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = React.useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  React.useEffect(() => stopPolling, [stopPolling]);

  const startPolling = React.useCallback(
    (id: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/experiments/${id}/status`);
          if (!res.ok) return;
          const data = (await res.json()) as { live?: boolean };
          if (data.live) {
            stopPolling();
            setState("live");
            refresh();
          }
        } catch {
          /* keep polling */
        }
      }, 4000);
    },
    [refresh, stopPolling],
  );

  const activateNow = React.useCallback(async () => {
    if (!done) return;
    try {
      const res = await fetch(`/api/experiments/${done.experimentId}/status`, { method: "POST" });
      const data = (await res.json()) as { live?: boolean };
      if (data.live) {
        stopPolling();
        setState("live");
        refresh();
      }
    } catch {
      /* ignore */
    }
  }, [done, refresh, stopPolling]);

  const run = React.useCallback(
    async (hint?: LaunchHint) => {
      setState("running");
      setStep("Starting the agent…");
      setProposal(null);
      setDone(null);
      setError(null);
      try {
        const res = await fetch("/api/experiments/launch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(hint ?? {}),
        });
        if (!res.ok || !res.body) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "Launch request failed.");
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const e = JSON.parse(line) as LaunchEvent;
            if (e.type === "status") {
              setStep(e.detail ? `${e.label} — ${e.detail}` : e.label);
            } else if (e.type === "proposal") {
              setProposal(e);
            } else if (e.type === "done") {
              setDone(e);
              setState("queued");
              startPolling(e.experimentId);
              refresh();
            } else if (e.type === "error") {
              setError(e.message);
              setState("error");
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Launch failed.");
        setState("error");
      }
    },
    [refresh, startPolling],
  );

  return { state, step, proposal, done, error, run, activateNow };
}
