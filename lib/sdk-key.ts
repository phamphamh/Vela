import { randomBytes } from "node:crypto";

import { db } from "@/lib/db";

/** Generate a public tracking key, e.g. "lead_pk_3f9c…". Safe to expose in HTML. */
export function newSdkKey(): string {
  return `lead_pk_${randomBytes(16).toString("hex")}`;
}

/**
 * Return the project's SDK key, generating + persisting one if it predates
 * tracking. Idempotent: only writes when `sdkKey` is null.
 */
export async function ensureSdkKey(project: {
  id: string;
  sdkKey: string | null;
}): Promise<string> {
  if (project.sdkKey) return project.sdkKey;
  const sdkKey = newSdkKey();
  await db.project.update({ where: { id: project.id }, data: { sdkKey } });
  return sdkKey;
}
