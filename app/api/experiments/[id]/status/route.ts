import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isPrMerged } from "@/lib/github";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Load an experiment the caller owns (joined to its project + repo). */
async function loadOwned(userId: string, id: string) {
  return db.experiment.findFirst({
    where: { id, project: { userId } },
    select: {
      id: true,
      status: true,
      prNumber: true,
      prUrl: true,
      split: true,
      project: { select: { repoFullName: true } },
    },
  });
}

function payload(e: {
  status: string;
  prUrl: string | null;
  prNumber: number | null;
  split: number;
}) {
  return {
    status: e.status,
    prUrl: e.prUrl,
    prNumber: e.prNumber,
    split: e.split,
    live: e.status === "RUNNING",
  };
}

/**
 * GET /api/experiments/[id]/status — poll. If the experiment is QUEUED and its
 * PR has been merged, flip it to RUNNING (this is the "merge → live" moment).
 */
export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const exp = await loadOwned(session.user.id, id);
  if (!exp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (exp.status === "QUEUED" && exp.prNumber) {
    const account = await db.account.findFirst({
      where: { userId: session.user.id, providerId: "github" },
      select: { accessToken: true },
    });
    if (account?.accessToken) {
      const merged = await isPrMerged(
        account.accessToken,
        exp.project.repoFullName,
        exp.prNumber,
      );
      if (merged) {
        const updated = await db.experiment.update({
          where: { id: exp.id },
          data: { status: "RUNNING", startedAt: new Date() },
          select: { status: true, prUrl: true, prNumber: true, split: true },
        });
        return NextResponse.json(payload(updated));
      }
    }
  }

  return NextResponse.json(payload(exp));
}

/**
 * POST /api/experiments/[id]/status — force-activate now (manual override, e.g.
 * the customer deployed from a non-PR branch). Flips QUEUED/DRAFT → RUNNING.
 */
export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const exp = await loadOwned(session.user.id, id);
  if (!exp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (exp.status === "RUNNING") return NextResponse.json(payload(exp));

  const updated = await db.experiment.update({
    where: { id: exp.id },
    data: { status: "RUNNING", startedAt: new Date() },
    select: { status: true, prUrl: true, prNumber: true, split: true },
  });
  return NextResponse.json(payload(updated));
}
