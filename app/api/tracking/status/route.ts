import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureSdkKey } from "@/lib/sdk-key";

// Session-guarded: returns the install key + whether events are flowing, so the
// Settings install card can show the key and a live "Connected" status.
export const runtime = "nodejs";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const project = await db.project.findFirst({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, repoFullName: true, sdkKey: true },
  });
  if (!project) {
    return NextResponse.json({ error: "No project connected" }, { status: 404 });
  }

  const sdkKey = await ensureSdkKey(project);
  const [total, last] = await Promise.all([
    db.event.count({ where: { projectId: project.id } }),
    db.event.findFirst({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, type: true },
    }),
  ]);

  return NextResponse.json({
    sdkKey,
    repoFullName: project.repoFullName,
    connected: total > 0,
    total,
    lastEventAt: last?.createdAt ?? null,
    lastEventType: last?.type ?? null,
  });
}
