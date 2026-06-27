// Codebase-audit orchestrator.
//
// Two stages, both on the Claude Agent SDK / Anthropic SDK:
//   1. Discovery agent (Opus 4.8, agentic tool-use loop) — given the repo file
//      tree, it calls `read_file` to inspect candidates and reports which files
//      make up the landing / onboarding / paywall surfaces.
//   2. Analyzer agents (one per detected surface, run in parallel) — each reads
//      its surface's files and returns a structured audit (score, issues, advice).
//
// Progress is streamed back to the caller via the `onEvent` callback so the
// onboarding UI can show real activity. Never log the GitHub token.

import Anthropic from "@anthropic-ai/sdk";

import { getFileContent, getRepoTree } from "@/lib/github";
import { env } from "@/lib/env";
import {
  type AuditEvent,
  type AuditResult,
  type Impact,
  type SurfaceAudit,
  type SurfaceKey,
  SURFACE_LABELS,
} from "@/lib/agents/types";

// Per CLAUDE.md: Opus for the orchestrator/intelligence-sensitive work.
const DISCOVERY_MODEL = "claude-opus-4-8";
const ANALYZER_MODEL = "claude-opus-4-8";

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

type RunArgs = {
  token: string;
  repoFullName: string;
  branch: string;
  onEvent: (event: AuditEvent) => void;
};

/* --- stage 1: discovery ------------------------------------------------ */

type DiscoveredSurface = {
  key: SurfaceKey;
  present: boolean;
  files: string[];
  rationale: string;
};

const READ_FILE_TOOL: Anthropic.Tool = {
  name: "read_file",
  description:
    "Read the full text of one source file from the repository. Use this to confirm what a file actually renders before classifying it as a conversion surface.",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Repository-relative file path, exactly as listed in the tree.",
      },
    },
    required: ["path"],
  },
};

const SUBMIT_FINDINGS_TOOL: Anthropic.Tool = {
  name: "submit_findings",
  description:
    "Report which conversion surfaces exist in the repo and the files that implement each. Call this exactly once when you are done exploring.",
  input_schema: {
    type: "object",
    properties: {
      surfaces: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: {
              type: "string",
              enum: ["landing", "onboarding", "paywall"],
            },
            present: {
              type: "boolean",
              description: "Whether this surface exists in the codebase.",
            },
            files: {
              type: "array",
              items: { type: "string" },
              description: "Repo-relative paths that implement this surface (most important first).",
            },
            rationale: {
              type: "string",
              description: "One sentence on what you found.",
            },
          },
          required: ["key", "present", "files", "rationale"],
        },
      },
    },
    required: ["surfaces"],
  },
};

const DISCOVERY_SYSTEM = `You are the codebase-analysis agent for Lead, a conversion-rate-optimization platform that ships A/B tests into customers' own repos.

Your job: locate the three conversion surfaces in a customer's repository.
- landing — the public marketing/home page a cold visitor first sees (hero, value prop, primary CTA).
- onboarding — the signup / account-setup / first-run flow after a user decides to try the product.
- paywall — pricing, plan selection, checkout, subscription or upgrade surfaces.

You are given a filtered list of source files. Use the read_file tool to inspect the most likely candidates (read at most ~12 files — be selective, prioritize files whose path hints at a surface). Then call submit_findings exactly once.

Guidelines:
- Read a few of the most promising files before concluding — don't judge by filename alone, and don't mark a surface absent without having looked.
- Be inclusive: a marketing home page (e.g. app/page.tsx, pages/index.tsx, src/routes/index) is almost always the landing surface even if its filename has no obvious keyword. A signup/login/account-setup flow counts as onboarding. Any pricing, plans, checkout, billing, or upgrade UI counts as paywall.
- If you're unsure whether a page qualifies, include it with your best-guess classification rather than omitting it.
- Only set present=false for a surface when, after looking, the repo genuinely has nothing resembling it.
- List the files that implement each present surface, most important first.

Call submit_findings exactly once when done.`;

