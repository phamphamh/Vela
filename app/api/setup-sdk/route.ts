import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { runSdkSetup, type SetupEvent } from "@/lib/agents/setup-sdk";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ensureSdkKey } from "@/lib/sdk-key";

export const maxDuration = 300;
export const runtime = "nodejs";

/**
 * POST /api/setup-sdk — the setup agent reads the connected repo, installs the
 * tracking SDK, marks signup/checkout conversions, and opens a PR (via the
 * GitHub App). Streams progress as NDJSON (`SetupEvent` per line).
 */
export async function POST() {
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
    select: { id: true, repoFullName: true, defaultBranch: true, sdkKey: true },
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

  const sdkKey = await ensureSdkKey(project);
  const userToken = account.accessToken;
  const repoFullName = project.repoFullName;
  const branch = project.defaultBranch;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: SetupEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        await runSdkSetup({ userToken, repoFullName, branch, sdkKey, onEvent: send });
      } catch (e) {
        console.error("[setup-sdk] failed", e);
        send({ type: "error", message: e instanceof Error ? e.message : "Setup failed." });
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
