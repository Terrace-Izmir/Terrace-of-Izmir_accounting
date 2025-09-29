import { Suspense } from "react";

import { getProjectSummaries } from "@/server/projects";

import { ProjectsClient } from "./projects-client";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await getProjectSummaries();

  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Projeler yükleniyor...</div>}>
      <ProjectsClient initialProjects={projects} />
    </Suspense>
  );
}