async function runDiscovery(
  args: RunArgs,
): Promise<DiscoveredSurface[]> {
  const { token, repoFullName, branch, onEvent } = args;

  onEvent({ type: "status", label: "Mapping the repository", detail: "Reading the file tree", progress: 6 });
  const tree = await getRepoTree(token, repoFullName, branch);
  if (tree.paths.length === 0) {
    throw new Error("No source files found in this repository.");
  }

  onEvent({
    type: "status",
    label: "Detecting conversion surfaces",
    detail: `${tree.paths.length} source files indexed`,
    progress: 14,
  });

  const treeList = tree.paths.join("\n");
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Repository: ${repoFullName} (branch ${branch})\n\nSource files${tree.truncated ? " (list truncated to the most relevant)" : ""}:\n\n${treeList}\n\nFind the landing, onboarding, and paywall surfaces. Inspect candidates with read_file, then call submit_findings.`,
    },
  ];

  console.log(
    `[audit] ${repoFullName}@${branch}: ${tree.paths.length} files indexed (truncated=${tree.truncated})`,
  );
  console.log(`[audit] sample tree:\n  ${tree.paths.slice(0, 30).join("\n  ")}`);

  const MAX_TURNS = 16;
  let reads = 0;
  let nudged = false;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const resp = await client.messages.create({
      model: DISCOVERY_MODEL,
      max_tokens: 6000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: DISCOVERY_SYSTEM,
      tools: [READ_FILE_TOOL, SUBMIT_FINDINGS_TOOL],
      // Once we've nudged, force the model to actually call submit_findings.
      tool_choice: nudged
        ? { type: "tool", name: "submit_findings" }
        : { type: "auto" },
      messages,
    });

    messages.push({ role: "assistant", content: resp.content });

    const toolUses = resp.content.filter((b) => b.type === "tool_use");
    console.log(
      `[audit] turn ${turn}: stop=${resp.stop_reason} tools=[${toolUses
        .map((b) => (b.type === "tool_use" ? b.name : ""))
        .join(", ")}]`,
    );

    // Model stopped without calling a tool (e.g. answered in prose). Nudge it
    // once to submit, forcing the tool on the next turn.
    if (toolUses.length === 0) {
      if (nudged) {
        console.warn("[audit] model would not submit findings; giving up");
        break;
      }
      nudged = true;
      messages.push({
        role: "user",
        content:
          "Call submit_findings now with your conclusions for landing, onboarding, and paywall (use present=false for any surface you couldn't find).",
      });
      continue;
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    let submitted: DiscoveredSurface[] | null = null;

    for (const block of resp.content) {
      if (block.type !== "tool_use") continue;

      if (block.name === "submit_findings") {
        const input = block.input as { surfaces?: DiscoveredSurface[] };
        submitted = Array.isArray(input?.surfaces) ? input.surfaces : [];
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: "Findings recorded.",
        });
      } else if (block.name === "read_file") {
        const path = String((block.input as { path?: string }).path ?? "");
        reads++;
        onEvent({
          type: "status",
          label: "Auditing the codebase",
          detail: `Reading ${path}`,
          progress: Math.min(44, 16 + reads * 3),
        });
        try {
          const text = await getFileContent(token, repoFullName, path, branch);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `// ${path}\n${text}`,
          });
        } catch (e) {
          console.warn(`[audit] read_file failed: ${path}`, e);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: e instanceof Error ? e.message : "Read failed.",
            is_error: true,
          });
        }
      }
    }

    if (submitted) {
      console.log(
        "[audit] findings:",
        JSON.stringify(
          submitted.map((s) => ({
            key: s.key,
            present: s.present,
            files: s.files,
          })),
        ),
      );
      return submitted;
    }
    messages.push({ role: "user", content: toolResults });
  }

  return [];
}

/* --- stage 2: per-surface analysis ------------------------------------ */

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: {
      type: "integer",
      description: "Conversion-health score from 0 (poor) to 100 (excellent).",
    },
    summary: {
      type: "string",
      description: "One or two sentences on the overall state of this surface.",
    },
    issues: {
      type: "array",
      items: { type: "string" },
      description: "Concrete conversion problems found in the code.",
    },
    advice: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", description: "The change to make." },
          rationale: { type: "string", description: "Why it lifts conversion." },
          impact: { type: "string", enum: ["High", "Medium", "Low"] },
          est: { type: "string", description: "Estimated uplift, e.g. \"+5–9%\"." },
        },
        required: ["title", "rationale", "impact", "est"],
      },
    },
  },
  required: ["score", "summary", "issues", "advice"],
} as const;

