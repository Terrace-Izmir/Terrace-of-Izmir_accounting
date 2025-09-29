import { NextRequest } from "next/server";

import { decimalOrUndefined, created, handleError, success } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { createProjectSchema } from "@/lib/validators";
import { getProjectSummaries } from "@/server/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getProjectSummaries();
    return success(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const payload = createProjectSchema.parse(json);

    const project = await prisma.project.create({
      data: {
        name: payload.name,
        code: payload.code,
        description: payload.description,
        status: payload.status,
        progress: payload.progress ?? 0,
        startDate: payload.startDate,
        endDate: payload.endDate,
        budget: decimalOrUndefined(payload.budget),
        actualCost: decimalOrUndefined(payload.actualCost),
        location: payload.location,
        managerName: payload.managerName,
      },
    });

    if (payload.progress !== undefined) {
      await prisma.projectProgressLog.create({
        data: {
          projectId: project.id,
          progress: payload.progress,
          status: payload.status ?? project.status,
          summary: "Başlangıç kaydı",
          details: payload.description,
        },
      });
    }

    return created(project);
  } catch (error) {
    return handleError(error);
  }
}
