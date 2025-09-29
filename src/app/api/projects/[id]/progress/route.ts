import { NextRequest } from "next/server";

import { created, handleError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { createProgressLogSchema } from "@/lib/validators";

type RouteParams = {
  params: { id: string };
};

function parseProjectId(params: RouteParams["params"]) {
  const projectId = Number(params.id);
  if (Number.isNaN(projectId)) {
    throw new Error("Geçersiz proje kimliği");
  }

  return projectId;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const projectId = parseProjectId(params);
    const payload = createProgressLogSchema.parse({
      ...(await request.json()),
      projectId,
    });

    const log = await prisma.projectProgressLog.create({
      data: {
        projectId,
        progress: payload.progress,
        status: payload.status,
        summary: payload.summary,
        details: payload.details,
        insights: payload.insights,
        recordedAt: payload.recordedAt,
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: {
        progress: payload.progress,
        status: payload.status,
      },
    });

    return created(log);
  } catch (error) {
    return handleError(error);
  }
}
