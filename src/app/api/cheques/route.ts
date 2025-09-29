import { addDays, startOfToday } from "date-fns";
import { NextRequest } from "next/server";

import { created, handleError, success } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { createChequeSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const type = searchParams.get("type") ?? undefined;
    const purpose = searchParams.get("purpose") ?? undefined;
    const projectId = searchParams.get("projectId");
    const contractId = searchParams.get("contractId");
    const propertyUnitId = searchParams.get("propertyUnitId");
    const upcoming = searchParams.get("upcoming") === "true";
    const withLogs = searchParams.get("withLogs") === "true";

    const today = startOfToday();
    const upcomingWindow = addDays(today, 14);

    const cheques = await prisma.cheque.findMany({
      where: {
        status: status as typeof status | undefined,
        type: type as typeof type | undefined,
        purpose: purpose as typeof purpose | undefined,
        projectId: projectId ? Number(projectId) : undefined,
        contractId: contractId ? Number(contractId) : undefined,
        propertyUnitId: propertyUnitId ? Number(propertyUnitId) : undefined,
        dueDate: upcoming
          ? {
              gte: today,
              lte: upcomingWindow,
            }
          : undefined,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        member: {
          select: { id: true, name: true },
        },
        contract: {
          select: {
            id: true,
            title: true,
            clientName: true,
            contractType: true,
          },
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
        documents: {
          select: {
            id: true,
            name: true,
            filePath: true,
            category: true,
          },
        },
        reminderLogs: withLogs
          ? {
              orderBy: { reminderSentAt: "desc" },
            }
          : false,
      },
      orderBy: { dueDate: "asc" },
    });

    const data = cheques.map((cheque: (typeof cheques)[number]) => ({
      ...cheque,
      amount: Number(cheque.amount),
    }));

    return success(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = createChequeSchema.parse(await request.json());

    const cheque = await prisma.cheque.create({
      data: {
        projectId: payload.projectId,
        memberId: payload.memberId,
        contractId: payload.contractId,
        propertyUnitId: payload.propertyUnitId,
        type: payload.type,
        status: payload.status,
        purpose: payload.purpose,
        amount: payload.amount,
        currency: payload.currency,
        issueDate: payload.issueDate,
        dueDate: payload.dueDate,
        issuer: payload.issuer,
        recipient: payload.recipient,
        remindAt: payload.remindAt,
        notes: payload.notes,
      },
    });

    return created({
      ...cheque,
      amount: Number(cheque.amount),
    });
  } catch (error) {
    return handleError(error);
  }
}
