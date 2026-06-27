// Read-only GitHub helpers used by the codebase-audit agents. We read the
// repository over the GitHub REST API (tree + contents) rather than cloning, so
// this works inside a serverless route. Auth is the user's OAuth token from
// Account.accessToken — never log it.

const GH = "https://api.github.com";

function ghHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/** Source files worth showing the discovery agent. Skip vendored / non-UI noise. */
const SKIP_DIR =
  /(^|\/)(node_modules|\.next|\.git|dist|build|out|coverage|vendor|public|\.turbo|__pycache__|target)\//;
const CODE_EXT =
  /\.(tsx?|jsx?|mjs|cjs|vue|svelte|astro|html?|mdx?|css|scss)$/i;

// Names that hint at a conversion surface — these float to the top of the tree
// we hand the agent (and survive truncation on large repos).
const HINT =
  /(landing|pricing|paywall|onboard|signup|sign-up|register|checkout|plans?|billing|subscribe|subscription|hero|home|welcome|upgrade|trial|marketing|cta|index|\bpage\.|\bapp\/page|\broutes?\/)/i;

export type RepoTree = {
  /** Filtered, hint-prioritized list of source-file paths. */
  paths: string[];
  /** True if GitHub truncated the tree or we capped it. */
  truncated: boolean;
};

/** Fetch the repo's file tree (recursive), filtered to relevant source files. */
export async function getRepoTree(
  token: string,
  fullName: string,
  branch: string,
  cap = 400,
): Promise<RepoTree> {
  const res = await fetch(
    `${GH}/repos/${fullName}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    { headers: ghHeaders(token), cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error(`GitHub tree fetch failed (${res.status})`);
  }
  const data = (await res.json()) as {
    tree: { path: string; type: string }[];
    truncated: boolean;
  };

  const files = data.tree
    .filter((t) => t.type === "blob")
    .map((t) => t.path)
    .filter((p) => !SKIP_DIR.test(p) && CODE_EXT.test(p));

  // Hinted files first so the most relevant survive the cap.
  files.sort((a, b) => {
    const ah = HINT.test(a) ? 0 : 1;
    const bh = HINT.test(b) ? 0 : 1;
    return ah - bh || a.localeCompare(b);
  });

  return {
    paths: files.slice(0, cap),
    truncated: data.truncated || files.length > cap,
  };
}

const MAX_FILE_CHARS = 18_000;

/** Fetch a single file's text content, truncated to keep prompts bounded. */
export async function getFileContent(
  token: string,
  fullName: string,
  path: string,
  ref: string,
): Promise<string> {
  // The contents API takes the path with slashes intact (don't URL-encode them).
  const safePath = path
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  const res = await fetch(
    `${GH}/repos/${fullName}/contents/${safePath}?ref=${encodeURIComponent(ref)}`,
    { headers: ghHeaders(token), cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error(`Could not read ${path} (${res.status})`);
  }
  const data = (await res.json()) as {
    content?: string;
    encoding?: string;
    type?: string;
  };
  if (data.type !== "file" || data.encoding !== "base64" || !data.content) {
    throw new Error(`${path} is not a readable file`);
  }
  const text = Buffer.from(data.content, "base64").toString("utf8");
  return text.length > MAX_FILE_CHARS
    ? text.slice(0, MAX_FILE_CHARS) + "\n…[truncated]"
    : text;
}

/** Full file content (untruncated) — for editing before committing. */
export async function getFullFileContent(
  token: string,
  fullName: string,
  path: string,
  ref: string,
): Promise<string> {
  const safePath = path
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  const res = await fetch(
    `${GH}/repos/${fullName}/contents/${safePath}?ref=${encodeURIComponent(ref)}`,
    { headers: ghHeaders(token), cache: "no-store" },
  );
  if (!res.ok) throw new Error(`Could not read ${path} (${res.status})`);
  const data = (await res.json()) as { content?: string; encoding?: string };
  if (data.encoding !== "base64" || !data.content) {
    throw new Error(`${path} is not a readable file`);
  }
  return Buffer.from(data.content, "base64").toString("utf8");
}

/** Whether a pull request has been merged. Reads use the user's OAuth token. */
export async function isPrMerged(
  token: string,
  fullName: string,
  prNumber: number,
): Promise<boolean> {
  const res = await fetch(`${GH}/repos/${fullName}/pulls/${prNumber}`, {
    headers: ghHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { merged?: boolean; merged_at?: string | null };
  return Boolean(data.merged || data.merged_at);
}

/* --- writes (PRs) — use a GitHub App installation token ----------------- */

async function ghPost<T>(
  token: string,
  url: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { ...ghHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & { message?: string };
  if (!res.ok) {
    throw new Error(
      `GitHub ${url.replace(GH, "")} failed (${res.status}): ${data?.message ?? ""}`,
    );
  }
  return data;
}

/**
 * Commit a set of file changes onto a new branch and open a pull request.
 * `files` are full new contents keyed by repo-relative path. Returns the PR.
 */
export async function commitFilesAndOpenPr(
  token: string,
  fullName: string,
  opts: {
    baseBranch: string;
    newBranch: string;
    message: string;
    title: string;
    body: string;
    // `content` is UTF-8 text by default; pass encoding "base64" for binary
    // files (e.g. a committed preview PNG) where `content` is already base64.
    files: { path: string; content: string; encoding?: "utf8" | "base64" }[];
  },
): Promise<{ url: string; number: number; branch: string }> {
  // 1. Resolve the base branch head + its tree.
  const ref = await fetch(
    `${GH}/repos/${fullName}/git/ref/heads/${encodeURIComponent(opts.baseBranch)}`,
    { headers: ghHeaders(token), cache: "no-store" },
  );
  if (!ref.ok) throw new Error(`Base branch not found (${ref.status})`);
  const baseSha = ((await ref.json()) as { object: { sha: string } }).object.sha;
  const baseCommit = (await (
    await fetch(`${GH}/repos/${fullName}/git/commits/${baseSha}`, {
      headers: ghHeaders(token),
      cache: "no-store",
    })
  ).json()) as { tree: { sha: string } };

  // 2. Blob each file, then build a tree on top of the base tree.
  const tree = await Promise.all(
    opts.files.map(async (f) => {
      const content =
        f.encoding === "base64"
          ? f.content
          : Buffer.from(f.content, "utf8").toString("base64");
      const blob = await ghPost<{ sha: string }>(
        token,
        `${GH}/repos/${fullName}/git/blobs`,
        { content, encoding: "base64" },
      );
      return { path: f.path, mode: "100644", type: "blob", sha: blob.sha };
    }),
  );
  const newTree = await ghPost<{ sha: string }>(
    token,
    `${GH}/repos/${fullName}/git/trees`,
    { base_tree: baseCommit.tree.sha, tree },
  );

  // 3. Commit, create the branch ref, open the PR.
  const commit = await ghPost<{ sha: string }>(
    token,
    `${GH}/repos/${fullName}/git/commits`,
    { message: opts.message, tree: newTree.sha, parents: [baseSha] },
  );
  await ghPost(token, `${GH}/repos/${fullName}/git/refs`, {
    ref: `refs/heads/${opts.newBranch}`,
    sha: commit.sha,
  });
  const pr = await ghPost<{ html_url: string; number: number }>(
    token,
    `${GH}/repos/${fullName}/pulls`,
    { title: opts.title, body: opts.body, head: opts.newBranch, base: opts.baseBranch },
  );

  return { url: pr.html_url, number: pr.number, branch: opts.newBranch };
}
