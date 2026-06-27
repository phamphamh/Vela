// Experiment-launch agent. Once tracking is set up, this reads the customer's
// repo, picks ONE high-leverage copy change on a conversion surface, and writes
// it as a real A/B test: both variants live in the code behind our SDK flag, and
// it opens a reviewable PR. Merging + deploying ships the code; the SDK only
// serves the experiment once we mark it RUNNING (see /api/experiments/active).
//
// Delivery model (matches docs/product.md "PR + our SDK"):
//   - The control copy stays the visible default (correct with JS disabled and
//     for the control cohort — no flash for them).
//   - The agent tags the element with `data-lead-exp="<id>"` and encodes the
//     treatment copy in `data-lead-b="…"`. Our SDK buckets each visitor, swaps in
//     the treatment for the B cohort, emits EXPOSURE, and attributes conversions.
//
// Writes go through the GitHub App installation token (lib/github-app.ts); reads
// use the user's OAuth token. Never log either token.

import Anthropic from "@anthropic-ai/sdk";

import {
  commitFilesAndOpenPr,
  getFileContent,
  getFullFileContent,
  getRepoTree,
} from "@/lib/github";
import { getInstallationToken } from "@/lib/github-app";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { renderExperimentPreviewPng } from "@/lib/preview-png";
import { SURFACE_LABELS, type SurfaceKey } from "@/lib/agents/types";
import { type Surface } from "@/lib/generated/prisma/client";

const MODEL = "claude-opus-4-8";
const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

/** Token the agent writes into edit.replace; we swap it for the real id. */
const ID_TOKEN = "LEAD_EXPERIMENT_ID";

export type LaunchEvent =
  | { type: "status"; label: string; detail?: string; progress: number }
  | {
      type: "proposal";
      surface: SurfaceKey;
      title: string;
      hypothesis: string;
      control: string;
      treatment: string;
      expectedLift: string;
    }
  | { type: "edit"; path: string; description: string }
  | {
      type: "done";
      experimentId: string;
      prUrl: string;
      prNumber: number;
      branch: string;
      title: string;
      surface: SurfaceKey;
      control: string;
      treatment: string;
      split: number;
    }
  | { type: "error"; message: string };

type Hint = { surface?: SurfaceKey; title?: string; rationale?: string } | null;

type RunArgs = {
  userToken: string;
  projectId: string;
  repoFullName: string;
  branch: string;
  repoPrivate: boolean;
  hint: Hint;
  onEvent: (e: LaunchEvent) => void;
};

type Edit = { path: string; find: string; replace: string; description: string };
type Proposal = {
  surface: SurfaceKey;
  title: string;
  hypothesis: string;
  expectedLift: string;
  control: string;
  treatment: string;
  edit: Edit;
};

const SURFACE_ENUM: Record<SurfaceKey, Surface> = {
  landing: "LANDING",
  onboarding: "ONBOARDING",
  paywall: "PAYWALL",
};

const READ_FILE_TOOL: Anthropic.Tool = {
  name: "read_file",
  description:
    "Read the full text of one source file. Use this to find the exact element to A/B test and to copy its surrounding code verbatim before proposing the edit.",
  input_schema: {
    type: "object",
    properties: { path: { type: "string" } },
    required: ["path"],
  },
};

const SUBMIT_TOOL: Anthropic.Tool = {
  name: "submit_experiment",
  description:
    "Submit the single A/B test to launch: which surface, the hypothesis, and the exact code edit that adds the variant. Call exactly once when done exploring.",
  input_schema: {
    type: "object",
    properties: {
      surface: { type: "string", enum: ["landing", "onboarding", "paywall"] },
      title: {
        type: "string",
        description: "Short experiment name, e.g. 'Outcome-led hero headline'.",
      },
      hypothesis: {
        type: "string",
        description:
          "One sentence: the change and why it should lift conversion (e.g. 'Leading with the outcome instead of the feature increases signups').",
      },
      expectedLift: {
        type: "string",
        description: "Rough estimated uplift range, e.g. '+5–9%'.",
      },
      control: {
        type: "string",
        description: "The CURRENT copy/text the element renders today (variant A).",
      },
      treatment: {
        type: "string",
        description: "The NEW copy the treatment cohort should see (variant B).",
      },
      edit: {
        type: "object",
        description:
          "The minimal edit that installs the test. `find` is an exact, unique substring of the file containing the element. `replace` is that same substring UNCHANGED except that the element's opening tag gains two attributes: data-lead-exp=\"" +
          ID_TOKEN +
          "\" and data-lead-b=\"<the treatment copy>\". Keep the element's visible/control text exactly as it is — do NOT change the rendered control copy.",
        properties: {
          path: { type: "string" },
          find: { type: "string" },
          replace: { type: "string" },
          description: {
            type: "string",
            description: "e.g. 'hero headline', 'primary CTA label'.",
          },
        },
        required: ["path", "find", "replace", "description"],
      },
    },
    required: [
      "surface",
      "title",
      "hypothesis",
      "expectedLift",
      "control",
      "treatment",
      "edit",
    ],
  },
};

