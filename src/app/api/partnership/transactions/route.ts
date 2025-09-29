import { NextRequest } from "next/server";

import { created, handleError, success } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { createPartnershipTransactionSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const projectId = searchParams.get("projectId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const transactions = await prisma.partnershipTransaction.findMany({
      where: {
        memberId: memberId ? Number(memberId) : undefined,
        projectId: projectId ? Number(projectId) : undefined,
        occurredAt: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      include: {
        member: {
          select: { id: true, name: true },
        },
        project: {
          select: { id: true, name: true },
        },
        expense: {
          select: { id: true, title: true },
        },
      },
      orderBy: { occurredAt: "desc" },
    });

  const data = transactions.map((transaction: (typeof transactions)[number]) => ({
      ...transaction,
      amount: Number(transaction.amount),
    }));

    return success(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = createPartnershipTransactionSchema.parse(
      await request.json(),
    );

    const transaction = await prisma.partnershipTransaction.create({
      data: {
        memberId: payload.memberId,
        projectId: payload.projectId,
        expenseId: payload.expenseId,
        type: payload.type,
        amount: payload.amount,
        description: payload.description,
        occurredAt: payload.occurredAt ?? new Date(),
      },
    });

    return created({
      ...transaction,
      amount: Number(transaction.amount),
    });
  } catch (error) {
    return handleError(error);
  }
}
