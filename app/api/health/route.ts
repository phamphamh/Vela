export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ok: true, service: "lead-growth-agent", ts: Date.now() });
}
