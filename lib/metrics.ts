import { db } from "@/lib/db";

export type ProjectMetrics = {
  visitors: number;
  pageviews: number;
  clicks: number;
  conversions: number;
  /** conversions / visitors, 0–1. */
  conversionRate: number;
  /** Total events in the window (used to detect "no data yet"). */
  total: number;
  /** Most-clicked element labels. */
  topClicks: { name: string; count: number }[];
};

/**
 * Aggregate tracking events for a project over the last `days`. These power the
 * dashboard's live KPIs. Distinct visitors are counted via a grouped query.
 */
export async function getProjectMetrics(
  projectId: string,
  days = 14,
): Promise<ProjectMetrics> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const base = { projectId, createdAt: { gte: since } };

  const [pageviews, clicks, conversions, total, visitorGroups, topClicks] =
    await Promise.all([
      db.event.count({ where: { ...base, type: "PAGEVIEW" } }),
      db.event.count({ where: { ...base, type: "CLICK" } }),
      db.event.count({ where: { ...base, type: "CONVERSION" } }),
      db.event.count({ where: base }),
      db.event.groupBy({ by: ["visitorId"], where: base }),
      db.event.groupBy({
        by: ["name"],
        where: { ...base, type: "CLICK", name: { not: null } },
        _count: { name: true },
        orderBy: { _count: { name: "desc" } },
        take: 5,
      }),
    ]);

  const visitors = visitorGroups.length;

  return {
    visitors,
    pageviews,
    clicks,
    conversions,
    conversionRate: visitors > 0 ? conversions / visitors : 0,
    total,
    topClicks: topClicks.map((c) => ({
      name: c.name ?? "—",
      count: c._count.name,
    })),
  };
}
