import {
  type AuditResult,
  type Severity,
  CATEGORY_LABEL,
  SEVERITY_LABEL,
  scoreBand,
  scoreBandLabel,
} from "@/lib/audit/types";
import { cn } from "@/lib/utils";

// Gauge geometry: r=52 → circumference = 2·π·52.
const GAUGE_R = 52;
const GAUGE_CIRC = 2 * Math.PI * GAUGE_R;

// Score band → semantic color (text/stroke via currentColor).
const BAND_COLOR: Record<ReturnType<typeof scoreBand>, string> = {
  urgent: "text-destructive",
  "needs-work": "text-chart-2",
  solid: "text-success",
};

// Severity pill → P0 Critical red · P1 High orange · P2 Medium gold · P3 Minor muted.
const SEVERITY_STYLE: Record<Severity, string> = {
  P0: "text-destructive bg-destructive/10",
  P1: "text-primary bg-primary/15",
  P2: "text-chart-2 bg-chart-2/20",
  P3: "text-muted-foreground bg-muted",
};

function hostFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    const stripped = url
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./, "")
      .split("/")[0];
    return stripped || null;
  }
}

export interface AuditReportProps {
  result: AuditResult;
  url?: string | null;
  /** Optional animated score; falls back to result.score. */
  displayScore?: number;
}

/**
 * Pure, server-safe presentation of an audit. Reused by the live tool and the
 * /audit/[id] share page — no hooks, no client-only logic.
 */
export function AuditReport({ result, url, displayScore }: AuditReportProps) {
  const score = Math.max(
    0,
    Math.min(100, Math.round(displayScore ?? result.score)),
  );
  const band = scoreBand(score);
  const bandColor = BAND_COLOR[band];
  const gaugeOffset = GAUGE_CIRC * (1 - score / 100);
  const host = hostFromUrl(url);

  return (
    <div>
      {/* score header */}
      <div className="flex flex-wrap items-center gap-5">
        <div className="relative size-26 shrink-0">
          <svg width="104" height="104" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r={GAUGE_R}
              fill="none"
              strokeWidth="10"
              className="stroke-muted"
            />
            <circle
              cx="60"
              cy="60"
              r={GAUGE_R}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              stroke="currentColor"
              strokeDasharray={GAUGE_CIRC.toFixed(3)}
              strokeDashoffset={gaugeOffset.toFixed(2)}
              transform="rotate(-90 60 60)"
              className={cn(
                bandColor,
                "transition-[stroke-dashoffset] duration-200",
              )}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={cn(
                "text-3xl font-semibold leading-none tabular-nums",
                bandColor,
              )}
            >
              {score}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              / 100
            </span>
          </div>
        </div>

        <div className="min-w-[200px] flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className={cn(
                "font-mono text-[13px] font-semibold uppercase tracking-[0.04em]",
                bandColor,
              )}
            >
              {scoreBandLabel(band)}
            </span>
            {host ? (
              <span className="font-mono text-xs text-muted-foreground">
                · {host}
              </span>
            ) : null}
          </div>
          <p className="text-[14.5px] leading-relaxed text-foreground text-pretty">
            {result.summary}
          </p>
        </div>
      </div>

      {/* findings */}
      <div className="mt-[18px]">
        <div className="mb-0.5 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
          What&apos;s blocking conversion
        </div>
        {result.findings.map((f, i) => (
          <div
            key={i}
            className="flex gap-3.5 border-t border-border py-4"
          >
            <span className="shrink-0 pt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-[19px] items-center rounded-full px-2 font-mono text-[11px] font-semibold",
                    SEVERITY_STYLE[f.severity],
                  )}
                >
                  {f.severity} · {SEVERITY_LABEL[f.severity]}
                </span>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.05em] text-muted-foreground">
                  {CATEGORY_LABEL[f.category]}
                </span>
                <span className="min-w-[140px] flex-1 text-[14.5px] font-semibold">
                  {f.title}
                </span>
              </div>
              <p className="mb-2 text-[13.5px] leading-relaxed text-foreground">
                {f.recommendation}
              </p>
              <div className="border-l-2 border-border pl-2.5 font-mono text-[12.5px] italic text-muted-foreground">
                {f.evidence}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AuditReport;
