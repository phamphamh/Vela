// Lightweight HTML content extraction for the audit. Deliberately regex/string
// based — no heavy DOM parser — so it stays cheap and dependency-free on the
// server. Goal: pull the conversion-relevant surface (title, meta description,
// headings, CTA text, first paragraphs) into a compact shape we can hand to
// Claude.

export interface ExtractedContent {
  title: string;
  description: string;
  headings: string[];
  ctas: string[];
  paragraphs: string[];
  /** Approx. count of visible characters — used to detect empty SPA shells. */
  textLength: number;
}

const MAX_HEADINGS = 30;
const MAX_CTAS = 30;
const MAX_PARAGRAPHS = 12;
const MAX_FIELD_CHARS = 400;

/** Strip <script>/<style>/<noscript>/<template> blocks and HTML comments. */
function stripNonContent(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<template\b[\s\S]*?<\/template>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ");
}

/** Decode the handful of HTML entities that actually matter for readability. */
function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&hellip;/gi, "…")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    });
}

/** Remove all tags, collapse whitespace, decode entities, trim, clamp. */
function clean(text: string): string {
  const out = decodeEntities(text.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
  return out.length > MAX_FIELD_CHARS ? out.slice(0, MAX_FIELD_CHARS).trim() + "…" : out;
}

/** Collect all capture-group-1 matches for a global regex against `src`. */
function collectMatches(src: string, re: RegExp): string[] {
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    results.push(m[1] ?? "");
    if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-width
  }
  return results;
}

/** De-duplicate (case-insensitively), drop empties/very short, and cap count. */
function dedupe(items: string[], limit: number, minLen = 1): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const value = raw.trim();
    if (value.length < minLen) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= limit) break;
  }
  return out;
}

export function extractContent(html: string): ExtractedContent {
  const raw = typeof html === "string" ? html : "";
  const content = stripNonContent(raw);

  // <title>
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(raw);
  const title = titleMatch ? clean(titleMatch[1]) : "";

  // meta description (name="description" or property="og:description")
  let description = "";
  const metaTags = collectMatches(raw, /<meta\b[^>]*>/gi);
  for (const tag of metaTags) {
    if (/\b(name|property)\s*=\s*["']?(description|og:description)["']?/i.test(tag)) {
      const contentAttr = /\bcontent\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
      if (contentAttr) {
        description = clean(contentAttr[2] ?? contentAttr[3] ?? contentAttr[4] ?? "");
        if (description) break;
      }
    }
  }

  // Headings h1/h2/h3
  const headings = dedupe(
    collectMatches(content, /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi).map(clean),
    MAX_HEADINGS,
    1,
  );

  // CTAs: <button> text, <a> text, and value/aria-label of input[type=submit]/button
  const anchorText = collectMatches(content, /<a\b[^>]*>([\s\S]*?)<\/a>/gi).map(clean);
  const buttonText = collectMatches(content, /<button\b[^>]*>([\s\S]*?)<\/button>/gi).map(clean);
  const submitValues: string[] = [];
  for (const tag of collectMatches(raw, /<input\b[^>]*>/gi)) {
    if (/\btype\s*=\s*["']?(submit|button)["']?/i.test(tag)) {
      const val = /\bvalue\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
      if (val) submitValues.push(clean(val[2] ?? val[3] ?? val[4] ?? ""));
    }
  }
  const ctas = dedupe([...buttonText, ...submitValues, ...anchorText], MAX_CTAS, 2);

  // First several paragraphs
  const paragraphs = dedupe(
    collectMatches(content, /<p\b[^>]*>([\s\S]*?)<\/p>/gi).map(clean),
    MAX_PARAGRAPHS,
    2,
  );

  // Total visible text length (best-effort), used by isThin().
  const visibleText = clean(content);
  const textLength = visibleText.length;

  return { title, description, headings, ctas, paragraphs, textLength };
}

/**
 * True when there's almost no visible content — typically an empty SPA shell
 * whose body is rendered client-side. In that case the caller should ask the
 * user to paste their copy instead of auditing an empty page.
 */
export function isThin(extracted: ExtractedContent): boolean {
  const headingChars = extracted.headings.join(" ").length;
  const paragraphChars = extracted.paragraphs.join(" ").length;
  const meaningful = headingChars + paragraphChars + extracted.description.length;
  // Very little real text AND few structural signals → likely a shell.
  if (extracted.textLength >= 600 && extracted.paragraphs.length >= 2) return false;
  if (meaningful >= 250) return false;
  return extracted.textLength < 400;
}