function system(hint: Hint): string {
  const steer = hint?.surface
    ? `\n\nThe audit flagged the ${SURFACE_LABELS[hint.surface]} surface${
        hint.title ? ` — specifically: "${hint.title}"${hint.rationale ? ` (${hint.rationale})` : ""}` : ""
      }. Prefer testing that unless you find something clearly higher-leverage.`
    : "";
  return `You are the experiment-launch agent for Lead, a conversion-rate-optimization platform. You design ONE high-leverage A/B test on a customer's conversion surface (landing / onboarding / paywall) and deliver it as a minimal, safe code edit a human will review as a PR.

Pick a single, high-confidence COPY change — a headline, subheadline, or call-to-action label — on the surface most likely to move conversion. Copy tests are the safest, highest-signal first experiment.

How the test is delivered: the control copy stays exactly as it is in the code (that is variant A, the visible default). You tag the element so our SDK can show the new copy to the treatment cohort:
- Add data-lead-exp="${ID_TOKEN}" to the element's opening tag (we substitute the real id).
- Add data-lead-b="<the treatment copy>" to the same opening tag.
The SDK swaps the element's text to the data-lead-b value for the B cohort, measures both, and attributes conversions.

Hard rules:
- Read files before editing. \`find\` and \`replace\` MUST be exact substrings copied verbatim from a file you read (including whitespace).
- \`replace\` must be identical to \`find\` EXCEPT for the two added attributes. NEVER change the rendered control text — only add attributes.
- Choose an element whose visible content is PLAIN TEXT (no child tags/icons), so a text swap is safe. A headline or a text-only button/link is ideal.
- Keep it to ONE element / one experiment.${steer}

Call submit_experiment exactly once.`;
}

function validate(p: Proposal | undefined): string | null {
  if (!p || typeof p !== "object") return "submit_experiment input was empty.";
  if (!["landing", "onboarding", "paywall"].includes(p.surface as string))
    return "surface must be one of landing | onboarding | paywall.";
  const e = p.edit as Edit | undefined;
  if (!e || typeof e.path !== "string" || !e.path.trim())
    return "edit.path is required (the file you read and want to edit).";
  if (typeof e.find !== "string" || !e.find.trim())
    return "edit.find is required — an exact substring copied verbatim from edit.path.";
  if (typeof e.replace !== "string" || !e.replace.trim())
    return "edit.replace is required.";
  if (e.find === e.replace)
    return "edit.replace must differ from edit.find: add data-lead-exp and data-lead-b to the element's opening tag.";
  if (!e.replace.includes(`data-lead-exp="${ID_TOKEN}"`))
    return `edit.replace must contain data-lead-exp="${ID_TOKEN}" on the element's opening tag.`;
  if (!/data-lead-b\s*=/.test(e.replace))
    return "edit.replace must contain data-lead-b=\"<treatment copy>\" on the element's opening tag.";
  if (typeof p.treatment !== "string" || !p.treatment.trim())
    return "treatment (the new copy) is required.";
  return null;
}

