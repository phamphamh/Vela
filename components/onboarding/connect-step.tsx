"use client";

import * as React from "react";
import { Eye, GitPullRequest, Loader2, Lock, ShieldCheck } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

const guarantees = [
  {
    icon: Eye,
    title: "Read-only audit first",
    desc: "We analyze your landing, onboarding, and paywall surfaces — nothing is changed without you.",
  },
  {
    icon: GitPullRequest,
    title: "Every change is a reviewable PR",
    desc: "Variants ship as real pull requests behind a feature flag. Your CI deploys them.",
  },
  {
    icon: ShieldCheck,
    title: "Review-gated by default",
    desc: "The agent drafts; a human approves before anything goes live.",
  },
];

export function ConnectStep() {
  const [connecting, setConnecting] = React.useState(false);

  async function connect() {
    setConnecting(true);
    try {
      // Full-page redirect to GitHub, returning to the repo step authenticated.
      await authClient.signIn.social({
        provider: "github",
        callbackURL: "/onboarding?step=repo",
      });
    } catch {
      setConnecting(false);
    }
  }

  return (
    <div className="w-full max-w-lg space-y-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Connect your repository
        </h1>
        <p className="text-sm text-muted-foreground">
          lead reads your codebase to find and ship higher-converting landing
          pages, onboarding, and paywalls — automatically.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-5">
          <Button
            size="lg"
            className="w-full"
            onClick={connect}
            disabled={connecting}
          >
            {connecting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                <GithubMark className="size-4" />
                Continue with GitHub
              </>
            )}
          </Button>

          <div className="space-y-3.5 text-left">
            {guarantees.map((g) => {
              const Icon = g.icon;
              return (
                <div key={g.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{g.title}</div>
                    <p className="text-xs text-muted-foreground">{g.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <p className="flex items-center justify-center gap-1.5 font-mono text-xs text-muted-foreground">
        <Lock className="size-3" />
        We request access to read your repositories so the agent can analyze
        your surfaces.
      </p>
    </div>
  );
}
