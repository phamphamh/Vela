import { NextResponse } from "next/server";

import { db } from "@/lib/db";

// Public config — called cross-origin from the customer's site by sdk.js. This
// is the experiment "flag": only RUNNING experiments are served, so a test goes
// live the moment we flip it to RUNNING (after its PR is merged + deployed) and
// can be stopped instantly without a redeploy. Auth is the public `sdkKey`.
export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "60",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key) {
    return NextResponse.json({ experiments: [] }, { headers: CORS });
  }

  const project = await db.project.findUnique({
    where: { sdkKey: key },
    select: {
      id: true,
      experiments: {
        where: { status: "RUNNING" },
        select: {
          id: true,
          split: true,
          variants: { select: { id: true, kind: true } },
        },
      },
    },
  });

  const experiments = (project?.experiments ?? [])
    .map((e) => {
      const control = e.variants.find((v) => v.kind === "CONTROL");
      const treatment = e.variants.find((v) => v.kind === "TREATMENT");
      if (!control || !treatment) return null;
      return {
        id: e.id,
        // % of traffic routed to the treatment (B) cohort.
        split: e.split,
        a: control.id,
        b: treatment.id,
      };
    })
    .filter(Boolean);

  return new NextResponse(JSON.stringify({ experiments }), {
    headers: {
      ...CORS,
      "Content-Type": "application/json",
      // Short cache: experiments start/stop in near-real-time but this is hot.
      "Cache-Control": "public, max-age=30",
    },
  });
}
