"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { AuditStep } from "@/components/onboarding/audit-step";
import { ConnectStep } from "@/components/onboarding/connect-step";
import { type Repo } from "@/components/onboarding/data";
import { ReportStep } from "@/components/onboarding/report-step";
import { RepoStep } from "@/components/onboarding/repo-step";
import { Stepper, type StepKey } from "@/components/onboarding/stepper";
import { type AuditResult } from "@/lib/agents/types";
import { useSession } from "@/lib/auth-client";

export default function OnboardingPage() {
  const { data: session, isPending } = useSession();
  // Once the user acts, `step` drives the flow. Until then we derive the entry
  // step from the session (authenticated → skip Connect, e.g. post-OAuth return).
  const [step, setStep] = React.useState<StepKey | null>(null);
  const [repo, setRepo] = React.useState<Repo | null>(null);
  const [audit, setAudit] = React.useState<AuditResult | null>(null);

  const current = step ?? (isPending ? null : session ? "repo" : "connect");

  if (current === null) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-4xl flex-1 flex-col items-center gap-8">
      <Stepper current={current} />

      <div className="flex w-full flex-1 justify-center">
        {current === "connect" && <ConnectStep />}

        {current === "repo" && (
          <RepoStep
            onBack={() => setStep("connect")}
            onSelect={(r) => {
              setRepo(r);
              setStep("audit");
            }}
          />
        )}

        {current === "audit" && repo && (
          <AuditStep
            repoFullName={repo.name}
            onComplete={(result) => {
              setAudit(result);
              setStep("report");
            }}
          />
        )}

        {current === "report" && repo && audit && (
          <ReportStep repoName={repo.name} audit={audit} />
        )}
      </div>
    </div>
  );
}
