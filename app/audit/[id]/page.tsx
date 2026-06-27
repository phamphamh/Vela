import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, RefreshCw } from "lucide-react";

import { AuditReport } from "@/components/audit/audit-report";
import { SiteNav } from "@/components/site/site-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { Button } from "@/components/ui/button";
import {
  isAuditResult,
  scoreBand,
  scoreBandLabel,
} from "@/lib/audit/types";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function hostFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    const stripped = url
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./, "")
      .split("/")[0];
    return stripped || null;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const audit = await db.audit.findUnique({ where: { id } });

  if (!audit || !isAuditResult(audit.result)) {
    return {
      title: "CRO audit — Vela",
      description: "A free, Claude-generated CRO audit by Vela.",
    };
  }

  const result = audit.result;
  const host = hostFromUrl(audit.url);
  const band = scoreBandLabel(scoreBand(result.score));
  const subject = host ?? "this landing page";

  const title = `CRO audit: ${subject} scored ${result.score}/100 (${band})`;
  const description = result.summary;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function AuditSharePage({ params }: PageProps) {
  const { id } = await params;
  const audit = await db.audit.findUnique({ where: { id } });

  if (!audit || !isAuditResult(audit.result)) {
    notFound();
  }

  const result = audit.result;
  const host = hostFromUrl(audit.url);

  return (
    <div className="flex min-h-full flex-col">
      <SiteNav />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-[760px] px-6 pb-16 pt-[56px]">
          {/* headline */}
          <div className="mb-8">
            <div className="mb-3 font-mono text-xs uppercase tracking-[0.08em] text-primary">
              CRO audit
            </div>
            <h1 className="text-balance text-[clamp(28px,4vw,42px)] font-semibold leading-[1.08] tracking-[-0.02em]">
              CRO audit{host ? <> — {host}</> : null}
            </h1>
            <p className="mt-3 text-pretty text-base text-muted-foreground">
              A free, login-free CRO pass by Claude. Here&apos;s what&apos;s
              blocking conversion — and what the agent would fix first.
            </p>
          </div>

          {/* report card */}
          <div className="rounded-[14px] border border-border bg-card p-6 shadow-[0_18px_50px_-22px_oklch(0.28_0.03_60/.35)] sm:p-7">
            <AuditReport result={result} url={audit.url} />
          </div>

          {/* CTAs */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-12 px-6 text-[15px]">
              <Link href="/onboarding">
                Have the agent fix this
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-5 text-[15px]">
              <Link href="/audit">
                <RefreshCw data-icon="inline-start" />
                Run your own free audit
              </Link>
            </Button>
          </div>

          <p className="mt-5 text-[12.5px] text-muted-foreground">
            The free audit is a preview of the first pass. The real loop runs on
            your repo, on loop, 24/7.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
