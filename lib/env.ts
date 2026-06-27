// Single, typed entry point for environment variables. Read env through this
// module rather than scattering `process.env.*` across the codebase.
//
// These are all SERVER-ONLY values (no NEXT_PUBLIC_ prefix) — never import this
// into a client component. Values default to empty strings so a production build
// doesn't crash when secrets are absent; runtime code asserts what it needs (e.g.
// lib/db.ts throws if DATABASE_URL is empty, Better Auth fails the OAuth call).

function read(key: string): string {
  return process.env[key] ?? "";
}

export const env = {
  DATABASE_URL: read("DATABASE_URL"),
  // Anthropic API key for the Claude Agent SDK / audit agents (lib/agents/*).
  ANTHROPIC_API_KEY: read("ANTHROPIC_API_KEY"),
  BETTER_AUTH_SECRET: read("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: read("BETTER_AUTH_URL") || "http://localhost:3000",
  // GitHub App credentials. Client ID/secret drive "Sign in with GitHub" (the
  // user-to-server OAuth flow). App ID + private key are for installation tokens
  // (opening PRs — future track). Slug builds the "install the app" URL.
  GITHUB_CLIENT_ID: read("GITHUB_CLIENT_ID"),
  GITHUB_CLIENT_SECRET: read("GITHUB_CLIENT_SECRET"),
  GITHUB_APP_ID: read("GITHUB_APP_ID"),
  GITHUB_APP_SLUG: read("GITHUB_APP_SLUG") || "leadhackathonyc",
  GITHUB_APP_PRIVATE_KEY_PATH:
    read("GITHUB_APP_PRIVATE_KEY_PATH") || "./leadhackathonyc.private-key.pem",
} as const;

/** Throw if a required env var is missing — call at runtime where it matters. */
export function requireEnv<K extends keyof typeof env>(key: K): string {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