async function discover(args: RunArgs): Promise<Proposal> {
  const { userToken, repoFullName, branch, hint, onEvent } = args;

  onEvent({ type: "status", label: "Mapping the repository", detail: "Reading the file tree", progress: 8 });
  const tree = await getRepoTree(userToken, repoFullName, branch);
  if (tree.paths.length === 0) throw new Error("No source files found.");

  onEvent({
    type: "status",
    label: "Choosing the highest-leverage test",
    detail: `${tree.paths.length} files`,
    progress: 16,
  });

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Repository: ${repoFullName} (branch ${branch})\n\nSource files:\n\n${tree.paths.join("\n")}\n\nFind the best single copy A/B test. Inspect candidates with read_file, then call submit_experiment.`,
    },
  ];

  let reads = 0;
  let nudged = false;
  for (let turn = 0; turn < 18; turn++) {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 6000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: system(hint),
      tools: [READ_FILE_TOOL, SUBMIT_TOOL],
      tool_choice: nudged ? { type: "tool", name: "submit_experiment" } : { type: "auto" },
      messages,
    });
    messages.push({ role: "assistant", content: resp.content });

    const toolUses = resp.content.filter((b) => b.type === "tool_use");
    if (toolUses.length === 0) {
      if (nudged) throw new Error("The agent could not produce an experiment.");
      nudged = true;
      messages.push({ role: "user", content: "Call submit_experiment now with your chosen test." });
      continue;
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    let submitted: Proposal | null = null;
    for (const block of resp.content) {
      if (block.type !== "tool_use") continue;
      if (block.name === "submit_experiment") {
        const candidate = block.input as Proposal;
        const err = validate(candidate);
        if (err) {
          results.push({ type: "tool_result", tool_use_id: block.id, content: err, is_error: true });
        } else {
          submitted = candidate;
          results.push({ type: "tool_result", tool_use_id: block.id, content: "Experiment recorded." });
        }
      } else if (block.name === "read_file") {
        const path = String((block.input as { path?: string }).path ?? "");
        reads++;
        onEvent({
          type: "status",
          label: "Reading the codebase",
          detail: path,
          progress: Math.min(45, 18 + reads * 3),
        });
        try {
          const text = await getFileContent(userToken, repoFullName, path, branch);
          results.push({ type: "tool_result", tool_use_id: block.id, content: `// ${path}\n${text}` });
        } catch (e) {
          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: e instanceof Error ? e.message : "Read failed.",
            is_error: true,
          });
        }
      }
    }
    if (submitted) return submitted;
    messages.push({ role: "user", content: results });
  }
  throw new Error("The agent did not finish planning.");
}

/** Build the PR body — a human-readable preview + a clear "merge = live" note. */
function prBody(p: Proposal, split: number, base: string, imageUrl: string): string {
  return [
    `## Launch A/B test: ${p.title}`,
    ``,
    `**Surface:** ${SURFACE_LABELS[p.surface]} · **Split:** ${100 - split}% control / ${split}% treatment`,
    ``,
    `**Hypothesis.** ${p.hypothesis}`,
    ``,
    `### Preview — what visitors will see`,
    ``,
    `![Before / after preview of the ${SURFACE_LABELS[p.surface]} change](${imageUrl})`,
    ``,
    `| | Copy |`,
    `| --- | --- |`,
    `| **A · Control** (${100 - split}%) | ${p.control.replace(/\|/g, "\\|")} |`,
    `| **B · Treatment** (${split}%) | ${p.treatment.replace(/\|/g, "\\|")} |`,
    ``,
    `The control copy is unchanged — it stays the visible default. The treatment`,
    `copy is delivered to the B cohort by the Lead SDK (already installed) via the`,
    `\`data-lead-b\` attribute on \`${p.edit.path}\`. The diff is exactly that: two`,
    `attributes added to one element.`,
    ``,
    `### ⚠️ Merging this PR launches the experiment live`,
    `Once you **merge and deploy**, the Lead SDK starts splitting traffic ${100 - split}/${split}`,
    `and measuring conversions per variant. Until then nothing changes for visitors.`,
    `You can watch results and pick a winner in your Lead dashboard, and stop the`,
    `test at any time from there (no redeploy needed — it's flag-gated).`,
    ``,
    `> SDK endpoint: \`${base}/api/experiments/active\``,
    ``,
    `🤖 Generated by the Lead experiment agent.`,
  ].join("\n");
}