type AnalysisOutput = {
  score: number;
  summary: string;
  issues: string[];
  advice: { title: string; rationale: string; impact: Impact; est: string }[];
};

function analysisSystem(key: SurfaceKey): string {
  return `You are a senior conversion-rate-optimization expert reviewing the ${SURFACE_LABELS[key]} surface of a SaaS product, working from its actual source code.

Assess how well this surface converts and propose specific, high-leverage changes a CRO engineer could ship as an A/B test. Ground every issue and recommendation in what the code actually does — reference real copy, components, fields, layout, or flow you can see. Do not invent metrics; "issues" are problems visible in the code, and each "advice" item is a concrete change with a realistic estimated uplift range. Score honestly: a strong surface scores high, a weak one low. Return 2–4 advice items, best first.`;
}

async function analyzeSurface(
  args: RunArgs,
  surface: DiscoveredSurface,
): Promise<SurfaceAudit> {
  const { token, repoFullName, branch } = args;

  // Pull the surface's files (cap count + total size to keep the prompt bounded).
  const files: { path: string; text: string }[] = [];
  let budget = 40_000;
  for (const path of surface.files.slice(0, 8)) {
    if (budget <= 0) break;
    try {
      const text = await getFileContent(token, repoFullName, path, branch);
      const clipped = text.slice(0, budget);
      budget -= clipped.length;
      files.push({ path, text: clipped });
    } catch {
      // Skip unreadable files; the others still give a useful audit.
    }
  }

  const codeBlock =
    files.length > 0
      ? files.map((f) => `=== ${f.path} ===\n${f.text}`).join("\n\n")
      : "(No files could be read for this surface.)";

  const resp = await client.messages.create({
    model: ANALYZER_MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: ANALYSIS_SCHEMA },
    },
    system: analysisSystem(surface.key),
    messages: [
      {
        role: "user",
        content: `Repository: ${repoFullName}\nSurface: ${SURFACE_LABELS[surface.key]}\nFiles:\n\n${codeBlock}`,
      },
    ],
  });

  const text = resp.content.find((b) => b.type === "text");
  const parsed = JSON.parse(
    text && text.type === "text" ? text.text : "{}",
  ) as AnalysisOutput;

  return {
    key: surface.key,
    name: SURFACE_LABELS[surface.key],
    routes: surface.files,
    score: Math.max(0, Math.min(100, Math.round(parsed.score ?? 0))),
    summary: parsed.summary ?? "",
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    advice: Array.isArray(parsed.advice) ? parsed.advice : [],
  };
}

/* --- public entry point ------------------------------------------------ */

export async function runAudit(args: RunArgs): Promise<AuditResult> {
  const { repoFullName, onEvent } = args;

  const discovered = await runDiscovery(args);
  const present = discovered.filter((s) => s.present && s.files.length > 0);

  onEvent({
    type: "surfaces",
    surfaces: present.map((s) => ({ key: s.key, name: SURFACE_LABELS[s.key] })),
  });
  onEvent({
    type: "status",
    label: "Auditing each surface",
    detail: present.length
      ? `${present.length} surface${present.length > 1 ? "s" : ""} detected`
      : "No conversion surfaces detected",
    progress: 50,
  });

  // Analyze every detected surface in parallel; report each as it finishes.
  const total = present.length;
  let done = 0;
  const audits = await Promise.all(
    present.map(async (surface) => {
      const audit = await analyzeSurface(args, surface);
      done++;
      onEvent({ type: "surface_done", audit });
      onEvent({
        type: "status",
        label: "Ranking opportunities",
        detail: `Audited ${audit.name}`,
        progress: 50 + Math.round((done / Math.max(1, total)) * 45),
      });
      return audit;
    }),
  );

  // Stable surface order: landing → onboarding → paywall.
  const order: SurfaceKey[] = ["landing", "onboarding", "paywall"];
  audits.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));

  const result: AuditResult = { repoFullName, surfaces: audits };
  onEvent({ type: "status", label: "Audit complete", progress: 100 });
  onEvent({ type: "done", result });
  return result;
}
