"use client";

import * as React from "react";
import {
  Bot,
  Check,
  CreditCard,
  LayoutTemplate,
  Loader2,
  Route,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { MeterBar } from "@/components/dashboard/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  type AuditEvent,
  type AuditResult,
  type SurfaceKey,
} from "@/lib/agents/types";

const SURFACE_ICON: Record<SurfaceKey, LucideIcon> = {
  landing: LayoutTemplate,
  onboarding: Route,
  paywall: CreditCard,
};

type LogEntry = { label: string; detail?: string };

export function AuditStep({
  repoFullName,
  onComplete,
}: {
  repoFullName: string;
  onComplete: (result: AuditResult) => void;
}) {
  const [log, setLog] = React.useState<LogEntry[]>([]);
  const [progress, setProgress] = React.useState(0);
  const [surfaces, setSurfaces] = React.useState<
    { key: SurfaceKey; name: string }[]
  >([]);
  const [error, setError] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  // `onComplete` lives in the parent; keep a ref so the effect isn't re-run when
  // its identity changes (it shouldn't fire the audit twice).
  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;

  React.useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function run() {
      setLog([]);
      setProgress(0);
      setSurfaces([]);
      setError(null);

      try {
        const res = await fetch("/api/audit/repo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoFullName }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const data = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(data?.error ?? "Audit request failed.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const handle = (event: AuditEvent) => {
          switch (event.type) {
            case "status":
              setProgress(event.progress);
              setLog((prev) => [...prev, { label: event.label, detail: event.detail }]);
              break;
            case "surfaces":
              setSurfaces(event.surfaces);
              break;
            case "done":
              setProgress(100);
              // Brief beat so the 100% state is visible before advancing.
              window.setTimeout(() => {
                if (!cancelled) onCompleteRef.current(event.result);
              }, 600);
              break;
            case "error":
              setError(event.message);
              break;
            // surface_done is handled at the report step; ignore here.
          }
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              handle(JSON.parse(line) as AuditEvent);
            } catch {
              // Ignore partial/garbled lines.
            }
          }
        }
      } catch (e) {
        if (cancelled || controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Audit failed.");
      }
    }

    void run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [repoFullName, attempt]);

  // The running line is the last log entry; everything before it is "done".
  const current = log.length - 1;

  return (
    <div className="w-full max-w-xl space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
          <Bot className="size-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Auditing <span className="font-mono">{repoFullName}</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          The agent is reading your codebase and scoring each conversion
          surface. This usually takes a minute.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-5">
          {/* progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {error ? "Audit failed" : "Analyzing"}
              </span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {progress}%
              </span>
            </div>
            <MeterBar value={progress} tone={error ? "muted" : "primary"} />
          </div>

          {error ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <TriangleAlert className="size-5 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button size="sm" variant="outline" onClick={() => setAttempt((a) => a + 1)}>
                Try again
              </Button>
            </div>
          ) : (
            <>
              {/* task log */}
              <div className="space-y-2.5">
                {log.length === 0 && (
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    Starting the agent…
                  </div>
                )}
                {log.map((task, i) => {
                  const done = i < current;
                  const running = i === current;
                  return (
                    <div
                      key={`${i}-${task.label}`}
                      className="flex items-start gap-2.5"
                    >
                      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                        {done ? (
                          <span className="flex size-4 items-center justify-center rounded-full bg-success/15 text-success">
                            <Check className="size-3" />
                          </span>
                        ) : running ? (
                          <Loader2 className="size-4 animate-spin text-primary" />
                        ) : (
                          <span className="size-2 rounded-full bg-muted-foreground/30" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-foreground">{task.label}</div>
                        {task.detail && (
                          <div className="truncate font-mono text-[11px] text-muted-foreground">
                            {task.detail}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* detected surfaces */}
              {surfaces.length > 0 && (
                <div className="space-y-2 border-t border-border pt-4">
                  <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                    Surfaces detected
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {surfaces.map((s) => {
                      const Icon = SURFACE_ICON[s.key];
                      return (
                        <Badge
                          key={s.key}
                          variant="outline"
                          className="gap-1.5 border-primary/30 py-1 font-normal text-foreground"
                        >
                          <Icon className="size-3.5 text-primary" />
                          {s.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
