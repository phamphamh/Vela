// Renders a Before/After A/B preview as a self-contained SVG string (no deps).
// Embedded in the launch PR body and shown on the dashboard so reviewers can
// SEE the copy change rendered, not just two data-attributes in the diff.
//
// SVG served with image/svg+xml renders inline in GitHub markdown (the same way
// shields.io badges do), so a plain <img>/![](url) in the PR body works.

// "Warm Precision" palette, hard-coded (SVG can't read the Tailwind/oklch vars).
const C = {
  canvas: "#f7f3ee",
  card: "#ffffff",
  border: "#e6ded3",
  chrome: "#f1ebe2",
  ink: "#2a2320",
  muted: "#8c8378",
  faint: "#ece5db",
  accent: "#cf5a1a",
  accentSoft: "#f6e6da",
  success: "#3f7d4e",
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Greedy word-wrap to at most `maxLines` lines of ~`maxChars` chars each. */
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines - 1) break;
    } else {
      line = next;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  // If we truncated, ellipsize the last line.
  const used = lines.join(" ").length;
  if (used < text.length) {
    const last = lines[lines.length - 1] ?? "";
    lines[lines.length - 1] = last.replace(/\s*\S*$/, "") + "…";
  }
  return lines;
}

type PanelOpts = {
  x: number;
  width: number;
  label: string;
  pct: number;
  copy: string;
  tone: "control" | "treatment";
};

function panel({ x, width, label, pct, copy, tone }: PanelOpts): string {
  const isB = tone === "treatment";
  const stroke = isB ? C.accent : C.border;
  const labelColor = isB ? C.accent : C.muted;
  const headlineColor = isB ? C.accent : C.ink;
  const top = 110;
  const cardH = 372;
  const cardY = top;
  const chromeH = 34;
  const innerX = x + 28;
  const innerW = width - 56;

  const lines = wrap(copy, Math.floor(innerW / 13), 3);
  const lineH = 34;
  const headY = cardY + chromeH + 86;

  // Faux sub-paragraph + CTA to give the copy page context.
  const subY = headY + lines.length * lineH + 18;

  return `
    <text x="${x}" y="${top - 16}" font-family="ui-monospace, monospace" font-size="13" font-weight="600" letter-spacing="0.5" fill="${labelColor}">${escapeXml(label)} · ${pct}%</text>
    <rect x="${x}" y="${cardY}" width="${width}" height="${cardH}" rx="12" fill="${C.card}" stroke="${stroke}" stroke-width="${isB ? 2 : 1}"/>
    <rect x="${x}" y="${cardY}" width="${width}" height="${chromeH}" rx="12" fill="${C.chrome}"/>
    <rect x="${x}" y="${cardY + chromeH - 12}" width="${width}" height="12" fill="${C.chrome}"/>
    <circle cx="${x + 18}" cy="${cardY + chromeH / 2}" r="4" fill="#d9b8a0"/>
    <circle cx="${x + 34}" cy="${cardY + chromeH / 2}" r="4" fill="#e6d2b8"/>
    <circle cx="${x + 50}" cy="${cardY + chromeH / 2}" r="4" fill="#cde0cf"/>
    <rect x="${x + 70}" y="${cardY + 10}" width="${width - 90}" height="14" rx="7" fill="${C.faint}"/>

    ${lines
      .map(
        (ln, i) =>
          `<text x="${x + width / 2}" y="${headY + i * lineH}" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="26" font-weight="700" fill="${headlineColor}">${escapeXml(ln)}</text>`,
      )
      .join("")}

    <rect x="${innerX + innerW * 0.12}" y="${subY}" width="${innerW * 0.76}" height="9" rx="4.5" fill="${C.faint}"/>
    <rect x="${innerX + innerW * 0.22}" y="${subY + 18}" width="${innerW * 0.56}" height="9" rx="4.5" fill="${C.faint}"/>

    <rect x="${x + width / 2 - 90}" y="${subY + 50}" width="180" height="40" rx="8" fill="${isB ? C.accent : C.ink}"/>
    <rect x="${x + width / 2 - 55}" y="${subY + 66}" width="110" height="8" rx="4" fill="${isB ? C.accentSoft : "#ffffff"}" opacity="0.85"/>
  `;
}

export function renderExperimentPreviewSvg(opts: {
  title: string;
  surfaceLabel: string;
  control: string;
  treatment: string;
  split: number; // % to treatment
}): string {
  const W = 1240;
  const H = 520;
  const pad = 32;
  const gap = 32;
  const panelW = (W - pad * 2 - gap) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(opts.title)} — before / after preview">
    <rect width="${W}" height="${H}" fill="${C.canvas}"/>
    <text x="${pad}" y="40" font-family="ui-sans-serif, system-ui, sans-serif" font-size="20" font-weight="700" fill="${C.ink}">${escapeXml(opts.title)}</text>
    <text x="${pad}" y="64" font-family="ui-monospace, monospace" font-size="13" fill="${C.muted}">${escapeXml(opts.surfaceLabel)} A/B test · split ${100 - opts.split}/${opts.split} · rendered preview</text>
    ${panel({ x: pad, width: panelW, label: "A · CONTROL", pct: 100 - opts.split, copy: opts.control, tone: "control" })}
    ${panel({ x: pad + panelW + gap, width: panelW, label: "B · TREATMENT", pct: opts.split, copy: opts.treatment, tone: "treatment" })}
  </svg>`;
}
