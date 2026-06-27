// Server-side landing-page fetcher for the free audit.
//
// Security-critical: this runs an HTTP request to an arbitrary, user-supplied
// URL. It is the SSRF boundary for the whole product. Every request is:
//   - http/https only
//   - blocked against loopback / private / link-local / .local hosts
//   - re-validated on every redirect hop (DNS-rebinding & redirect bypass)
//   - bounded by an 8s timeout and a ~1.5MB body cap
//
// Returns a discriminated result so callers never have to catch.

import { lookup } from "node:dns/promises";

/** Hard caps. */
const TIMEOUT_MS = 8_000;
const MAX_BYTES = 1_500_000; // ~1.5MB
const MAX_REDIRECTS = 5;
const USER_AGENT = "lead-audit-bot/1.0 (+https://lead.dev)";

export type FetchResult =
  | { ok: true; html: string; finalUrl: string }
  | { ok: false; error: string };

/** True for IPv4/IPv6 literals we must never request (SSRF ranges). */
function isBlockedIp(ip: string): boolean {
  const addr = ip.toLowerCase().replace(/^\[|\]$/g, "");

  // IPv6
  if (addr.includes(":")) {
    if (addr === "::1" || addr === "::") return true; // loopback / unspecified
    if (addr.startsWith("fe80")) return true; // link-local
    if (addr.startsWith("fc") || addr.startsWith("fd")) return true; // unique-local fc00::/7
    // IPv4-mapped IPv6 (::ffff:a.b.c.d) — re-check the embedded v4.
    const mapped = addr.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    if (mapped) return isBlockedIp(mapped[1]);
    return false;
  }

  // IPv4
  const parts = addr.split(".");
  if (parts.length !== 4) return false;
  const oct = parts.map((p) => Number(p));
  if (oct.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = oct;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  return false;
}

/** Reject obviously-internal hostnames before any network call. */
function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (host === "localhost") return true;
  if (host.endsWith(".localhost")) return true;
  if (host.endsWith(".local")) return true;
  if (host.endsWith(".internal")) return true;
  return false;
}

/**
 * Parse + validate a single URL hop. Resolves DNS and checks the resolved
 * address against the blocklist (defends against DNS rebinding / redirects to
 * internal hosts). Returns the parsed URL or an error string.
 */
async function validateHop(raw: string): Promise<{ url: URL } | { error: string }> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { error: "That doesn't look like a valid URL." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { error: "Only http and https URLs can be audited." };
  }

  const hostname = url.hostname;
  if (isBlockedHostname(hostname)) {
    return { error: "That host can't be audited." };
  }

  // If the host is already an IP literal, check it directly.
  const bareIp = hostname.replace(/^\[|\]$/g, "");
  if (/^[0-9.]+$/.test(bareIp) || bareIp.includes(":")) {
    if (isBlockedIp(bareIp)) return { error: "That host can't be audited." };
    return { url };
  }

  // Otherwise resolve and check every address it points at.
  try {
    const records = await lookup(hostname, { all: true });
    if (records.length === 0) return { error: "Couldn't resolve that host." };
    for (const r of records) {
      if (isBlockedIp(r.address)) return { error: "That host can't be audited." };
    }
  } catch {
    return { error: "Couldn't resolve that host." };
  }

  return { url };
}

/** Read a response body, decoding as text but never exceeding MAX_BYTES. */
async function readCappedBody(res: Response): Promise<string> {
  const body = res.body;
  if (!body) return "";
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let total = 0;
  let out = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      const slice =
        total > MAX_BYTES
          ? value.subarray(0, value.byteLength - (total - MAX_BYTES))
          : value;
      out += decoder.decode(slice, { stream: true });
      if (total >= MAX_BYTES) break;
    }
  } finally {
    out += decoder.decode();
    try {
      await reader.cancel();
    } catch {
      /* ignore */
    }
  }
  return out;
}

/**
 * Fetch a landing page's HTML with full SSRF protection, a timeout, and a body
 * cap. Redirects are followed manually so each hop is re-validated.
 */
export async function fetchLanding(rawUrl: string): Promise<FetchResult> {
  const input = typeof rawUrl === "string" ? rawUrl.trim() : "";
  if (!input) return { ok: false, error: "Enter a URL to audit." };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let current = input;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const validated = await validateHop(current);
      if ("error" in validated) return { ok: false, error: validated.error };
      const url = validated.url;

      let res: Response;
      try {
        res = await fetch(url, {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return { ok: false, error: "That page took too long to respond." };
        }
        return { ok: false, error: "Couldn't reach that page." };
      }

      // Manual redirect handling — re-validate the next hop.
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return { ok: false, error: "Couldn't reach that page." };
        if (hop === MAX_REDIRECTS) {
          return { ok: false, error: "That page redirected too many times." };
        }
        current = new URL(location, url).toString();
        continue;
      }

      if (!res.ok) {
        return { ok: false, error: `That page returned an error (${res.status}).` };
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (contentType && !/text\/html|application\/xhtml|text\/plain|application\/xml/i.test(contentType)) {
        return { ok: false, error: "That URL isn't an HTML page." };
      }

      const html = await readCappedBody(res);
      return { ok: true, html, finalUrl: url.toString() };
    }

    return { ok: false, error: "That page redirected too many times." };
  } finally {
    clearTimeout(timer);
  }
}
