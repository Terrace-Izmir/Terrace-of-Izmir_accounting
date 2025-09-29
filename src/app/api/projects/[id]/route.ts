import { NextRequest, NextResponse } from "next/server";

import { decimalOrUndefined, handleError, success } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { updateProjectSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const id = parseProjectId(params);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        progressLogs: {
          orderBy: { recordedAt: "desc" },
        },
        expenses: {
          select: {
            id: true,
            title: true,
            amount: true,
            category: true,
            incurredAt: true,
            memberId: true,
          },
          orderBy: { incurredAt: "desc" },
          take: 25,
        },
        cheques: {
          orderBy: { dueDate: "asc" },
        },
        salesContracts: true,
        documents: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
    }

    return success(project);
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const id = parseProjectId(params);
    const payload = updateProjectSchema.parse(await request.json());

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...payload,
        budget: decimalOrUndefined(payload.budget),
        actualCost: decimalOrUndefined(payload.actualCost),
        progress: payload.progress,
      },
    });

    return success(project);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const id = parseProjectId(params);
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
