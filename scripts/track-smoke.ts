// Smoke test for the tracking pipeline: ensure a project key, POST events to the
// live /api/ingest, then read them back through the metrics aggregation.
//   bun run scripts/track-smoke.ts        (dev server must be running on :3000)
import { db } from "@/lib/db";
import { ensureSdkKey } from "@/lib/sdk-key";
import { getProjectMetrics } from "@/lib/metrics";

const project = await db.project.findFirst({
  orderBy: { updatedAt: "desc" },
  select: { id: true, name: true, sdkKey: true },
});
if (!project) {
  console.error("No project in DB — connect a repo first.");
  process.exit(1);
}

const sdkKey = await ensureSdkKey(project);
console.log(`project=${project.name} sdkKey=${sdkKey}`);

const visitorId = "vtest_" + Math.random().toString(36).slice(2, 8);
const events = [
  { type: "PAGEVIEW", path: "/" },
  { type: "PAGEVIEW", path: "/pricing" },
  { type: "CLICK", name: "Start free", path: "/" },
  { type: "CLICK", name: "Start free", path: "/" },
  { type: "CLICK", name: "See pricing", path: "/" },
  { type: "CONVERSION", name: "signup", path: "/signup" },
];

const res = await fetch("http://localhost:3000/api/ingest", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sdkKey, visitorId, sessionId: "s1", events }),
});
console.log(`POST /api/ingest -> ${res.status}`);

await new Promise((r) => setTimeout(r, 400));
const m = await getProjectMetrics(project.id, 14);
console.log("metrics:", JSON.stringify(m, null, 2));
process.exit(0);
