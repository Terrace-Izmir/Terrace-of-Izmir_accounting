import { addDays, startOfToday } from "date-fns";
import { NextRequest } from "next/server";

import type { Prisma } from "@prisma/client";

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
    const query = searchParams.get("query")?.trim() || undefined;
    const today = startOfToday();
    const upcomingWindow = addDays(today, 14);

    const where: Prisma.ChequeWhereInput = {};

    if (status) {
      where.status = { equals: status } as Prisma.ChequeWhereInput["status"];
    }
    if (type) {
      where.type = { equals: type } as Prisma.ChequeWhereInput["type"];
    }
    if (purpose) {
      where.purpose = { equals: purpose } as Prisma.ChequeWhereInput["purpose"];
    }
    if (projectId) {
      where.projectId = Number(projectId);
    }
    if (contractId) {
      where.contractId = Number(contractId);
    }
    if (propertyUnitId) {
      where.propertyUnitId = Number(propertyUnitId);
    }
    if (upcoming) {
      where.dueDate = {
        gte: today,
        lte: upcomingWindow,
      };
    }

    if (query) {
      const orFilters: Prisma.ChequeWhereInput[] = [
        { issuer: { contains: query } } as Prisma.ChequeWhereInput,
        { recipient: { contains: query } } as Prisma.ChequeWhereInput,
        { bankName: { contains: query } } as unknown as Prisma.ChequeWhereInput,
        { bankBranch: { contains: query } } as unknown as Prisma.ChequeWhereInput,
        { bankCity: { contains: query } } as unknown as Prisma.ChequeWhereInput,
        { bankAccount: { contains: query } } as unknown as Prisma.ChequeWhereInput,
        { iban: { contains: query } } as unknown as Prisma.ChequeWhereInput,
        { serialNumber: { contains: query } } as unknown as Prisma.ChequeWhereInput,
        { endorsedBy: { contains: query } } as unknown as Prisma.ChequeWhereInput,
        { issuePlace: { contains: query } } as unknown as Prisma.ChequeWhereInput,
        { notes: { contains: query } },
        { ocrExtractedText: { contains: query } } as unknown as Prisma.ChequeWhereInput,
      ];

      where.OR = orFilters as Prisma.ChequeWhereInput[];
    }

    const cheques = await prisma.cheque.findMany({
      where,
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
            contentType: true,
            fileSize: true,
            uploadedAt: true,
            metadata: true,
            extractedText: true,
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

    const data = cheques.map((cheque: (typeof cheques)[number]) => {
      const extended = cheque as (typeof cheque) & {
        bankName: string | null;
        bankBranch: string | null;
        bankCity: string | null;
        bankAccount: string | null;
        iban: string | null;
        serialNumber: string | null;
        endorsedBy: string | null;
        issuePlace: string | null;
        ocrExtractedText: string | null;
        ocrConfidence: number | null;
        ocrMetadata: Record<string, unknown> | null;
        ocrProcessedAt: Date | null;
      };

      return {
        ...cheque,
        amount: Number(cheque.amount),
        bankName: extended.bankName,
        bankBranch: extended.bankBranch,
        bankCity: extended.bankCity,
        bankAccount: extended.bankAccount,
        iban: extended.iban,
        serialNumber: extended.serialNumber,
        endorsedBy: extended.endorsedBy,
        issuePlace: extended.issuePlace,
        ocrExtractedText: extended.ocrExtractedText,
        ocrConfidence: extended.ocrConfidence,
        ocrMetadata: (extended.ocrMetadata ?? null) as Record<string, unknown> | null,
        ocrProcessedAt: extended.ocrProcessedAt?.toISOString() ?? null,
        documents: cheque.documents.map((document) => ({
          ...document,
          metadata: (document.metadata ?? null) as Record<string, unknown> | null,
          uploadedAt: document.uploadedAt.toISOString(),
        })),
      };
    });

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
        bankName: payload.bankName,
        bankBranch: payload.bankBranch,
        bankCity: payload.bankCity,
        bankAccount: payload.bankAccount,
        iban: payload.iban,
        serialNumber: payload.serialNumber,
        endorsedBy: payload.endorsedBy,
        issuePlace: payload.issuePlace,
        remindAt: payload.remindAt,
        notes: payload.notes,
        ocrExtractedText: payload.ocrExtractedText,
        ocrConfidence: payload.ocrConfidence,
        ocrMetadata: payload.ocrMetadata as Prisma.InputJsonValue,
        ocrProcessedAt: payload.ocrProcessedAt ?? (payload.ocrExtractedText ? new Date() : undefined),
      },
    });

    if (payload.documentIds.length) {
      await prisma.documentRecord.updateMany({
        where: { id: { in: payload.documentIds } },
        data: { chequeId: cheque.id },
      });
    }

    return created({
      ...cheque,
      amount: Number(cheque.amount),
      ocrMetadata: (cheque.ocrMetadata ?? null) as Record<string, unknown> | null,
      ocrProcessedAt: cheque.ocrProcessedAt?.toISOString?.() ?? null,
    });
  } catch (error) {
    return handleError(error);
  }
}
