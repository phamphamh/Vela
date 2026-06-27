// Server-side data access for the dashboard's real experiment + audit surfaces.
// Returns plain serializable objects (no Prisma models) ready for the UI.

import { db } from "@/lib/db";
import { computeStats } from "@/lib/stats";
import { type AuditResult, type SurfaceKey } from "@/lib/agents/types";
import { type Surface } from "@/lib/generated/prisma/client";

const SURFACE_LABEL: Record<Surface, string> = {
  LANDING: "Landing",
  ONBOARDING: "Onboarding",
  PAYWALL: "Paywall",
};

const SURFACE_KEY: Record<Surface, SurfaceKey> = {
  LANDING: "landing",
  ONBOARDING: "onboarding",
  PAYWALL: "paywall",
};

export type ExperimentRow = {
  id: string;
  title: string;
  surface: string;
  surfaceKey: SurfaceKey;
  status: string;
  hypothesis: string;
  uplift: number | null; // relative fraction (0.12 = +12%)
  confidence: number | null; // 0–1
  visitors: number;
  prUrl: string | null;
  prNumber: number | null;
  running: string; // human-readable age / lifecycle hint
};

/** Relative time like "6d" / "3h" / "just now" from a past date. */
function age(from: Date | null): string | null {
  if (!from) return null;
  const ms = Date.now() - from.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function runningLabel(status: string, startedAt: Date | null): string {
  if (status === "RUNNING") return age(startedAt) ?? "live";
  if (status === "COMPLETED") return "shipped";
  if (status === "ABANDONED") return "dropped";
  if (status === "QUEUED") return "awaiting merge";
  return "—";
}

type ExpWithVariants = {
  id: string;
  title: string | null;
  surface: Surface;
  status: string;
  hypothesis: string | null;
  prUrl: string | null;
  prNumber: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
  variants: { kind: string; impressions: number; conversions: number }[];
};

function toRow(e: ExpWithVariants): ExperimentRow {
  const control = e.variants.find((v) => v.kind === "CONTROL");
  const treatment = e.variants.find((v) => v.kind === "TREATMENT");
  const stats = computeStats(
    { impressions: control?.impressions ?? 0, conversions: control?.conversions ?? 0 },
    { impressions: treatment?.impressions ?? 0, conversions: treatment?.conversions ?? 0 },
  );
  return {
    id: e.id,
    title: e.title ?? "Untitled experiment",
    surface: SURFACE_LABEL[e.surface],
    surfaceKey: SURFACE_KEY[e.surface],
    status: e.status,
    hypothesis: e.hypothesis ?? "",
    uplift: stats.uplift,
    confidence: stats.confidence,
    visitors: stats.visitors,
    prUrl: e.prUrl,
    prNumber: e.prNumber,
    running: runningLabel(e.status, e.startedAt),
  };
}

/** All experiments across the user's (latest) project, newest first. */
export async function getProjectExperiments(userId: string): Promise<{
  repoFullName: string | null;
  experiments: ExperimentRow[];
}> {
  const project = await db.project.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, repoFullName: true },
  });
  if (!project) return { repoFullName: null, experiments: [] };

  const rows = await db.experiment.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      surface: true,
      status: true,
      hypothesis: true,
      prUrl: true,
      prNumber: true,
      startedAt: true,
      completedAt: true,
      variants: { select: { kind: true, impressions: true, conversions: true } },
    },
  });

  return {
    repoFullName: project.repoFullName,
    experiments: rows.map(toRow),
  };
}

export type ExperimentDetail = ExperimentRow & {
  split: number;
  targetPath: string | null;
  control: { label: string; content: string | null; impressions: number; conversions: number; rate: number };
  treatment: { label: string; content: string | null; impressions: number; conversions: number; rate: number };
};

/** One experiment the user owns, with per-variant copy + rollups. */
export async function getExperimentDetail(
  userId: string,
  id: string,
): Promise<ExperimentDetail | null> {
  const e = await db.experiment.findFirst({
    where: { id, project: { userId } },
    select: {
      id: true,
      title: true,
      surface: true,
      status: true,
      hypothesis: true,
      prUrl: true,
      prNumber: true,
      split: true,
      targetPath: true,
      startedAt: true,
      completedAt: true,
      variants: {
        select: { kind: true, label: true, content: true, impressions: true, conversions: true },
      },
    },
  });
  if (!e) return null;

  const row = toRow(e);
  const c = e.variants.find((v) => v.kind === "CONTROL");
  const t = e.variants.find((v) => v.kind === "TREATMENT");
  const pack = (v: typeof c) => ({
    label: v?.label ?? "",
    content: v?.content ?? null,
    impressions: v?.impressions ?? 0,
    conversions: v?.conversions ?? 0,
    rate: v && v.impressions > 0 ? v.conversions / v.impressions : 0,
  });

  return {
    ...row,
    split: e.split,
    targetPath: e.targetPath,
    control: pack(c),
    treatment: pack(t),
  };
}

/** The most recent persisted codebase audit for the user's (latest) project. */
export async function getLatestAudit(userId: string): Promise<{
  repoFullName: string | null;
  result: AuditResult | null;
  createdAt: string | null;
  launchedTitles: Set<string>;
}> {
  const project = await db.project.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, repoFullName: true },
  });
  if (!project) return { repoFullName: null, result: null, createdAt: null, launchedTitles: new Set() };

  const [audit, experiments] = await Promise.all([
    db.projectAudit.findFirst({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      select: { result: true, createdAt: true },
    }),
    db.experiment.findMany({
      where: { projectId: project.id },
      select: { title: true },
    }),
  ]);

  return {
    repoFullName: project.repoFullName,
    result: (audit?.result as unknown as AuditResult) ?? null,
    createdAt: audit?.createdAt.toISOString() ?? null,
    // So the Surfaces page can mark opportunities that already became experiments.
    launchedTitles: new Set(experiments.map((e) => e.title?.toLowerCase()).filter(Boolean) as string[]),
  };
}
