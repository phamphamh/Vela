import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { type ExperimentStatus } from "@/lib/generated/prisma/client";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/experiments/[id]/decision — a gated lifecycle decision on a running
 * experiment. `action`:
 *   - "ship"    → COMPLETED (ship the winner)
 *   - "abandon" → ABANDONED (drop it)
 * The experiment stops being served by /api/experiments/active either way (only
 * RUNNING is served), so this is also the instant kill switch.
 */
export async function POST(request: Request, { params }: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  const action = body.action;

  const exp = await db.experiment.findFirst({
    where: { id, project: { userId: session.user.id } },
    select: { id: true, status: true },
  });
  if (!exp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let status: ExperimentStatus;
  if (action === "ship") status = "COMPLETED";
  else if (action === "abandon") status = "ABANDONED";
  else return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  const updated = await db.experiment.update({
    where: { id: exp.id },
    data: { status, completedAt: new Date() },
    select: { status: true },
  });

  return NextResponse.json({ status: updated.status });
}
