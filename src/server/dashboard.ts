import { addDays, startOfToday, subMonths } from "date-fns";

import { prisma } from "@/lib/prisma";

export async function getDashboardSummary() {
  const today = startOfToday();
  const sixMonthsAgo = subMonths(today, 5);
  const upcomingWindow = addDays(today, 14);

  const [
    totalProjects,
    activeProjects,
    totalExpenses,
    upcomingCheques,
    projectProgress,
    recentExpenses,
    partnershipTotals,
    totalContracts,
    totalDocuments,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({
      where: { status: { in: ["PLANNING", "IN_PROGRESS"] } },
    }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.cheque.findMany({
      where: {
        status: "PENDING",
        OR: [
          { dueDate: { gte: today, lte: upcomingWindow } },
          {
            remindAt: {
              not: null,
              gte: today,
              lte: upcomingWindow,
            },
          },
        ],
      },
      include: {
        contract: {
          select: { id: true, title: true, clientName: true, contractType: true },
        },
        propertyUnit: {
          select: {
            id: true,
            name: true,
            status: true,
            block: true,
            floor: true,
            unitNumber: true,
          },
        },
        project: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.project.findMany({
      select: {
        id: true,
        name: true,
        progress: true,
        status: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.expense.findMany({
      where: {
        incurredAt: {
          gte: sixMonthsAgo,
        },
      },
      orderBy: { incurredAt: "desc" },
      take: 20,
    }),
    prisma.partnershipTransaction.groupBy({
      by: ["memberId"],
      _sum: { amount: true },
    }),
    prisma.salesContract.count(),
    prisma.documentRecord.count(),
  ]);

  const monthlyExpenses = new Map<string, number>();
  for (const expense of recentExpenses) {
    const monthKey = `${expense.incurredAt.getFullYear()}-${
      expense.incurredAt.getMonth() + 1
    }`;
    monthlyExpenses.set(
      monthKey,
      (monthlyExpenses.get(monthKey) ?? 0) + Number(expense.amount),
    );
  }

  const partnershipBalance: Record<number, number> = {};
  for (const entry of partnershipTotals) {
    partnershipBalance[entry.memberId] = Number(entry._sum.amount ?? 0);
  }

  return {
    totals: {
      projects: totalProjects,
      activeProjects,
      expenses: Number(totalExpenses._sum.amount ?? 0),
      contracts: totalContracts,
      documents: totalDocuments,
    },
    upcomingCheques: upcomingCheques.map((cheque: (typeof upcomingCheques)[number]) => ({
      ...cheque,
      amount: Number(cheque.amount),
    })),
    projectProgress,
    monthlyExpenses: Array.from(monthlyExpenses.entries()).map(
      ([month, amount]) => ({ month, amount }),
    ),
    recentExpenses: recentExpenses.map((expense: (typeof recentExpenses)[number]) => ({
      id: expense.id,
      title: expense.title,
      amount: Number(expense.amount),
      incurredAt: expense.incurredAt,
      category: expense.category,
      projectId: expense.projectId,
    })),
    partnershipBalance,
  };
}
