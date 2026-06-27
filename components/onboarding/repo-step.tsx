"use client";

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Blocks,
  ChevronsUpDown,
  ExternalLink,
  FolderGit2,
  Globe,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { type Repo } from "@/components/onboarding/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function RepoStep({
  onBack,
  onSelect,
}: {
  onBack: () => void;
  onSelect: (repo: Repo) => void;
}) {
  const [repos, setRepos] = React.useState<Repo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [needsInstall, setNeedsInstall] = React.useState(false);
  const [installUrl, setInstallUrl] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // No synchronous setState here — the mount effect calls this and the rules of
  // hooks forbid setting state synchronously inside an effect. State is only
  // touched after the first `await`. `refresh` (an event handler) resets the
  // loading/error UI before re-running.
  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/github/repos");
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as {
        repos: Repo[];
        needsInstall?: boolean;
        installUrl?: string;
      };
      if (data.needsInstall) {
        setNeedsInstall(true);
        setInstallUrl(data.installUrl ?? null);
        return;
      }
      setNeedsInstall(false);
      setRepos(data.repos);
      setSelected(
        data.repos.find((r) => r.recommended)?.name ??
          data.repos[0]?.name ??
          null,
      );
    } catch {
      setError("Couldn't load your repositories.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = React.useCallback(() => {
    setLoading(true);
    setError(null);
    setNeedsInstall(false);
    void load();
  }, [load]);

  React.useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  // While the user installs the App in another tab, poll so the repo list
  // appears automatically — no manual refresh. Stops as soon as repos arrive
  // (needsInstall flips false) or the component unmounts.
  React.useEffect(() => {
    if (!needsInstall) return;
    const id = setInterval(() => {
      void load();
    }, 2500);
    return () => clearInterval(id);
  }, [needsInstall, load]);

  const filtered = repos.filter((r) =>
    `${r.name} ${r.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  const chosen = repos.find((r) => r.name === selected) ?? null;

  async function audit() {
    if (!chosen) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoFullName: chosen.name,
          repoUrl: chosen.url,
          githubRepoId: chosen.githubRepoId,
          defaultBranch: chosen.defaultBranch,
          private: chosen.private,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      onSelect(chosen);
    } catch {
      setError("Couldn't connect that repository. Try again.");
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-xl space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Choose your SaaS repo
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick the repository that holds your landing, onboarding, and paywall
          surfaces.
        </p>
      </div>

      <Card className="py-0">
        <CardContent className="space-y-3 px-0 py-4">
          {/* org + search */}
          <div className="flex flex-wrap items-center gap-2.5 px-4">
            <Button variant="outline" size="sm" className="gap-2 font-normal">
              <FolderGit2 className="size-4 text-muted-foreground" />
              GitHub
              <ChevronsUpDown className="size-3.5 text-muted-foreground" />
            </Button>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search repositories…"
                className="pl-8"
                disabled={loading || !!error || needsInstall}
              />
            </div>
          </div>

          {/* list */}
          <div className="max-h-[19rem] overflow-y-auto px-2">
            {loading ? (
              <div className="space-y-1 px-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-2.5 py-2.5"
                  >
                    <Skeleton className="size-4 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                  </div>
                ))}
              </div>
            ) : needsInstall ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <span className="flex size-10 items-center justify-center rounded-full border border-border bg-muted/40">
                  <Blocks className="size-5 text-primary" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Install the lead GitHub App
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pick the repositories you want to optimize. We&apos;ll detect
                    it automatically — no need to come back here.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {installUrl && (
                    <Button size="sm" asChild>
                      <a href={installUrl} target="_blank" rel="noreferrer">
                        <Blocks className="size-4" />
                        Install on GitHub
                        <ExternalLink className="size-3.5" />
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={refresh}>
                    <RefreshCw className="size-3.5" />
                    Check now
                  </Button>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Waiting for installation…
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-2 px-2.5 py-10 text-center">
                <TriangleAlert className="size-5 text-destructive" />
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-2.5 py-10 text-center text-sm text-muted-foreground">
                {query
                  ? `No repositories match “${query}”.`
                  : "No repositories found on your account."}
              </p>
            ) : (
              filtered.map((r) => {
                const active = r.name === selected;
                return (
                  <button
                    key={r.name}
                    type="button"
                    onClick={() => setSelected(r.name)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left transition-colors",
                      active ? "bg-accent" : "hover:bg-accent/50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border",
                        active
                          ? "border-primary"
                          : "border-muted-foreground/40",
                      )}
                    >
                      {active && (
                        <span className="size-2 rounded-full bg-primary" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-mono text-sm font-medium">
                          {r.name}
                        </span>
                        {r.recommended && (
                          <Badge className="gap-1 bg-primary/15 text-primary">
                            <Sparkles className="size-3" />
                            Recent
                          </Badge>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {r.description}
                      </div>
                    </div>
                    <div className="hidden shrink-0 items-center gap-3 font-mono text-[11px] text-muted-foreground sm:flex">
                      <span className="inline-flex items-center gap-1">
                        {r.private ? (
                          <Lock className="size-3" />
                        ) : (
                          <Globe className="size-3" />
                        )}
                        {r.private ? "Private" : "Public"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="size-2 rounded-full bg-chart-2" />
                        {r.language}
                      </span>
                      <span>{r.updated}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={saving}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button size="sm" disabled={!chosen || saving} onClick={audit}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Connecting…
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Audit {chosen ? chosen.name.split("/")[1] : "repository"}
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
