import { prisma } from "@/lib/prisma";
import { FALLBACK_RUN } from "@/lib/fallback";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/fallback
// Replays the pre-recorded scripted demo (stage safety net): inserts the
// FALLBACK_RUN configs + decisions in a single transaction so the UI shows a
// clean, reproducible run even if the live Claude call fails on stage.
//
// Returns { ok: true, inserted: { configs, decisions } }.
//
// Decision -> config linkage (by FALLBACK_RUN index):
//   d0 ship trap   : from baseline(0) -> trap(1)
//   d1 reject/revert: from trap(1)     -> baseline(0)
//   d2 ship winner : from baseline(0) -> winner(2)
const LINKAGE: Array<{ from: number; to: number }> = [
  { from: 0, to: 1 },
  { from: 1, to: 0 },
  { from: 0, to: 2 },
];

export async function POST() {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Clean slate so "Rejouer la démo" always shows exactly the scripted
      // 3-step story (no leftover events/decisions/configs from prior clicks).
      await tx.event.deleteMany({});
      await tx.decision.deleteMany({});
      await tx.config.deleteMany({});

      // Insert configs in order, keeping their generated ids for linkage.
      const configIds: string[] = [];
      for (const c of FALLBACK_RUN.configs) {
        const created = await tx.config.create({
          data: {
            json: c.json as unknown as Prisma.InputJsonValue,
            active: c.active,
            createdBy: c.createdBy,
          },
        });
        configIds.push(created.id);
      }

      // Insert decisions with increasing createdAt so /api/decisions (newest
      // first) replays the narrative with the winning ship on top.
      const base = Date.now() - FALLBACK_RUN.decisions.length * 1000;
      let decisions = 0;
      for (let i = 0; i < FALLBACK_RUN.decisions.length; i++) {
        const d = FALLBACK_RUN.decisions[i];
        const link = LINKAGE[i];
        await tx.decision.create({
          data: {
            configIdFrom: link ? configIds[link.from] : null,
            configIdTo: link ? configIds[link.to] : null,
            hypothesis: d.hypothesis,
            reasoning: d.reasoning,
            verdict: d.verdict,
            proximalDelta: d.proximalDelta,
            downstreamDelta: d.downstreamDelta,
            accelerated: d.accelerated,
            createdAt: new Date(base + i * 1000),
          },
        });
        decisions++;
      }

      return { configs: configIds.length, decisions };
    });

    return Response.json({ ok: true, inserted: result });
  } catch (err) {
    console.error("[/api/fallback] failed:", err);
    return Response.json(
      { ok: false, error: "fallback_insert_failed" },
      { status: 500 }
    );
  }
}
