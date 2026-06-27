// Shared contract — ALL feature code imports from here. Do not duplicate these types.
import { z } from "zod";

// ---- Landing config (what the agent edits) ----
// ctaColor is a HEX string applied via inline style (NOT a Tailwind class — avoids JIT purge).
// heroVariant selects one of 3 pre-coded hero layouts.
export const HERO_VARIANTS = ["A", "B", "C"] as const;
export type HeroVariant = (typeof HERO_VARIANTS)[number];

export const ConfigJsonSchema = z.object({
  headline: z.string().min(1).max(140),
  sousTitre: z.string().min(1).max(240),
  ctaText: z.string().min(1).max(60),
  ctaColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, "ctaColor must be a 6-digit hex like #2563eb"),
  heroVariant: z.enum(HERO_VARIANTS),
});
export type ConfigJson = z.infer<typeof ConfigJsonSchema>;

// ---- Events ----
export const EVENT_TYPES = ["view", "click_cta", "form_qualified"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// ---- Verdicts ----
export const VERDICTS = ["ship", "reject", "abstain"] as const;
export type Verdict = (typeof VERDICTS)[number];

// ---- Modes ----
export const MODES = ["live", "accelerated"] as const;
export type Mode = (typeof MODES)[number];

// ---- Per-config metrics computed before the agent decides ----
export interface ConfigMetrics {
  configId: string;
  active: boolean;
  json: ConfigJson;
  views: number;
  clicks: number;
  forms: number;
  proximalRate: number; // clicks / views (0..1), 0 if views=0
  downstreamRate: number; // forms / views (0..1), 0 if views=0
}

// ---- Agent structured output (validated server-side after the Claude call) ----
export const AgentDecisionSchema = z.object({
  hypothesis: z.string().min(1),
  reasoning: z.string().min(1),
  verdict: z.enum(VERDICTS),
  // proximal/downstream deltas vs the current active config (decimal points, e.g. 0.12 = +12pts)
  proximalDelta: z.number().nullable(),
  downstreamDelta: z.number().nullable(),
  // The proposed new config. Required when verdict === 'ship', otherwise may be null.
  config: ConfigJsonSchema.nullable(),
});
export type AgentDecision = z.infer<typeof AgentDecisionSchema>;

// ---- Tunables ----
export const SAMPLE_GATE_N = Number(process.env.SAMPLE_GATE_N ?? 30); // min events/variant before non-abstain
