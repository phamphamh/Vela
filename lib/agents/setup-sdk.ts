// SDK-setup agent. Reads the customer's repo, finds (a) where the tracking SDK
// should be injected (global head / root layout) and (b) the conversion actions
// (signup, checkout), then opens a reviewable PR that installs the snippet and
// marks those conversions. Writes go through the GitHub App installation token.

import Anthropic from "@anthropic-ai/sdk";

import {
  commitFilesAndOpenPr,
  getFileContent,
  getFullFileContent,
  getRepoTree,
} from "@/lib/github";
import { getInstallationToken } from "@/lib/github-app";
import { env } from "@/lib/env";

const MODEL = "claude-opus-4-8";
const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export type SetupEvent =
  | { type: "status"; label: string; detail?: string; progress: number }
  | { type: "edit"; path: string; description: string }
  | {
      type: "done";
      prUrl: string;
      prNumber: number;
      branch: string;
      summary: string;
      conversions: string[];
    }
  | { type: "error"; message: string };

type RunArgs = {
  userToken: string;
  repoFullName: string;
  branch: string;
  sdkKey: string;
  onEvent: (e: SetupEvent) => void;
};

type Injection = { path: string; anchor: string; position: "after" | "before" };
type ConversionEdit = {
  path: string;
  find: string;
  replace: string;
  description: string;
};
type Setup = {
  framework: string;
  injection: Injection;
  conversionEdits: ConversionEdit[];
  conversionsFound: string[];
  summary: string;
};

const READ_FILE_TOOL: Anthropic.Tool = {
  name: "read_file",
  description:
    "Read the full text of one source file. Use this to find the global <head>/root layout and the signup/checkout code before proposing edits — copy exact substrings from what you read.",
  input_schema: {
    type: "object",
    properties: { path: { type: "string" } },
    required: ["path"],
  },
};

const SUBMIT_TOOL: Anthropic.Tool = {
  name: "submit_setup",
  description:
    "Submit the plan: where to inject the tracking script and how to mark conversions. Call exactly once when done exploring.",
  input_schema: {
    type: "object",
    properties: {
      framework: {
        type: "string",
        description: "Detected framework, e.g. 'Next.js App Router', 'plain HTML', 'Vite/React'.",
      },
      injection: {
        type: "object",
        description:
          "Where to insert the tracking <script>. Pick the app's GLOBAL head/root layout so it loads on every page (Next App Router: the root app/layout.tsx body; Pages Router: pages/_document; plain HTML: the <head>).",
        properties: {
          path: { type: "string", description: "File to edit." },
          anchor: {
            type: "string",
            description:
              "An exact, unique substring copied verbatim from that file, next to which the script will be inserted (e.g. the opening <body> tag, or '{children}').",
          },
          position: { type: "string", enum: ["after", "before"] },
        },
        required: ["path", "anchor", "position"],
      },
      conversionEdits: {
        type: "array",
        description:
          "Edits that mark conversions. Prefer adding the data-lead-conversion attribute to the primary signup and checkout/subscribe call-to-action elements. `find` must be an exact, unique substring of the file; `replace` is that substring with the attribute added.",
        items: {
          type: "object",
          properties: {
            path: { type: "string" },
            find: { type: "string" },
            replace: { type: "string" },
            description: { type: "string", description: "e.g. 'signup CTA', 'checkout button'." },
          },
          required: ["path", "find", "replace", "description"],
        },
      },
      conversionsFound: {
        type: "array",
        items: { type: "string" },
        description: "Short names of the conversions you wired, e.g. ['signup', 'checkout'].",
      },
      summary: { type: "string", description: "1–2 sentence summary for the PR." },
    },
    required: ["framework", "injection", "conversionEdits", "conversionsFound", "summary"],
  },
};

const SYSTEM = `You are the integration agent for Vela, a conversion-rate-optimization platform. You set up our tracking SDK in a customer's repository by proposing minimal, safe edits that a human will review as a PR.

Do two things:
1. Inject our tracking <script> once, in the app's GLOBAL head / root layout, so it loads on every page. (We supply the exact script tag — you only choose the file + an anchor substring to insert next to.)
2. Mark the product's conversions — at minimum signup and checkout/subscribe. Prefer adding the attribute data-lead-conversion to the primary call-to-action element for each (the button/link a user clicks to sign up or to pay/subscribe). Find those elements in the code.

Rules:
- Read files before editing. Every \`anchor\` and \`find\` MUST be an exact, unique substring copied verbatim from a file you read — including whitespace — or the edit will fail to apply.
- Keep edits minimal and reversible. Don't reformat or change behavior beyond adding the script and the conversion markers.
- If you can't find a real checkout/subscribe flow, still wire signup. List what you wired in conversionsFound.
Call submit_setup exactly once.`;

