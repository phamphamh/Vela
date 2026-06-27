// Standalone debug harness for the codebase-audit agents — bypasses auth/DB/UI.
//
//   GITHUB_TOKEN=$(gh auth token) bun run scripts/audit-debug.ts owner/repo [branch]
//
// Reads ANTHROPIC_API_KEY from .env (Bun auto-loads it). GITHUB_TOKEN can be a
// PAT or `gh auth token` — it only needs read access to the repo's contents.

import { getRepoTree } from "@/lib/github";
import { runAudit } from "@/lib/agents/audit";

async function main() {
  const [repoFullName, branch = "main"] = process.argv.slice(2);
  const token = process.env.GITHUB_TOKEN;

  if (!repoFullName || !token) {
    console.error(
      "Usage: GITHUB_TOKEN=... bun run scripts/audit-debug.ts owner/repo [branch]",
    );
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY (expected in .env).");
    process.exit(1);
  }

  // Sanity-check the GitHub side first so we know reads work.
  const tree = await getRepoTree(token, repoFullName, branch);
  console.log(
    `\nTree: ${tree.paths.length} source files (truncated=${tree.truncated})\n`,
  );

  const result = await runAudit({
    token,
    repoFullName,
    branch,
    onEvent: (e) => {
      if (e.type === "status") console.log(`  · ${e.label}${e.detail ? ` — ${e.detail}` : ""}`);
      else if (e.type === "surfaces")
        console.log(`  surfaces: ${e.surfaces.map((s) => s.name).join(", ") || "(none)"}`);
      else if (e.type === "surface_done")
        console.log(`  ✓ ${e.audit.name}: ${e.audit.score}/100, ${e.audit.advice.length} ideas`);
      else if (e.type === "error") console.error(`  ✗ ${e.message}`);
    },
  });

  console.log("\nFinal result:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
