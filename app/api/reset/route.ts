import { prisma } from "@/lib/prisma";
import { BASELINE_CONFIG } from "@/lib/baseline";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/reset
// Wipe the demo to a clean, reproducible slate:
//   - delete all Events, Decisions and Configs
//   - recreate a single baseline active Config
//   - reset the AgentLock (running=false, mode=accelerated)
// Returns { ok: true }.
export async function POST() {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.event.deleteMany({});
      await tx.decision.deleteMany({});
      await tx.config.deleteMany({});
      await tx.config.create({
        data: {
          json: BASELINE_CONFIG as unknown as Prisma.InputJsonValue,
          active: true,
          createdBy: "human",
        },
      });
      await tx.agentLock.upsert({
        where: { id: 1 },
        update: { running: false, mode: "accelerated" },
        create: { id: 1, running: false, mode: "accelerated" },
      });
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[/api/reset] failed:", err);
    return Response.json({ ok: false, error: "reset_failed" }, { status: 500 });
  }
}
