import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/** Shape consumed by components/onboarding/repo-step.tsx (`Repo`). */
type RepoDTO = {
  name: string;
  description: string;
  private: boolean;
  language: string;
  updated: string;
  recommended?: boolean;
  // extra metadata used when persisting the Project
  url: string;
  githubRepoId: string;
  defaultBranch: string;
};

type GithubRepo = {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  private: boolean;
  language: string | null;
  default_branch: string;
  pushed_at: string;
};

const GH_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const account = await db.account.findFirst({
    where: { userId: session.user.id, providerId: "github" },
    select: { accessToken: true },
  });
  if (!account?.accessToken) {
    return NextResponse.json(
      { error: "No linked GitHub account" },
      { status: 400 },
    );
  }
  const token = account.accessToken;
  const installUrl = `https://github.com/apps/${env.GITHUB_APP_SLUG}/installations/new`;

  // GitHub App flow: repos come through installations, not /user/repos. List the
  // installations of our app that this user can access, then their repositories.
  const instRes = await fetch(
    "https://api.github.com/user/installations?per_page=100",
    { headers: GH_HEADERS(token), cache: "no-store" },
  );
  if (!instRes.ok) {
    return NextResponse.json(
      { error: "Failed to read GitHub App installations" },
      { status: 502 },
    );
  }
  const { installations } = (await instRes.json()) as {
    installations: { id: number }[];
  };

  // App not installed yet → tell the UI to send the user to the install page.
  if (!installations?.length) {
    return NextResponse.json({ repos: [], needsInstall: true, installUrl });
  }

  // Gather repos across every installation the user has.
  const all: GithubRepo[] = [];
  for (const inst of installations) {
    const res = await fetch(
      `https://api.github.com/user/installations/${inst.id}/repositories?per_page=100`,
      { headers: GH_HEADERS(token), cache: "no-store" },
    );
    if (!res.ok) continue;
    const { repositories } = (await res.json()) as {
      repositories: GithubRepo[];
    };
    all.push(...repositories);
  }

  if (!all.length) {
    return NextResponse.json({ repos: [], needsInstall: true, installUrl });
  }

  // Most-recently-pushed first; flag the top one as the suggestion.
  all.sort(
    (a, b) =>
      new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime(),
  );
  const repos: RepoDTO[] = all.map((r, i) => ({
    name: r.full_name,
    description: r.description ?? "No description",
    private: r.private,
    language: r.language ?? "—",
    updated: relativeTime(r.pushed_at),
    recommended: i === 0,
    url: r.html_url,
    githubRepoId: String(r.id),
    defaultBranch: r.default_branch,
  }));

  return NextResponse.json({ repos });
}
