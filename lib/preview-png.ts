// Rasterizes the Before/After preview SVG to PNG so it can be committed into the
// launch PR's branch and embedded via raw.githubusercontent.com — which renders
// reliably in GitHub markdown with no public Lead deployment to proxy. Uses
// `sharp` (already present via Next's image pipeline).
import sharp from "sharp";

import { renderExperimentPreviewSvg } from "@/lib/preview-svg";

export async function renderExperimentPreviewPng(opts: {
  title: string;
  surfaceLabel: string;
  control: string;
  treatment: string;
  split: number;
}): Promise<Buffer> {
  const svg = renderExperimentPreviewSvg(opts);
  // density 144 → ~2x the 1240×520 viewBox for a crisp retina render.
  return sharp(Buffer.from(svg), { density: 144 }).png().toBuffer();
}
