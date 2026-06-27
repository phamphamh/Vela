// GitHub App auth — mints short-lived installation tokens for repo WRITES (PRs).
// Reads use the user's OAuth token (lib/github.ts); writes go through the App so
// commits are attributed to the app, not the user (per CLAUDE.md).
//
// We derive the App id + installation id from the user's installations list (the
// same call the repo picker makes), so GITHUB_APP_ID need not be set — only the
// private key (GITHUB_APP_PRIVATE_KEY_PATH, default ./leadhackathonyc.private-key.pem).

import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

import { env } from "@/lib/env";

const GH = "https://api.github.com";

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * The App private key. Prefer the inline env var GITHUB_APP_PRIVATE_KEY (so the
 * key can live in the server's environment — no file to ship on a VPS / in a
 * container); `\n`-escaped one-line values are supported. Fall back to reading
 * the PEM file at GITHUB_APP_PRIVATE_KEY_PATH (the local-dev default).
 */
function readPrivateKey(): string {
  const inline = env.GITHUB_APP_PRIVATE_KEY;
  if (inline && inline.trim()) {
    return inline.includes("\\n") ? inline.replace(/\\n/g, "\n") : inline;
  }
  return readFileSync(env.GITHUB_APP_PRIVATE_KEY_PATH, "utf8");
}

/** Build a 10-minute App JWT signed with the App private key (RS256). */
function appJwt(appId: number): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId }),
  );
  const sig = b64url(
    createSign("RSA-SHA256").update(`${header}.${payload}`).sign(readPrivateKey()),
  );
  return `${header}.${payload}.${sig}`;
}

type Installation = { id: number; app_id: number; app_slug: string };

/**
 * Mint an installation access token (repo write scope) for the App installation
 * the given user can access. `userToken` is the user's GitHub OAuth token, used
 * only to resolve which installation to use.
 */
export async function getInstallationToken(userToken: string): Promise<string> {
  const instRes = await fetch(`${GH}/user/installations?per_page=100`, {
    headers: {
      Authorization: `Bearer ${userToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (!instRes.ok) {
    throw new Error(`Could not list GitHub App installations (${instRes.status})`);
  }
  const { installations } = (await instRes.json()) as {
    installations: Installation[];
  };
  const inst =
    installations?.find((i) => i.app_slug === env.GITHUB_APP_SLUG) ??
    installations?.[0];
  if (!inst) {
    throw new Error("The Vela GitHub App is not installed on this account.");
  }

  const jwt = appJwt(inst.app_id);
  const tokRes = await fetch(
    `${GH}/app/installations/${inst.id}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  const data = (await tokRes.json()) as { token?: string; message?: string };
  if (!tokRes.ok || !data.token) {
    throw new Error(
      `Could not mint installation token: ${data.message ?? tokRes.status}`,
    );
  }
  return data.token;
}
