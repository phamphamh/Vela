// The real Claude call behind the free audit. Uses the Anthropic SDK with a
// FORCED structured tool ("submit_audit") so the model always returns a
// well-typed AuditResult instead of free-form prose. We validate the tool
// input server-side with isAuditResult and retry once before giving up.
//
// Design notes:
//   - Model is AGENT_MODEL (Opus 4.8 by default). On Opus 4.8 we omit the
//     `thinking` param: forcing a specific tool via tool_choice is incompatible
//     with extended thinking, and forced structured output is what we want here.
//   - No sampling params (temperature/top_p) — removed on Opus 4.7/4.8.

import Anthropic from "@anthropic-ai/sdk";
import { AGENT_MODEL } from "@/lib/config";
import { isAuditResult, type AuditResult } from "@/lib/audit/types";
import type { ExtractedContent } from "@/lib/audit/extract";

export type AuditInput =
  | { kind: "url"; extracted: ExtractedContent }
  | { kind: "text"; raw: string };

const TOOL_NAME = "submit_audit";
const MAX_TOKENS = 4096;

const SYSTEM_PROMPT = `You are a senior conversion-rate-optimization (CRO) auditor for B2B SaaS landing pages. You are demanding, specific, and evidence-driven.

Your single objective: judge how well this page converts a visitor into a QUALIFIED LEAD — someone who books a demo or starts a real evaluation — NOT vanity clicks, signups from the wrong audience, or raw traffic. A page that drives lots of low-intent clicks but few qualified conversations scores LOW.

Evaluate the page across these lenses:
- clarity: Is the value proposition concrete and immediately understood? Does the visitor know what this is, who it's for, and the outcome it delivers?
- cta: Is there ONE obvious primary action, above the fold, with outcome-driven copy? Are competing CTAs diluting it?
- proof: Does credible proof (logos, hard metrics, testimonials, case studies) arrive BEFORE the ask?
- friction: How much effort/risk does converting require (long forms, unclear pricing, account required, cognitive load)?
- value: Is the offer compelling and differentiated, or generic category language?

Scoring (0-100): <50 = urgent problems blocking qualified conversion; 50-74 = converts but leaves clear money on the table; 75+ = solid, only refinements left. Be honest — most real pages land 45-70.

Produce 4 to 6 findings, ordered MOST severe to LEAST severe. Each finding must:
- have a sharp, specific title
- carry a severity P0 (critical, actively blocking qualified conversion) to P3 (minor polish)
- be tagged with exactly one category
- give a concrete, actionable recommendation (a thing to change, not "improve X")
- quote EXACT text from the page in 'evidence'. Only quote text actually present in the content provided. If the page is thin, say so in the evidence rather than inventing quotes.

Call the ${TOOL_NAME} tool with your full structured audit. Do not respond with prose.`;

/** JSON Schema mirroring AuditResult — the forced tool's input_schema. */
const AUDIT_TOOL: Anthropic.Tool = {
  name: TOOL_NAME,
  description:
    "Submit the structured CRO audit for the landing page. Always provide a score, a one-to-two sentence summary, and 4-6 findings ordered most to least severe.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      score: {
        type: "integer",
        minimum: 0,
        maximum: 100,
        description:
          "Overall qualified-lead conversion score, 0-100. Most real pages land 45-70.",
      },
      summary: {
        type: "string",
        description: "1-2 sentence plain-English summary of the page's conversion health.",
      },
      findings: {
        type: "array",
        minItems: 4,
        maxItems: 6,
        description: "4 to 6 findings, ordered most to least severe.",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string", description: "Short, specific headline for the issue." },
            severity: {
              type: "string",
              enum: ["P0", "P1", "P2", "P3"],
              description: "P0 critical → P3 minor.",
            },
            category: {
              type: "string",
              enum: ["clarity", "cta", "proof", "friction", "value"],
            },
            recommendation: {
              type: "string",
              description: "Concrete, actionable fix.",
            },
            evidence: {
              type: "string",
              description: "Exact quote pulled from the page as evidence.",
            },
          },
          required: ["title", "severity", "category", "recommendation", "evidence"],
        },
      },
    },
    required: ["score", "summary", "findings"],
  },
};

/** Build the compact, model-facing description of the page being audited. */
function buildUserContent(input: AuditInput): string {
  if (input.kind === "text") {
    return [
      "The user pasted their landing-page copy directly (the page could not be crawled). Audit this text:",
      "",
      input.raw.slice(0, 12_000),
    ].join("\n");
  }

  const e = input.extracted;
  const list = (items: string[]) =>
    items.length ? items.map((x) => `- ${x}`).join("\n") : "(none)";

  return [
    "Content extracted from the landing page:",
    "",
    `TITLE: ${e.title || "(none)"}`,
    `META DESCRIPTION: ${e.description || "(none)"}`,
    "",
    "HEADINGS (h1/h2/h3):",
    list(e.headings),
    "",
    "CTAs / BUTTONS / LINKS:",
    list(e.ctas),
    "",
    "PARAGRAPHS:",
    list(e.paragraphs),
  ].join("\n");
}

/** Extract the forced tool's input from a Claude response, if present. */
function extractToolInput(message: Anthropic.Message): unknown {
  for (const block of message.content) {
    if (block.type === "tool_use" && block.name === TOOL_NAME) {
      return block.input;
    }
  }
  return undefined;
}

/**
 * Run the audit. Throws a clear Error if ANTHROPIC_API_KEY is missing or if
 * Claude fails to return a valid AuditResult after one retry.
 */
export async function runAudit(input: AuditInput): Promise<AuditResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set — the audit service is unavailable.");
  }

  const client = new Anthropic();
  const userContent = buildUserContent(input);

  const request: Anthropic.MessageCreateParamsNonStreaming = {
    model: AGENT_MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    tools: [AUDIT_TOOL],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [{ role: "user", content: userContent }],
  };

  // First attempt + a single retry on invalid/missing structured output.
  for (let attempt = 0; attempt < 2; attempt++) {
    const message = await client.messages.create(request);
    const toolInput = extractToolInput(message);
    if (isAuditResult(toolInput)) {
      return {
        score: Math.round(toolInput.score),
        summary: toolInput.summary,
        findings: toolInput.findings.slice(0, 6),
      };
    }
  }

  throw new Error("The audit model did not return a valid result. Please try again.");
}
