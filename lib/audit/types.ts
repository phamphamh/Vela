// Shared contract for the free landing audit. Both the server (lib/audit/*,
// app/api/audit) and the client UI (components/audit/*) import from here — do
// not redefine these shapes anywhere else.

export const SEVERITIES = ["P0", "P1", "P2", "P3"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const CATEGORIES = [
  "clarity",
  "cta",
  "proof",
  "friction",
  "value",
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface AuditFinding {
  /** Short headline for the issue. */
  title: string;
  severity: Severity;
  category: Category;
  /** Concrete, actionable recommendation. */
  recommendation: string;
  /** Exact quote pulled from the audited page, as evidence. */
  evidence: string;
}

export interface AuditResult {
  /** 0..100 overall CRO score. */
  score: number;
  /** 1-2 sentence English summary. */
  summary: string;
  /** 4 to 6 findings, ordered most → least severe. */
  findings: AuditFinding[];
}

/** Response shape of POST /api/audit. */
export type AuditResponse =
  | { ok: true; id: string; url: string | null; result: AuditResult }
  // The page looked like an empty SPA shell: ask the user to paste content.
  | { ok: false; needsPaste: true }
  | { ok: false; error: string };

// ---- UI helpers (pure, safe to import on client) ----

export type ScoreBand = "urgent" | "needs-work" | "solid";

/** <50 urgent · 50-74 needs work · >=75 solid. */
export function scoreBand(score: number): ScoreBand {
  if (score < 50) return "urgent";
  if (score < 75) return "needs-work";
  return "solid";
}

export function scoreBandLabel(band: ScoreBand): string {
  switch (band) {
    case "urgent":
      return "Urgent";
    case "needs-work":
      return "Needs work";
    case "solid":
      return "Solid";
  }
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  P0: "Critical",
  P1: "High",
  P2: "Medium",
  P3: "Minor",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  clarity: "Clarity",
  cta: "CTA",
  proof: "Proof",
  friction: "Friction",
  value: "Value",
};

/** Runtime guard used server-side to validate Claude's structured output. */
export function isAuditResult(value: unknown): value is AuditResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.score !== "number" || v.score < 0 || v.score > 100) return false;
  if (typeof v.summary !== "string" || v.summary.length === 0) return false;
  if (!Array.isArray(v.findings) || v.findings.length === 0) return false;
  return v.findings.every((f) => {
    if (typeof f !== "object" || f === null) return false;
    const x = f as Record<string, unknown>;
    return (
      typeof x.title === "string" &&
      typeof x.recommendation === "string" &&
      typeof x.evidence === "string" &&
      SEVERITIES.includes(x.severity as Severity) &&
      CATEGORIES.includes(x.category as Category)
    );
  });
}
