import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { newSdkKey } from "@/lib/sdk-key";

type CreateProjectBody = {
  repoFullName: string;
  repoUrl: string;
  githubRepoId?: string;
  defaultBranch?: string;
  private?: boolean;
};

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json()) as CreateProjectBody;
  if (!body?.repoFullName || !body?.repoUrl) {
    return NextResponse.json(
      { error: "repoFullName and repoUrl are required" },
      { status: 400 },
    );
  }

  // Idempotent on (userId, repoFullName): reconnecting the same repo updates it.
  const project = await db.project.upsert({
    where: {
      userId_repoFullName: {
        userId: session.user.id,
        repoFullName: body.repoFullName,
      },
    },
    create: {
      userId: session.user.id,
      name: body.repoFullName.split("/")[1] ?? body.repoFullName,
      repoFullName: body.repoFullName,
      repoUrl: body.repoUrl,
      githubRepoId: body.githubRepoId,
      defaultBranch: body.defaultBranch ?? "main",
      private: body.private ?? false,
      // Minted once on connect; the customer embeds this in their tracking snippet.
      sdkKey: newSdkKey(),
    },
    update: {
      repoUrl: body.repoUrl,
      githubRepoId: body.githubRepoId,
      defaultBranch: body.defaultBranch ?? "main",
      private: body.private ?? false,
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const projects = await db.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ projects });
}
