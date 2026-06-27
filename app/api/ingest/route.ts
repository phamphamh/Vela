import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { type Prisma } from "@/lib/generated/prisma/client";

// Public collector — called cross-origin from the customer's site by sdk.js.
// Authentication is the per-project `sdkKey`, not a session. Keep it cheap.
export const runtime = "nodejs";

const EVENT_TYPES = ["PAGEVIEW", "CLICK", "CONVERSION", "EXPOSURE"] as const;
type EventType = (typeof EVENT_TYPES)[number];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

// Preflight (browsers send OPTIONS before the cross-origin POST).
export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

type IncomingEvent = {
  type?: string;
  name?: string;
  path?: string;
  ref?: string;
  experimentId?: string;
  variantId?: string;
  meta?: unknown;
  ts?: number;
};

type IngestBody = {
  sdkKey?: string;
  visitorId?: string;
  sessionId?: string;
  events?: IncomingEvent[];
};

const MAX_EVENTS = 50;

function str(v: unknown, max = 512): string | null {
  return typeof v === "string" && v.length > 0 ? v.slice(0, max) : null;
}

export async function POST(request: Request) {
  let body: IngestBody;
  try {
    body = (await request.json()) as IngestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CORS });
  }

  const sdkKey = str(body.sdkKey, 128);
  const visitorId = str(body.visitorId, 128);
  if (!sdkKey || !visitorId || !Array.isArray(body.events)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400, headers: CORS });
  }

  // Resolve the project from its public key. Unknown key → 204 (don't leak).
  const project = await db.project.findUnique({
    where: { sdkKey },
    select: { id: true },
  });
  if (!project) {
    return new Response(null, { status: 204, headers: CORS });
  }

  const sessionId = str(body.sessionId, 128);
  const rows: Prisma.EventCreateManyInput[] = [];
  // Variant rollups: exposures → impressions, conversions → conversions.
  const impressions = new Map<string, number>();
  const conversions = new Map<string, number>();

  for (const ev of body.events.slice(0, MAX_EVENTS)) {
    const type = ev.type as EventType;
    if (!EVENT_TYPES.includes(type)) continue;

    rows.push({
      projectId: project.id,
      type,
      visitorId,
      sessionId,
      name: str(ev.name, 200),
      path: str(ev.path, 512),
      referrer: str(ev.ref, 512),
      experimentId: str(ev.experimentId, 128),
      variantId: str(ev.variantId, 128),
      meta:
        ev.meta && typeof ev.meta === "object"
          ? (ev.meta as Prisma.InputJsonValue)
          : undefined,
      createdAt:
        typeof ev.ts === "number" && ev.ts > 0 ? new Date(ev.ts) : undefined,
    });

    const variantId = str(ev.variantId, 128);
    if (variantId && type === "EXPOSURE") {
      impressions.set(variantId, (impressions.get(variantId) ?? 0) + 1);
    } else if (variantId && type === "CONVERSION") {
      conversions.set(variantId, (conversions.get(variantId) ?? 0) + 1);
    }
  }

  if (rows.length === 0) {
    return new Response(null, { status: 204, headers: CORS });
  }

  await db.event.createMany({ data: rows });

  // Best-effort rollups; updateMany no-ops if the variant id doesn't exist.
  await Promise.all([
    ...[...impressions].map(([id, n]) =>
      db.variant.updateMany({
        where: { id },
        data: { impressions: { increment: n } },
      }),
    ),
    ...[...conversions].map(([id, n]) =>
      db.variant.updateMany({
        where: { id },
        data: { conversions: { increment: n } },
      }),
    ),
  ]);

  return new Response(null, { status: 202, headers: CORS });
}
