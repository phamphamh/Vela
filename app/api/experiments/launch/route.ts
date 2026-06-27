import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { runLaunch, type LaunchEvent } from "@/lib/agents/launch-experiment";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ensureSdkKey } from "@/lib/sdk-key";
import { type SurfaceKey } from "@/lib/agents/types";

export const maxDuration = 300;
export const runtime = "nodejs";

/**
 * POST /api/experiments/launch — the experiment agent reads the connected repo,
 * designs one A/B copy test, writes both variants behind the SDK flag, and opens
 * a reviewable PR (via the GitHub App). Streams progress as NDJSON (`LaunchEvent`
 * per line). Optional JSON body { surface, title, rationale } seeds the agent
 * with the audit's top opportunity.
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Agent not configured." }, { status: 503 });
  }

  const project = await db.project.findFirst({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, repoFullName: true, defaultBranch: true, sdkKey: true, private: true },
  });
  if (!project) {
    return NextResponse.json({ error: "No project connected" }, { status: 404 });
  }

  const account = await db.account.findFirst({
    where: { userId: session.user.id, providerId: "github" },
    select: { accessToken: true },
  });
  if (!account?.accessToken) {
    return NextResponse.json({ error: "No linked GitHub account" }, { status: 400 });
  }

  // Optional seed hint from the audit (best-effort; ignore malformed bodies).
  let hint: { surface?: SurfaceKey; title?: string; rationale?: string } | null = null;
  try {
    const body = (await request.json()) as {
      surface?: string;
      title?: string;
      rationale?: string;
    } | null;
    if (body && ["landing", "onboarding", "paywall"].includes(body.surface ?? "")) {
      hint = {
        surface: body.surface as SurfaceKey,
        title: typeof body.title === "string" ? body.title : undefined,
        rationale: typeof body.rationale === "string" ? body.rationale : undefined,
      };
    }
  } catch {
    // no body — the agent picks the surface itself
  }

  // Ensure the project has an SDK key so attribution works once it's live.
  await ensureSdkKey(project);
  const userToken = account.accessToken;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: LaunchEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        await runLaunch({
          userToken,
          projectId: project.id,
          repoFullName: project.repoFullName,
          branch: project.defaultBranch,
          repoPrivate: project.private,
          hint,
          onEvent: send,
        });
      } catch (e) {
        console.error("[launch] failed", e);
        send({ type: "error", message: e instanceof Error ? e.message : "Launch failed." });
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