/** Validate the agent's plan; returns an error message to feed back, or null. */
function validateSetup(s: Setup | undefined): string | null {
  if (!s || typeof s !== "object") return "submit_setup input was empty.";
  const inj = s.injection as Injection | undefined;
  if (!inj || typeof inj.path !== "string" || !inj.path.trim()) {
    return "injection.path is required — the exact repo-relative path of the file to edit (e.g. the file you read that holds the root layout / <head>).";
  }
  if (typeof inj.anchor !== "string" || !inj.anchor.trim()) {
    return "injection.anchor is required — an exact substring copied verbatim from injection.path next to which the script will go.";
  }
  return null;
}

/** Coerce a validated plan into clean, fully-typed shape. */
function normalizeSetup(s: Setup): Setup {
  return {
    framework: typeof s.framework === "string" ? s.framework : "unknown",
    injection: {
      path: s.injection.path,
      anchor: s.injection.anchor,
      position: s.injection.position === "before" ? "before" : "after",
    },
    conversionEdits: Array.isArray(s.conversionEdits)
      ? s.conversionEdits.filter(
          (e) =>
            e &&
            typeof e.path === "string" &&
            typeof e.find === "string" &&
            typeof e.replace === "string",
        )
      : [],
    conversionsFound: Array.isArray(s.conversionsFound)
      ? s.conversionsFound.filter((x): x is string => typeof x === "string")
      : [],
    summary: typeof s.summary === "string" ? s.summary : "",
  };
}

async function discover(args: RunArgs): Promise<Setup> {
  const { userToken, repoFullName, branch, onEvent } = args;

  onEvent({ type: "status", label: "Mapping the repository", detail: "Reading the file tree", progress: 8 });
  const tree = await getRepoTree(userToken, repoFullName, branch);
  if (tree.paths.length === 0) throw new Error("No source files found.");

  onEvent({ type: "status", label: "Finding the install point & conversions", detail: `${tree.paths.length} files`, progress: 16 });

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Repository: ${repoFullName} (branch ${branch})\n\nSource files:\n\n${tree.paths.join("\n")}\n\nFind the global head/root layout to inject our script, and the signup + checkout conversion actions. Inspect with read_file, then call submit_setup.`,
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
      system: SYSTEM,
      tools: [READ_FILE_TOOL, SUBMIT_TOOL],
      tool_choice: nudged ? { type: "tool", name: "submit_setup" } : { type: "auto" },
      messages,
    });
    messages.push({ role: "assistant", content: resp.content });

    const toolUses = resp.content.filter((b) => b.type === "tool_use");
    if (toolUses.length === 0) {
      if (nudged) throw new Error("The agent could not produce a setup plan.");
      nudged = true;
      messages.push({ role: "user", content: "Call submit_setup now with your plan." });
      continue;
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    let submitted: Setup | null = null;
    for (const block of resp.content) {
      if (block.type !== "tool_use") continue;
      if (block.name === "submit_setup") {
        const candidate = block.input as Setup;
        const err = validateSetup(candidate);
        if (err) {
          // Tool inputs aren't strictly enforced — if the model omitted a
          // required field, feed the error back so it resubmits correctly.
          results.push({ type: "tool_result", tool_use_id: block.id, content: err, is_error: true });
        } else {
          submitted = candidate;
          results.push({ type: "tool_result", tool_use_id: block.id, content: "Plan recorded." });
        }
      } else if (block.name === "read_file") {
        const path = String((block.input as { path?: string }).path ?? "");
        reads++;
        onEvent({ type: "status", label: "Reading the codebase", detail: path, progress: Math.min(45, 18 + reads * 3) });
        try {
          const text = await getFileContent(userToken, repoFullName, path, branch);
          results.push({ type: "tool_result", tool_use_id: block.id, content: `// ${path}\n${text}` });
        } catch (e) {
          results.push({ type: "tool_result", tool_use_id: block.id, content: e instanceof Error ? e.message : "Read failed.", is_error: true });
        }
      }
    }
    if (submitted) return normalizeSetup(submitted);
    messages.push({ role: "user", content: results });
  }
  throw new Error("The agent did not finish planning.");
}

