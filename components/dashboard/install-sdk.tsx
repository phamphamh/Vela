"use client";

import * as React from "react";
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  GitPullRequest,
  Loader2,
  Radio,
  Send,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Status = {
  sdkKey: string;
  repoFullName: string;
  connected: boolean;
  total: number;
  lastEventAt: string | null;
  lastEventType: string | null;
};

function relative(iso: string | null): string {
  if (!iso) return "";
  const secs = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      className="shrink-0"
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label={label}
    >
      {copied ? (
        <Check className="size-3.5 text-success" />
      ) : (
        <Copy className="size-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export function InstallSdk() {
  const [status, setStatus] = React.useState<Status | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);
  const [origin] = React.useState(() =>
    typeof window !== "undefined" ? window.location.origin : "",
  );

  // Automatic setup (the agent → PR).
  const [setupState, setSetupState] = React.useState<
    "idle" | "running" | "done" | "error"
  >("idle");
  const [setupStep, setSetupStep] = React.useState<string>("");
  const [setupEdits, setSetupEdits] = React.useState<string[]>([]);
  const [pr, setPr] = React.useState<{ url: string; number: number; conversions: string[] } | null>(null);
  const [setupError, setSetupError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/tracking/status", { cache: "no-store" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Couldn't load tracking status.");
      }
      setStatus((await res.json()) as Status);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load tracking status.");
    }
  }, []);

  // Poll so the status flips to "Connected" as soon as the first event lands.
  React.useEffect(() => {
    void (async () => {
      await refresh();
    })();
    const id = setInterval(() => void refresh(), 4000);
    return () => clearInterval(id);
  }, [refresh]);

  async function sendTest() {
    if (!status) return;
    setSending(true);
    try {
      await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sdkKey: status.sdkKey,
          visitorId: "lead_test_visitor",
          sessionId: "lead_test",
          events: [
            { type: "PAGEVIEW", path: "/__lead_test" },
            { type: "CLICK", name: "Test event" },
          ],
        }),
      });
      setTimeout(() => void refresh(), 500);
    } finally {
      setTimeout(() => setSending(false), 600);
    }
  }

  async function runSetup() {
    setSetupState("running");
    setSetupStep("Starting the agent…");
    setSetupEdits([]);
    setPr(null);
    setSetupError(null);
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
            setSetupStep(e.detail ? `${e.label} — ${e.detail}` : e.label);
          } else if (e.type === "edit") {
            setSetupEdits((prev) => [...prev, `${e.path} · ${e.description}`]);
          } else if (e.type === "done") {
            setPr({ url: e.prUrl, number: e.prNumber, conversions: e.conversions });
            setSetupState("done");
            void refresh();
          } else if (e.type === "error") {
            setSetupError(e.message);
            setSetupState("error");
          }
        }
      }
    } catch (e) {
      setSetupError(e instanceof Error ? e.message : "Setup failed.");
      setSetupState("error");
    }
  }

  if (error) {
    return <p className="text-sm text-muted-foreground">{error}</p>;
  }
  if (!status) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading tracking…
      </div>
    );
  }

  const snippet = `<script src="${origin}/sdk.js" data-key="${status.sdkKey}" defer></script>`;
  const conversionExample = `lead('conversion', 'signup');  // or: <a data-lead-conversion>Sign up</a>`;

  return (
    <div className="space-y-5">
      {/* automatic setup — the agent opens a PR */}
      <div className="space-y-3 rounded-md border border-primary/30 bg-primary/[0.04] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="size-4 text-primary" />
              Set it up for me
            </div>
            <p className="text-xs text-muted-foreground">
              The agent reads {status.repoFullName}, installs the SDK, and marks
              your signup &amp; checkout conversions — as a PR you review. Nothing
              ships until you merge.
            </p>
          </div>
          {setupState !== "done" && (
            <Button size="sm" onClick={runSetup} disabled={setupState === "running"}>
              {setupState === "running" ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Working…
                </>
              ) : (
                <>
                  <GitPullRequest className="size-3.5" />
                  {setupState === "error" ? "Try again" : "Open a PR"}
                </>
              )}
            </Button>
          )}
        </div>

        {setupState === "running" && (
          <div className="space-y-1.5 border-t border-primary/15 pt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin text-primary" />
              {setupStep}
            </div>
            {setupEdits.map((e) => (
              <div key={e} className="flex items-center gap-1.5 pl-5 font-mono text-[11px] text-muted-foreground">
                <Check className="size-3 text-success" />
                {e}
              </div>
            ))}
          </div>
        )}

        {setupState === "error" && setupError && (
          <p className="border-t border-primary/15 pt-3 text-xs text-destructive">
            {setupError}
          </p>
        )}

        {setupState === "done" && pr && (
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

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or install manually
        <ArrowRight className="size-3" />
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* live status */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/20 p-3">
        <div className="flex items-center gap-2.5">
          <Radio
            className={cn(
              "size-4",
              status.connected ? "text-success" : "text-muted-foreground",
            )}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {status.connected ? "Receiving events" : "Waiting for first event"}
              </span>
              {status.connected ? (
                <Badge className="gap-1.5 bg-success text-success-foreground">
                  <span className="size-1.5 animate-pulse rounded-full bg-current" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1.5 text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Listening…
                </Badge>
              )}
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              {status.connected
                ? `${status.total.toLocaleString()} events · last ${relative(
                    status.lastEventAt,
                  )}`
                : "No events received yet for this project."}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={sendTest} disabled={sending}>
          {sending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Send className="size-3.5" />
          )}
          Send test event
        </Button>
      </div>

      {/* SDK key */}
      <div className="space-y-1.5">
        <Label className="text-sm">Project SDK key</Label>
        <div className="flex items-center gap-2">
          <code className="flex h-9 min-w-0 flex-1 items-center truncate rounded-md border border-border bg-muted/40 px-3 font-mono text-xs">
            {status.sdkKey}
          </code>
          <CopyButton value={status.sdkKey} label="Copy SDK key" />
        </div>
        <p className="text-xs text-muted-foreground">
          Public, safe to ship in client HTML — it only identifies{" "}
          <span className="font-mono">{status.repoFullName}</span> on the ingest
          endpoint.
        </p>
      </div>

      <Separator />

      {/* install snippet */}
      <div className="space-y-2">
        <Label className="text-sm">1 · Add the snippet to your site&apos;s &lt;head&gt;</Label>
        <div className="flex items-start gap-2">
          <code className="block min-w-0 flex-1 overflow-x-auto rounded-md border border-border bg-muted/40 px-3 py-2.5 font-mono text-xs">
            {snippet}
          </code>
          <CopyButton value={snippet} label="Copy snippet" />
        </div>
        <p className="text-xs text-muted-foreground">
          That&apos;s the whole install. It auto-tracks pageviews (incl. SPA route
          changes) and clicks on links/buttons.
        </p>
      </div>

      {/* conversions */}
      <div className="space-y-2">
        <Label className="text-sm">2 · Mark your conversions</Label>
        <code className="block overflow-x-auto rounded-md border border-border bg-muted/40 px-3 py-2.5 font-mono text-xs">
          {conversionExample}
        </code>
        <p className="text-xs text-muted-foreground">
          Tag the signup / checkout action so we can measure what experiments move.
        </p>
      </div>

      {/* verify */}
      <div className="space-y-1.5">
        <Label className="text-sm">3 · Verify</Label>
        <p className="text-xs text-muted-foreground">
          Deploy, then load any page of your site (or hit{" "}
          <button
            type="button"
            onClick={sendTest}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Send test event
          </button>
          ) — the status above flips to <span className="text-success">Connected</span>{" "}
          within a few seconds, and the dashboard&apos;s Live tracking fills in.
        </p>
      </div>
    </div>
  );
}
