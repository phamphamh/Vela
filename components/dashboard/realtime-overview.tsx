import { headers } from "next/headers";
import { Activity, MousePointerClick } from "lucide-react";

import { SetupSdkButton } from "@/components/dashboard/setup-sdk-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getProjectMetrics } from "@/lib/metrics";
import { ensureSdkKey } from "@/lib/sdk-key";

const WINDOW_DAYS = 14;

/**
 * The live-tracking band on the dashboard home: real KPIs aggregated from the
 * tracking SDK's events, with the install snippet so the customer can wire it up.
 * Renders nothing intrusive when there's no project yet.
 */
export async function RealtimeOverview() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const project = await db.project.findFirst({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, repoFullName: true, sdkKey: true },
  });
  if (!project) return null;

  const sdkKey = await ensureSdkKey(project);
  const metrics = await getProjectMetrics(project.id, WINDOW_DAYS);
  const baseUrl = env.BETTER_AUTH_URL;
  const snippet = `<script src="${baseUrl}/sdk.js" data-key="${sdkKey}" defer></script>`;

  const kpis = [
    { label: "Visitors", value: metrics.visitors },
    { label: "Pageviews", value: metrics.pageviews },
    { label: "Clicks", value: metrics.clicks },
    { label: "Conversions", value: metrics.conversions },
    {
      label: "Conv. rate",
      value: `${(metrics.conversionRate * 100).toFixed(1)}%`,
      accent: true,
    },
  ];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Activity className="size-4 text-primary" />
          Live tracking
          <span className="font-mono text-xs font-normal text-muted-foreground">
            {project.repoFullName} · last {WINDOW_DAYS}d
          </span>
        </h2>
        <Badge
          variant="outline"
          className={
            metrics.total > 0
              ? "gap-1.5 border-success/40 text-success"
              : "gap-1.5 text-muted-foreground"
          }
        >
          <span
            className={
              metrics.total > 0
                ? "size-1.5 rounded-full bg-success"
                : "size-1.5 rounded-full bg-muted-foreground/40"
            }
          />
          {metrics.total > 0 ? "Receiving events" : "No events yet"}
        </Badge>
      </div>

      {/* KPI strip — real numbers from the Event table */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="space-y-0.5 px-4">
              <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                {k.label}
              </div>
              <div
                className={`font-mono text-2xl font-semibold tabular-nums ${
                  k.accent ? "text-primary" : ""
                }`}
              >
                {typeof k.value === "number"
                  ? k.value.toLocaleString()
                  : k.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {metrics.total === 0 ? (
        // Empty state: let the agent set it up, or paste the snippet by hand.
        <div className="space-y-3">
          <SetupSdkButton repoFullName={project.repoFullName} />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or paste it manually
            <span className="h-px flex-1 bg-border" />
          </div>
          <Card>
          <CardContent className="space-y-3 py-5">
            <div className="text-sm font-medium">
              Add the tracking snippet to start collecting data
            </div>
            <p className="text-xs text-muted-foreground">
              Paste this into the{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">
                &lt;head&gt;
              </code>{" "}
              of {project.repoFullName}&apos;s site. It auto-tracks pageviews and
              clicks; mark a conversion with{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">
                data-lead-conversion
              </code>{" "}
              or{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">
                lead(&apos;conversion&apos;, &apos;signup&apos;)
              </code>
              .
            </p>
            <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs">
              {snippet}
            </pre>
          </CardContent>
          </Card>
        </div>
      ) : (
        metrics.topClicks.length > 0 && (
          // What visitors are actually clicking.
          <Card>
            <CardContent className="space-y-2.5 py-4">
              <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                <MousePointerClick className="size-3.5" />
                Most clicked
              </div>
              <div className="space-y-1.5">
                {metrics.topClicks.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="truncate text-foreground">{c.name}</span>
                    <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                      {c.count.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      )}
    </section>
  );
}
