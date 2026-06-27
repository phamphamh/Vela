import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { runAudit } from "@/lib/agents/audit";
import { type AuditEvent } from "@/lib/agents/types";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { type Prisma } from "@/lib/generated/prisma/client";

// The audit runs several Opus calls; give it headroom on Vercel.
export const maxDuration = 300;
export const runtime = "nodejs";

type AuditBody = { repoFullName?: string };

/**
 * POST /api/audit — run the codebase-audit agents for a connected repo and
 * stream progress back as newline-delimited JSON (`AuditEvent` per line).
 * Self-guards via the session; the repo must be a Project the user owns.
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Audit agent not configured (missing ANTHROPIC_API_KEY)." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as AuditBody;
  if (!body.repoFullName) {
    return NextResponse.json({ error: "repoFullName is required" }, { status: 400 });
  }

  // Authorize: the repo must be a Project this user owns.
  const project = await db.project.findUnique({
    where: {
      userId_repoFullName: {
        userId: session.user.id,
        repoFullName: body.repoFullName,
      },
    },
    select: { id: true, defaultBranch: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Repository not connected" }, { status: 404 });
  }

  // The GitHub OAuth token we read the repo with (never logged).
  const account = await db.account.findFirst({
    where: { userId: session.user.id, providerId: "github" },
    select: { accessToken: true },
  });
  if (!account?.accessToken) {
    return NextResponse.json({ error: "No linked GitHub account" }, { status: 400 });
  }

  const token = account.accessToken;
  const repoFullName = body.repoFullName;
  const branch = project.defaultBranch;
  const projectId = project.id;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AuditEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        const result = await runAudit({ token, repoFullName, branch, onEvent: send });
        // Persist the audit so the dashboard Surfaces + opportunities work off
        // real data (and the launch agent can act on it) without re-running.
        const scores = result.surfaces.map((s) => s.score);
        const avg = scores.length
          ? Math.round(scores.reduce((n, v) => n + v, 0) / scores.length)
          : 0;
        await db.projectAudit.create({
          data: {
            projectId,
            score: avg,
            result: result as unknown as Prisma.InputJsonValue,
          },
        });
      } catch (e) {
        console.error("[audit] run failed", e);
        send({
          type: "error",
          message: e instanceof Error ? e.message : "Audit failed.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
    },
  });
}
