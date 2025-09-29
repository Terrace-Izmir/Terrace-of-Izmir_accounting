import { NextRequest } from "next/server";

import { decimalOrUndefined, created, handleError, success } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { createProjectSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [projects, expenseTotals] = await Promise.all([
      prisma.project.findMany({
        include: {
          progressLogs: {
            orderBy: { recordedAt: "desc" },
            take: 1,
          },
          _count: {
            select: {
              expenses: true,
              cheques: true,
              salesContracts: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.expense.groupBy({
        by: ["projectId"],
        _sum: { amount: true },
      }),
    ]);

    const totalsMap = new Map<number, number>();
    for (const total of expenseTotals) {
      if (total.projectId !== null) {
        const amount = total._sum.amount ?? 0;
        totalsMap.set(total.projectId, Number(amount));
      }
    }

  const data = projects.map((project: (typeof projects)[number]) => {
      const latestProgress = project.progressLogs.at(0);
      return {
        id: project.id,
        name: project.name,
        code: project.code,
        status: project.status,
        progress: latestProgress?.progress ?? project.progress,
        summary: latestProgress?.summary,
        budget: project.budget ? Number(project.budget) : null,
        actualCost: project.actualCost ? Number(project.actualCost) : null,
        totalExpense: totalsMap.get(project.id) ?? 0,
        counts: project._count,
        startDate: project.startDate,
        endDate: project.endDate,
        location: project.location,
        managerName: project.managerName,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      };
    });

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
