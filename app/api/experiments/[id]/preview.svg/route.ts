import { db } from "@/lib/db";
import { renderExperimentPreviewSvg } from "@/lib/preview-svg";
import { type Surface } from "@/lib/generated/prisma/client";

export const runtime = "nodejs";

const SURFACE_LABEL: Record<Surface, string> = {
  LANDING: "Landing",
  ONBOARDING: "Onboarding",
  PAYWALL: "Paywall",
};

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/experiments/[id]/preview.svg — a Before/After render of the copy
 * change, embedded in the launch PR body and the dashboard. Public (the id is
 * an unguessable cuid and the copy is already in a public PR), so GitHub's image
 * proxy can fetch it. Returns a neutral placeholder SVG if the id is unknown.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;

  const exp = await db.experiment.findUnique({
    where: { id },
    select: {
      title: true,
      surface: true,
      split: true,
      variants: { select: { kind: true, content: true } },
    },
  });

  const control = exp?.variants.find((v) => v.kind === "CONTROL")?.content ?? "Control";
  const treatment = exp?.variants.find((v) => v.kind === "TREATMENT")?.content ?? "Treatment";

  const svg = renderExperimentPreviewSvg({
    title: exp?.title ?? "A/B test preview",
    surfaceLabel: exp ? SURFACE_LABEL[exp.surface] : "Experiment",
    control,
    treatment,
    split: exp?.split ?? 50,
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Cache a little; the copy is fixed once the experiment exists.
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
