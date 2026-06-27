// Serializable types shared between the audit orchestrator (server) and the
// onboarding UI (client). No server-only or non-serializable values (e.g. React
// icons) live here — the UI maps surface keys to icons itself.

export type SurfaceKey = "landing" | "onboarding" | "paywall";
export type Impact = "High" | "Medium" | "Low";

export const SURFACE_LABELS: Record<SurfaceKey, string> = {
  landing: "Landing",
  onboarding: "Onboarding",
  paywall: "Paywall",
};

/** One recommended change the orchestrator could turn into an experiment. */
export type Advice = {
  title: string;
  rationale: string;
  impact: Impact;
  /** Estimated conversion uplift, e.g. "+5–9%". */
  est: string;
};

/** The audit for a single conversion surface. */
export type SurfaceAudit = {
  key: SurfaceKey;
  name: string;
  /** Files/paths that make up this surface. */
  routes: string[];
  /** 0–100 health score. */
  score: number;
  summary: string;
  issues: string[];
  advice: Advice[];
};

export type AuditResult = {
  repoFullName: string;
  surfaces: SurfaceAudit[];
};

/* --- streaming progress events (NDJSON from /api/audit) ---------------- */

export type AuditEvent =
  | { type: "status"; label: string; detail?: string; progress: number }
  | { type: "surfaces"; surfaces: { key: SurfaceKey; name: string }[] }
  | { type: "surface_done"; audit: SurfaceAudit }
  | { type: "done"; result: AuditResult }
  | { type: "error"; message: string };
