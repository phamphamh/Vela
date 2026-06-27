// Lightweight frequentist stats for A/B experiments, computed from the per-
// variant impression/conversion rollups on `Variant`. No deps — a standard
// two-proportion z-test with a normal-CDF approximation.

/** Standard normal CDF via the Abramowitz–Stegun erf approximation. */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-(z * z) / 2);
  const p =
    d *
    t *
    (0.319381530 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1 - p : p;
}

export type VariantStat = {
  impressions: number;
  conversions: number;
  /** conversions / impressions, 0–1 (0 when no impressions yet). */
  rate: number;
};

export type ExperimentStats = {
  control: VariantStat;
  treatment: VariantStat;
  /** Relative uplift of treatment vs control, as a fraction (0.12 = +12%). Null until both have data. */
  uplift: number | null;
  /** Statistical confidence the difference is real, 0–1 (1 - two-sided p). Null until testable. */
  confidence: number | null;
  /** Total visitors across both variants (sum of impressions). */
  visitors: number;
};

function stat(impressions: number, conversions: number): VariantStat {
  return {
    impressions,
    conversions,
    rate: impressions > 0 ? conversions / impressions : 0,
  };
}

export function computeStats(
  control: { impressions: number; conversions: number },
  treatment: { impressions: number; conversions: number },
): ExperimentStats {
  const c = stat(control.impressions, control.conversions);
  const t = stat(treatment.impressions, treatment.conversions);

  let uplift: number | null = null;
  let confidence: number | null = null;

  if (c.impressions > 0 && t.impressions > 0 && c.rate > 0) {
    uplift = (t.rate - c.rate) / c.rate;
  }

  // Need conversions on both sides for a meaningful test.
  if (c.impressions > 0 && t.impressions > 0 && c.conversions + t.conversions > 0) {
    const pooled = (c.conversions + t.conversions) / (c.impressions + t.impressions);
    const se = Math.sqrt(pooled * (1 - pooled) * (1 / c.impressions + 1 / t.impressions));
    if (se > 0) {
      const z = (t.rate - c.rate) / se;
      const pValue = 2 * (1 - normalCdf(Math.abs(z)));
      confidence = Math.max(0, Math.min(1, 1 - pValue));
    }
  }

  return { control: c, treatment: t, uplift, confidence, visitors: c.impressions + t.impressions };
}
