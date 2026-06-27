"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowRight, Share2 } from "lucide-react";

import { AuditReport } from "@/components/audit/audit-report";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { type AuditResponse, type AuditResult } from "@/lib/audit/types";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type Phase = "idle" | "loading" | "result" | "error";

const STATUS_STEPS = [
  "Connecting",
  "Reading HTML",
  "Extracting content",
  "Claude evaluates",
  "Analyzing signals",
  "Compiling report",
] as const;

const STATUS_INTERVAL = 720;
const MIN_DWELL = 2600;
const SCORE_DURATION = 950;
const SHARE_RESET = 1800;

const EXAMPLES = ["stripe.com", "linear.app", "notion.so"] as const;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/** Prepend https:// when missing; return the URL or null if not http(s). */
function normalizeUrl(raw: string): URL | null {
  let u = raw.trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    const parsed = new URL(u);
    if (!/^https?:$/.test(parsed.protocol)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function AuditTool() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [url, setUrl] = useState("");
  const [statusIdx, setStatusIdx] = useState(0);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [shared, setShared] = useState(false);
  const [needsPaste, setNeedsPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const [auditId, setAuditId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  // The normalized URL awaiting a paste-content resubmit.
  const pendingUrl = useRef<string | null>(null);

  const statusTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);
  const shareTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopStatusTimer = useCallback(() => {
    if (statusTimer.current) {
      clearInterval(statusTimer.current);
      statusTimer.current = null;
    }
  }, []);

  const cancelRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Cleanup every timer on unmount.
  useEffect(() => {
    return () => {
      stopStatusTimer();
      cancelRaf();
      if (shareTimer.current) clearTimeout(shareTimer.current);
    };
  }, [stopStatusTimer, cancelRaf]);

  const animateScore = useCallback(
    (target: number) => {
      cancelRaf();
      if (prefersReducedMotion()) {
        setDisplayScore(target);
        return;
      }
      const start = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / SCORE_DURATION);
        const eased = 1 - Math.pow(1 - k, 3); // easeOutCubic
        setDisplayScore(Math.round(target * eased));
        if (k < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [cancelRaf],
  );

  const runFlow = useCallback(
    async (payload: { url: string; text?: string }) => {
      track("audit_started", {
        url: payload.url,
        mode: payload.text ? "paste" : "url",
      });
      setPhase("loading");
      setStatusIdx(0);
      setResult(null);
      setDisplayScore(0);
      setErrorMsg("");

      stopStatusTimer();
      statusTimer.current = setInterval(() => {
        setStatusIdx((i) => Math.min(i + 1, STATUS_STEPS.length - 1));
      }, STATUS_INTERVAL);

      try {
        const [res] = await Promise.all([
          fetch("/api/audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }),
          delay(MIN_DWELL),
        ]);
        const data = (await res.json()) as AuditResponse;
        stopStatusTimer();

        if (data.ok) {
          setAuditId(data.id);
          setResultUrl(data.url ?? payload.url);
          setResult(data.result);
          setNeedsPaste(false);
          setPasteText("");
          pendingUrl.current = null;
          setPhase("result");
          animateScore(data.result.score);
          track("audit_completed", {
            url: data.url ?? payload.url,
            score: data.result.score,
            findings: data.result.findings.length,
          });
          return;
        }

        if ("needsPaste" in data && data.needsPaste) {
          pendingUrl.current = payload.url;
          setNeedsPaste(true);
          setErrorMsg("");
          setPhase("idle");
          return;
        }

        setErrorMsg(
          ("error" in data && data.error) ||
            "Something went wrong. Please try again.",
        );
        setPhase("error");
        track("audit_failed", {
          url: payload.url,
          reason: ("error" in data && data.error) || "unknown",
        });
      } catch {
        stopStatusTimer();
        setErrorMsg("Network error — check the URL and try again.");
        setPhase("error");
        track("audit_failed", { url: payload.url, reason: "network" });
      }
    },
    [stopStatusTimer, animateScore],
  );

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (phase === "loading") return;
      const parsed = normalizeUrl(url);
      if (!parsed) {
        setNeedsPaste(false);
        setErrorMsg(
          "That doesn't look like a valid URL. Try something like https://your-startup.com",
        );
        setPhase("error");
        return;
      }
      void runFlow({ url: parsed.href });
    },
    [phase, url, runFlow],
  );

  const onPasteSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (phase === "loading") return;
      const target = pendingUrl.current ?? normalizeUrl(url)?.href;
      if (!target || !pasteText.trim()) return;
      void runFlow({ url: target, text: pasteText });
    },
    [phase, url, pasteText, runFlow],
  );

  const reset = useCallback(() => {
    stopStatusTimer();
    cancelRaf();
    pendingUrl.current = null;
    setPhase("idle");
    setResult(null);
    setDisplayScore(0);
    setErrorMsg("");
    setNeedsPaste(false);
    setPasteText("");
  }, [stopStatusTimer, cancelRaf]);

  const share = useCallback(() => {
    if (!auditId) return;
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      void navigator.clipboard?.writeText(`${origin}/audit/${auditId}`);
    } catch {
      /* clipboard may be unavailable; fail silently */
    }
    setShared(true);
    if (shareTimer.current) clearTimeout(shareTimer.current);
    shareTimer.current = setTimeout(() => setShared(false), SHARE_RESET);
  }, [auditId]);

  const showForm = (phase === "idle" || phase === "error") && !needsPaste;
  const isLoading = phase === "loading";
  const isResult = phase === "result" && result;

  return (
    <div className="relative mx-auto max-w-[680px] overflow-hidden rounded-[14px] border border-border bg-card text-left shadow-[0_18px_50px_-22px_oklch(0.28_0.03_60/.35)]">
      {/* terminal header bar */}
      <div className="flex h-[38px] items-center gap-2 border-b border-border bg-muted/65 px-3.5">
        <span className="size-[9px] rounded-full bg-muted-foreground/45" />
        <span className="size-[9px] rounded-full bg-muted-foreground/45" />
        <span className="size-[9px] rounded-full bg-muted-foreground/45" />
        <span className="ml-1.5 font-mono text-[11.5px] text-muted-foreground">
          Vela · free audit
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-success" />
          no login
        </span>
      </div>

      <div className="p-[22px]">
        {/* IDLE / ERROR FORM */}
        {showForm ? (
          <>
            <form onSubmit={onSubmit}>
              <label
                htmlFor="audit-url"
                className="font-mono text-xs uppercase tracking-[0.04em] text-muted-foreground"
              >
                Your landing URL
              </label>
              <div className="mt-2 flex flex-wrap gap-2.5">
                <Input
                  id="audit-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-startup.com"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-[46px] min-w-[200px] flex-1 rounded-lg bg-background font-mono text-base"
                />
                <Button
                  type="submit"
                  className="h-[46px] rounded-lg px-5 text-[15px] font-semibold"
                >
                  Audit my landing
                  <ArrowRight className="size-[15px]" />
                </Button>
              </div>
            </form>

            {phase === "error" && errorMsg ? (
              <div className="mt-3 flex items-center gap-1.5 text-[13px] text-destructive">
                <AlertCircle className="size-3.5 shrink-0" />
                {errorMsg}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Try:</span>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setUrl(ex);
                    setErrorMsg("");
                    setPhase("idle");
                  }}
                  className="inline-flex h-[26px] items-center rounded-full border border-border bg-transparent px-2.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  {ex}
                </button>
              ))}
              <span className="ml-auto font-mono text-[11.5px] text-muted-foreground">
                ~30s · by Claude
              </span>
            </div>
          </>
        ) : null}

        {/* NEEDS PASTE */}
        {needsPaste && !isLoading ? (
          <form onSubmit={onPasteSubmit} className="flex flex-col gap-3">
            <div>
              <div className="text-sm font-medium">
                That page looks like an empty app shell.
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Paste the page&apos;s visible content (headline, sub-copy, CTA
                labels) and we&apos;ll audit that instead.
              </p>
            </div>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste your landing page copy here…"
              rows={6}
              className="w-full resize-y rounded-lg border border-border bg-background p-3 font-mono text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="submit"
                disabled={!pasteText.trim()}
                className="h-[42px] rounded-lg px-[18px] text-[14.5px] font-semibold"
              >
                Audit this content
                <ArrowRight className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={reset}
                className="h-[42px] text-muted-foreground"
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {/* LOADING */}
        {isLoading ? (
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2.5">
              <span className="inline-block size-4 animate-spin rounded-full border-2 border-border border-t-primary motion-reduce:animate-none" />
              <span className="text-sm font-medium">Auditing…</span>
            </div>
            <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/60 px-3.5 py-3.5 font-mono text-[13px]">
              {STATUS_STEPS.slice(0, statusIdx + 1).map((step, i) => {
                const done = i < statusIdx;
                return (
                  <div
                    key={step}
                    className={cn(
                      "flex items-center gap-2.5",
                      done ? "text-muted-foreground" : "text-foreground",
                    )}
                  >
                    <span className="inline-flex w-3.5 shrink-0 justify-center">
                      {done ? "✓" : "▸"}
                    </span>
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-0.5 flex flex-col gap-2">
              <Skeleton className="h-[11px] w-[90%] rounded-[5px]" />
              <Skeleton className="h-[11px] w-[78%] rounded-[5px]" />
              <Skeleton className="h-[11px] w-[84%] rounded-[5px]" />
            </div>
          </div>
        ) : null}

        {/* RESULT */}
        {isResult ? (
          <div>
            <AuditReport
              result={result}
              url={resultUrl}
              displayScore={displayScore}
            />

            {/* result footer CTAs */}
            <div className="mt-[18px] flex flex-wrap items-center gap-2.5 border-t border-border pt-[18px]">
              <Button
                asChild
                className="h-[42px] rounded-lg px-[18px] text-[14.5px] font-semibold"
              >
                <a
                  href="/onboarding"
                  onClick={() =>
                    track("onboarding_started", {
                      source: "audit_result",
                      url: resultUrl,
                      score: result.score,
                    })
                  }
                >
                  Have the agent fix this
                  <ArrowRight className="size-3.5" />
                </a>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={share}
                className="h-[42px] rounded-lg px-3.5 text-sm"
              >
                <Share2 className="size-3.5" />
                {shared ? "Link copied ✓" : "Share the report"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={reset}
                className="ml-auto h-[42px] text-[13.5px] text-muted-foreground"
              >
                Audit another URL
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default AuditTool;
