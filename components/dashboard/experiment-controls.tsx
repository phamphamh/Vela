"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ExternalLink,
  GitPullRequest,
  Loader2,
  Radio,
  Rocket,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Gated decision controls for an experiment detail page. Activate (once the PR
 * is merged), ship the winner, or abandon — each flips status server-side and
 * refreshes. Hard-to-reverse actions confirm first.
 */
export function ExperimentControls({
  id,
  status,
  prUrl,
  prNumber,
}: {
  id: string;
  status: string;
  prUrl: string | null;
  prNumber: number | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  async function post(path: string, body?: unknown) {
    setBusy(path);
    try {
      await fetch(`/api/experiments/${id}/${path}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const spin = (k: string) =>
    busy === k ? <Loader2 className="size-4 animate-spin" /> : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "QUEUED" && (
        <Button size="sm" onClick={() => post("status")} disabled={busy !== null}>
          {spin("status") ?? <Radio className="size-4" />}
          Activate now
        </Button>
      )}

      {(status === "RUNNING" || status === "CONCLUSIVE") && (
        <>
          <Button
            size="sm"
            onClick={() => post("decision", { action: "ship" })}
            disabled={busy !== null}
          >
            {spin("decision") ?? <Rocket className="size-4" />}
            Ship winner
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (confirm("Abandon this experiment? It stops serving immediately."))
                post("decision", { action: "abandon" });
            }}
            disabled={busy !== null}
          >
            <XCircle className="size-4" />
            Abandon
          </Button>
        </>
      )}

      {status === "COMPLETED" && (
        <span className="inline-flex items-center gap-1.5 text-sm text-success">
          <CheckCircle2 className="size-4" />
          Winner shipped
        </span>
      )}
      {status === "ABANDONED" && (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <XCircle className="size-4" />
          Abandoned
        </span>
      )}

      {prUrl && (
        <div className="ml-auto">
          <Button size="sm" variant="ghost" asChild>
            <a href={prUrl} target="_blank" rel="noreferrer" className="text-muted-foreground">
              <GitPullRequest className="size-4" />
              PR #{prNumber}
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