export async function runLaunch(args: RunArgs): Promise<void> {
  const { userToken, projectId, repoFullName, branch, onEvent } = args;
  const base = env.BETTER_AUTH_URL;
  const SPLIT = 50;

  const proposal = await discover(args);
  onEvent({
    type: "proposal",
    surface: proposal.surface,
    title: proposal.title,
    hypothesis: proposal.hypothesis,
    control: proposal.control,
    treatment: proposal.treatment,
    expectedLift: proposal.expectedLift,
  });
  onEvent({ type: "status", label: "Drafting the variant", detail: proposal.edit.path, progress: 55 });

  // 1. Create the experiment + variants first so we have real ids to embed.
  const experiment = await db.experiment.create({
    data: {
      projectId,
      surface: SURFACE_ENUM[proposal.surface],
      status: "DRAFT",
      title: proposal.title,
      hypothesis: proposal.hypothesis,
      split: SPLIT,
      targetPath: proposal.edit.path,
      variants: {
        create: [
          { kind: "CONTROL", label: "A · Control", content: proposal.control, weight: 100 - SPLIT },
          { kind: "TREATMENT", label: "B · Treatment", content: proposal.treatment, weight: SPLIT },
        ],
      },
    },
    include: { variants: true },
  });

  try {
    // 2. Apply the edit, substituting the real experiment id for the token.
    const replace = proposal.edit.replace.replaceAll(ID_TOKEN, experiment.id);
    const original = await getFullFileContent(userToken, repoFullName, proposal.edit.path, branch);
    if (!original.includes(proposal.edit.find)) {
      throw new Error(`Couldn't place the variant in ${proposal.edit.path} (anchor not found).`);
    }
    const edited = original.replace(proposal.edit.find, replace);
    onEvent({ type: "edit", path: proposal.edit.path, description: `${proposal.edit.description} → A/B variant` });

    // 3. Render the Before/After preview image. For public repos we commit it
    //    into the branch and embed it via raw.githubusercontent.com — this
    //    renders in the PR with no public Lead deployment for GitHub to proxy.
    //    Private-repo raw URLs need auth GitHub's proxy can't supply, so there
    //    we point at the Lead preview endpoint (works once Lead is deployed).
    const newBranch = `lead/experiment-${experiment.id.slice(0, 8)}`;
    const files: { path: string; content: string; encoding?: "utf8" | "base64" }[] = [
      { path: proposal.edit.path, content: edited },
    ];
    let imageUrl = `${base}/api/experiments/${experiment.id}/preview.svg`;
    try {
      const png = await renderExperimentPreviewPng({
        title: proposal.title,
        surfaceLabel: SURFACE_LABELS[proposal.surface],
        control: proposal.control,
        treatment: proposal.treatment,
        split: SPLIT,
      });
      if (!args.repoPrivate) {
        const previewPath = `.lead/previews/experiment-${experiment.id}.png`;
        files.push({ path: previewPath, content: png.toString("base64"), encoding: "base64" });
        imageUrl = `https://raw.githubusercontent.com/${repoFullName}/${newBranch}/${previewPath}`;
      }
    } catch (e) {
      console.warn("[launch] preview render failed; falling back to Lead URL", e);
    }

    // 4. Commit + open the PR via the GitHub App installation token.
    onEvent({ type: "status", label: "Opening pull request", progress: 82 });
    const installationToken = await getInstallationToken(userToken);
    const pr = await commitFilesAndOpenPr(installationToken, repoFullName, {
      baseBranch: branch,
      newBranch,
      message: `Launch A/B test: ${proposal.title}`,
      title: `Launch A/B test: ${proposal.title}`,
      body: prBody(proposal, SPLIT, base, imageUrl),
      files,
    });

    // 5. PR is open → the experiment is QUEUED (approved, awaiting deploy/merge).
    await db.experiment.update({
      where: { id: experiment.id },
      data: { status: "QUEUED", prNumber: pr.number, prUrl: pr.url, prBranch: pr.branch },
    });

    onEvent({ type: "status", label: "Done", progress: 100 });
    onEvent({
      type: "done",
      experimentId: experiment.id,
      prUrl: pr.url,
      prNumber: pr.number,
      branch: pr.branch,
      title: proposal.title,
      surface: proposal.surface,
      control: proposal.control,
      treatment: proposal.treatment,
      split: SPLIT,
    });
  } catch (e) {
    // Roll back the draft so a failed PR doesn't leave an orphan experiment.
    await db.experiment.delete({ where: { id: experiment.id } }).catch(() => {});
    throw e;
  }
}