/** Insert `snippet` next to `anchor`, preserving the anchor line's indentation. */
function insertAt(content: string, anchor: string, position: "after" | "before", snippet: string): string | null {
  const idx = content.indexOf(anchor);
  if (idx === -1) return null;
  const lineStart = content.lastIndexOf("\n", idx) + 1;
  const indent = content.slice(lineStart, idx).match(/^\s*/)?.[0] ?? "";
  const insert =
    position === "after"
      ? `${anchor}\n${indent}${snippet}`
      : `${snippet}\n${indent}${anchor}`;
  return content.slice(0, idx) + insert + content.slice(idx + anchor.length);
}

export async function runSdkSetup(args: RunArgs): Promise<void> {
  const { userToken, repoFullName, branch, sdkKey, onEvent } = args;
  const base = env.BETTER_AUTH_URL;

  const setup = await discover(args);
  onEvent({ type: "status", label: "Applying changes", detail: setup.framework, progress: 55 });

  // Working copy of each touched file, fetched fresh and edited in memory.
  const working = new Map<string, string>();
  const load = async (path: string) => {
    if (!working.has(path)) {
      working.set(path, await getFullFileContent(userToken, repoFullName, path, branch));
    }
    return working.get(path)!;
  };

  // 1. Inject the script (JSX self-closing for .tsx/.jsx, HTML tag otherwise).
  const isJsx = /\.(tsx|jsx)$/.test(setup.injection.path);
  const snippet = isJsx
    ? `<script src="${base}/sdk.js" data-key="${sdkKey}" defer />`
    : `<script src="${base}/sdk.js" data-key="${sdkKey}" defer></script>`;
  const injContent = await load(setup.injection.path);
  const injected = insertAt(injContent, setup.injection.anchor, setup.injection.position, snippet);
  if (!injected) {
    throw new Error(`Couldn't place the tracking script in ${setup.injection.path} (anchor not found).`);
  }
  working.set(setup.injection.path, injected);
  onEvent({ type: "edit", path: setup.injection.path, description: "Installed tracking script" });

  // 2. Apply conversion edits (best-effort; skip any whose anchor drifted).
  const appliedConversions: string[] = [];
  for (const edit of setup.conversionEdits) {
    try {
      const content = await load(edit.path);
      if (!content.includes(edit.find)) continue;
      working.set(edit.path, content.replace(edit.find, edit.replace));
      appliedConversions.push(edit.description);
      onEvent({ type: "edit", path: edit.path, description: edit.description });
    } catch {
      // unreadable file — skip
    }
  }

  // 3. Commit + open the PR via the GitHub App installation token.
  onEvent({ type: "status", label: "Opening pull request", progress: 85 });
  const installationToken = await getInstallationToken(userToken, repoFullName);
  const files = [...working.entries()].map(([path, content]) => ({ path, content }));
  const newBranch = `vela/setup-tracking-${Date.now().toString(36)}`;

  const body = [
    `## Set up Vela conversion tracking`,
    ``,
    setup.summary,
    ``,
    `### What changed`,
    `- Installed the tracking SDK in \`${setup.injection.path}\` (loads on every page).`,
    ...appliedConversions.map((c) => `- Marked conversion: ${c}.`),
    ``,
    `### Conversions wired`,
    (setup.conversionsFound.length ? setup.conversionsFound : ["signup"]).map((c) => `\`${c}\``).join(", "),
    ``,
    `> The script points at \`${base}/sdk.js\` — update this to your deployed Vela URL before merging if it isn't already public.`,
    `> Tracking is review-gated: nothing ships until you merge this PR.`,
    ``,
    `🤖 Generated by the Vela setup agent.`,
  ].join("\n");

  const pr = await commitFilesAndOpenPr(installationToken, repoFullName, {
    baseBranch: branch,
    newBranch,
    message: "Set up Vela conversion tracking",
    title: "Set up Vela conversion tracking",
    body,
    files,
  });

  onEvent({ type: "status", label: "Done", progress: 100 });
  onEvent({
    type: "done",
    prUrl: pr.url,
    prNumber: pr.number,
    branch: pr.branch,
    summary: setup.summary,
    conversions: setup.conversionsFound,
  });
}
