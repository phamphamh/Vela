// POST /api/audit — the real audit backend for the free lead-magnet tool.
//
// Flow:
//   { text }  → audit the pasted copy directly.
//   { url }   → fetch (SSRF-guarded) → extract → if too thin & no text, ask the
//               user to paste; otherwise audit the extracted content.
// Every successful run is persisted as an Audit row (= a lead) and returned as
// an AuditResponse. Errors are returned as clean JSON; stack traces never leak.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchLanding } from "@/lib/audit/fetch";
import { extractContent, isThin } from "@/lib/audit/extract";
import { runAudit } from "@/lib/audit/claude";
import type { AuditResponse } from "@/lib/audit/types";
import type { Prisma } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

const MAX_TEXT_LEN = 50_000;
const MIN_TEXT_LEN = 20;

function json(body: AuditResponse, status: number) {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  // --- Parse body --------------------------------------------------------
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid request body." }, 400);
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const url = typeof payload.url === "string" ? payload.url.trim() : "";
  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const email =
    typeof payload.email === "string" && payload.email.trim()
      ? payload.email.trim().slice(0, 320)
      : null;

  if (!url && !text) {
    return json({ ok: false, error: "Provide a URL or paste your landing-page copy." }, 400);
  }

  try {
    let result;
    let source: "url" | "text";
    let storedUrl: string | null;

    if (text) {
      // --- Pasted-copy path ------------------------------------------------
      if (text.length < MIN_TEXT_LEN) {
        return json({ ok: false, error: "That's too little text to audit." }, 400);
      }
      const raw = text.slice(0, MAX_TEXT_LEN);
      result = await runAudit({ kind: "text", raw });
      source = "text";
      storedUrl = url || null;
    } else {
      // --- Crawl path ------------------------------------------------------
      const fetched = await fetchLanding(url);
      if (!fetched.ok) {
        return json({ ok: false, error: fetched.error }, 422);
      }

      const extracted = extractContent(fetched.html);
      if (isThin(extracted)) {
        // Likely an empty SPA shell — ask the UI to offer a paste box.
        return json({ ok: false, needsPaste: true }, 200);
      }

      result = await runAudit({ kind: "url", extracted });
      source = "url";
      storedUrl = fetched.finalUrl;
    }

    // --- Persist (every run = a lead) -------------------------------------
    const audit = await db.audit.create({
      data: {
        url: storedUrl,
        email,
        score: result.score,
        result: result as unknown as Prisma.InputJsonValue,
        source,
      },
    });

    return json({ ok: true, id: audit.id, url: storedUrl, result }, 200);
  } catch (err) {
    // Surface a clear, safe message; log the real error server-side only.
    const message =
      err instanceof Error && /ANTHROPIC_API_KEY/.test(err.message)
        ? "The audit service is not configured. Please try again later."
        : "Something went wrong while running the audit. Please try again.";
    console.error("[/api/audit] audit failed:", err);
    return json({ ok: false, error: message }, 500);
  }
}
