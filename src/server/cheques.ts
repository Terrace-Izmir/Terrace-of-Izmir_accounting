import { prisma } from "@/lib/prisma";
import type { ChequeDTO } from "@/types/api";

export interface ChequeWithRelations extends ChequeDTO {
  createdAt: string;
  updatedAt: string;
  documents: Array<{
    id: number;
    name: string;
    filePath: string;
    category: string;
    contentType: string;
    fileSize: number;
    uploadedAt: string;
    extractedText?: string | null;
    metadata?: Record<string, unknown> | null;
  }>;
  reminderLogs: Array<{
    id: number;
    reminderSentAt: string;
    channel?: string | null;
    notes?: string | null;
  }>;
}

export interface ChequeReferenceData {
  projects: Array<{ id: number; name: string }>;
  members: Array<{ id: number; name: string }>;
  contracts: Array<{ id: number; title: string; projectId: number | null; contractType: string }>;
  propertyUnits: Array<{ id: number; name: string; projectId: number }>;
}

export async function getChequeOverview(): Promise<ChequeWithRelations[]> {
  const cheques = await prisma.cheque.findMany({
    include: {
      project: { select: { id: true, name: true } },
      member: { select: { id: true, name: true } },
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
      documents: {
        select: {
          id: true,
          name: true,
          filePath: true,
          category: true,
          contentType: true,
          fileSize: true,
          uploadedAt: true,
          extractedText: true,
          metadata: true,
        },
      },
      reminderLogs: {
        orderBy: { reminderSentAt: "desc" },
      },
    },
    orderBy: [
      { status: "asc" },
      { dueDate: "asc" },
    ],
  });

  return cheques.map((cheque: (typeof cheques)[number]) => {
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
    id: cheque.id,
    amount: Number(cheque.amount),
    currency: cheque.currency,
    status: cheque.status,
    type: cheque.type,
    purpose: cheque.purpose,
    issueDate: cheque.issueDate?.toISOString() ?? null,
    dueDate: cheque.dueDate.toISOString(),
    issuer: cheque.issuer,
    recipient: cheque.recipient,
    bankName: extended.bankName,
    bankBranch: extended.bankBranch,
    bankCity: extended.bankCity,
    bankAccount: extended.bankAccount,
    iban: extended.iban,
    serialNumber: extended.serialNumber,
    endorsedBy: extended.endorsedBy,
    issuePlace: extended.issuePlace,
    remindAt: cheque.remindAt?.toISOString() ?? null,
    reminderSent: cheque.reminderSent,
    reminderSentAt: cheque.reminderSentAt?.toISOString() ?? null,
    reminderCount: cheque.reminderCount,
    notes: cheque.notes,
    ocrExtractedText: extended.ocrExtractedText,
    ocrConfidence: extended.ocrConfidence ?? null,
    ocrMetadata: extended.ocrMetadata ?? null,
    ocrProcessedAt: extended.ocrProcessedAt?.toISOString() ?? null,
    project: cheque.project,
    member: cheque.member,
    contract: cheque.contract,
    propertyUnit: cheque.propertyUnit,
    createdAt: cheque.createdAt.toISOString(),
    updatedAt: cheque.updatedAt.toISOString(),
    documents: cheque.documents.map((document) => ({
      ...document,
      metadata: document.metadata as Record<string, unknown> | null,
      uploadedAt: document.uploadedAt.toISOString(),
    })),
    reminderLogs: cheque.reminderLogs.map((log: (typeof cheque.reminderLogs)[number]) => ({
      id: log.id,
      reminderSentAt: log.reminderSentAt.toISOString(),
      channel: log.channel,
      notes: log.notes,
    })),
  };
  });
}

export async function getChequeReferenceData(): Promise<ChequeReferenceData> {
  const [projects, members, contracts, propertyUnits] = await Promise.all([
    prisma.project.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.partnershipMember.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.salesContract.findMany({
      select: {
        id: true,
        title: true,
        projectId: true,
        contractType: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.propertyUnit.findMany({
      select: { id: true, name: true, projectId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    projects,
    members,
    contracts,
    propertyUnits,
  };
}
