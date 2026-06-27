import {
  CreditCard,
  LayoutTemplate,
  Route,
  type LucideIcon,
} from "lucide-react";

/* --- repositories ----------------------------------------------------- */

// Returned by GET /api/github/repos (mapped from the GitHub API). The extra
// url / githubRepoId / defaultBranch fields are used when persisting a Project.
export type Repo = {
  name: string;
  description: string;
  private: boolean;
  language: string;
  updated: string;
  recommended?: boolean;
  url: string;
  githubRepoId: string;
  defaultBranch: string;
};

/* --- audit progress (mock) -------------------------------------------- */

export type AuditTask = {
  label: string;
  detail: string;
};

export const auditTasks: AuditTask[] = [
  { label: "Cloning repository", detail: "Read-only checkout of the default branch" },
  { label: "Mapping routes & components", detail: "142 files · 38 routes indexed" },
  { label: "Detecting conversion surfaces", detail: "Landing · Onboarding · Paywall found" },
  { label: "Auditing landing page", detail: "app/(marketing)/page.tsx" },
  { label: "Auditing onboarding flow", detail: "app/(app)/onboarding/*" },
  { label: "Auditing paywall", detail: "components/paywall/*" },
  { label: "Ranking opportunities", detail: "Scoring by expected impact" },
];

/* --- audit report (mock) ---------------------------------------------- */

export type Impact = "High" | "Medium" | "Low";

export type Advice = {
  title: string;
  rationale: string;
  impact: Impact;
  est: string; // estimated uplift
};

export type SurfaceAudit = {
  key: string;
  name: string;
  icon: LucideIcon;
  route: string;
  score: number; // 0–100 health
  summary: string;
  issues: string[];
  advice: Advice[];
};

export const surfaceAudits: SurfaceAudit[] = [
  {
    key: "landing",
    name: "Landing",
    icon: LayoutTemplate,
    route: "app/(marketing)/page.tsx",
    score: 62,
    summary:
      "Strong copy, but the primary CTA and trust signals are buried below the fold on mobile.",
    issues: [
      "Hero CTA below the fold for ~44% of mobile sessions",
      "No social proof in the first viewport",
      "Headline is feature-led, not outcome-led",
    ],
    advice: [
      {
        title: "Move the primary CTA above the fold on mobile",
        rationale: "44% of sessions never scroll to the current CTA position.",
        impact: "High",
        est: "+8–12%",
      },
      {
        title: "Add a logo strip + customer count near the hero",
        rationale: "Trust signals at first paint reduce bounce on cold traffic.",
        impact: "High",
        est: "+5–9%",
      },
      {
        title: "Rewrite the headline around the core outcome",
        rationale: "Outcome-led copy historically beats feature-led on signups.",
        impact: "Medium",
        est: "+3–6%",
      },
    ],
  },
  {
    key: "onboarding",
    name: "Onboarding",
    icon: Route,
    route: "app/(app)/onboarding/*",
    score: 71,
    summary:
      "A solid 4-step flow, but signup asks for too much before showing any value.",
    issues: [
      "Signup requires 6 fields before first value",
      "No progress indication across the flow",
    ],
    advice: [
      {
        title: "Reduce signup to email-only, defer the rest",
        rationale: "Each removed field on step 1 compounds activation.",
        impact: "High",
        est: "+7–11%",
      },
      {
        title: "Add a step progress checklist",
        rationale: "Visible progress lifts completion on multi-step flows.",
        impact: "Medium",
        est: "+3–5%",
      },
    ],
  },
  {
    key: "paywall",
    name: "Paywall",
    icon: CreditCard,
    route: "components/paywall/*",
    score: 58,
    summary:
      "The monthly price anchors high and there's no risk-reversal near the CTA.",
    issues: [
      "Monthly price anchors above the annual-equivalent",
      "No 'cancel anytime' / guarantee near the CTA",
    ],
    advice: [
      {
        title: "Default to annual with a savings chip",
        rationale: "Reframes the anchor around yearly value; lifts checkout starts.",
        impact: "High",
        est: "+9–14%",
      },
      {
        title: "Add 'cancel anytime' microcopy under the CTA",
        rationale: "Risk-reversal reduces checkout hesitation.",
        impact: "Medium",
        est: "+2–4%",
      },
    ],
  },
];

export const impactTone: Record<Impact, string> = {
  High: "border-primary/40 text-primary",
  Medium: "border-chart-2/50 text-foreground",
  Low: "text-muted-foreground",
};
