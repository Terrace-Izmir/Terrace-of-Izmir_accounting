import { prisma } from "@/lib/prisma";
import type { ProjectSummary } from "@/types/api";

export async function getProjectSummaries(): Promise<ProjectSummary[]> {
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
      totalsMap.set(total.projectId, Number(total._sum.amount ?? 0));
    }
  }

  return projects.map((project: (typeof projects)[number]) => {
    const latestProgress = project.progressLogs.at(0);

    return {
      id: project.id,
      name: project.name,
      code: project.code,
      status: project.status,
      progress: latestProgress?.progress ?? project.progress,
      summary: latestProgress?.summary ?? null,
      budget: project.budget ? Number(project.budget) : null,
      actualCost: project.actualCost ? Number(project.actualCost) : null,
      totalExpense: totalsMap.get(project.id) ?? 0,
      counts: project._count,
      startDate: project.startDate?.toISOString() ?? null,
      endDate: project.endDate?.toISOString() ?? null,
      location: project.location,
      managerName: project.managerName,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  });
}
