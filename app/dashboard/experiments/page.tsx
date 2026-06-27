import { headers } from "next/headers";

import { ExperimentsList } from "@/components/dashboard/experiments-list";
import { auth } from "@/lib/auth";
import { getProjectExperiments } from "@/lib/experiments";

export default async function ExperimentsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const { experiments, repoFullName } = session
    ? await getProjectExperiments(session.user.id)
    : { experiments: [], repoFullName: null };

  return <ExperimentsList experiments={experiments} repoFullName={repoFullName} />;
}
