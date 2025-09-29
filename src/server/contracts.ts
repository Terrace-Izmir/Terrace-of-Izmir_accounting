import { prisma } from "@/lib/prisma";
import type { ChequeDTO, PropertyUnitDTO, SalesContractDTO } from "@/types/api";

export interface ContractWithRelations extends SalesContractDTO {
  cheques: ChequeDTO[];
  createdAt: string;
  updatedAt: string;
  documents: Array<{
    id: number;
    name: string;
    filePath: string;
    category: string;
    uploadedAt: string;
  }>;
}

export interface ContractReferenceData {
  projects: Array<{ id: number; name: string }>;
  propertyUnits: Array<PropertyUnitDTO>;
}

export async function getContractsOverview(): Promise<ContractWithRelations[]> {
  const contracts = await prisma.salesContract.findMany({
    include: {
      project: { select: { id: true, name: true } },
      propertyUnit: {
        select: {
          id: true,
          name: true,
          status: true,
          block: true,
          floor: true,
          unitNumber: true,
          grossArea: true,
          netArea: true,
          ownerName: true,
          ownerContact: true,
          notes: true,
          purchaseDate: true,
          handoverDate: true,
          createdAt: true,
          updatedAt: true,
          projectId: true,
        },
      },
      cheques: {
        orderBy: { dueDate: "asc" },
        include: {
          project: { select: { id: true, name: true } },
          member: { select: { id: true, name: true } },
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
        },
      },
      documents: {
        orderBy: { uploadedAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return contracts.map((contract: (typeof contracts)[number]) => ({
    ...contract,
    value: contract.value ? Number(contract.value) : null,
    signedDate: contract.signedDate?.toISOString() ?? null,
    deliveryDate: contract.deliveryDate?.toISOString() ?? null,
    closingDate: contract.closingDate?.toISOString() ?? null,
    createdAt: contract.createdAt.toISOString(),
    updatedAt: contract.updatedAt.toISOString(),
    propertyUnit: contract.propertyUnit
      ? {
          ...contract.propertyUnit,
          grossArea: contract.propertyUnit.grossArea
            ? Number(contract.propertyUnit.grossArea)
            : null,
          netArea: contract.propertyUnit.netArea
            ? Number(contract.propertyUnit.netArea)
            : null,
          purchaseDate: contract.propertyUnit.purchaseDate?.toISOString() ?? null,
          handoverDate: contract.propertyUnit.handoverDate?.toISOString() ?? null,
          createdAt: contract.propertyUnit.createdAt.toISOString(),
          updatedAt: contract.propertyUnit.updatedAt.toISOString(),
        }
      : null,
    cheques: contract.cheques.map((cheque: (typeof contract.cheques)[number]) => ({
      ...cheque,
      amount: Number(cheque.amount),
      issueDate: cheque.issueDate?.toISOString() ?? null,
      dueDate: cheque.dueDate.toISOString(),
      remindAt: cheque.remindAt?.toISOString() ?? null,
      reminderSentAt: cheque.reminderSentAt?.toISOString() ?? null,
    })),
    documents: contract.documents.map((document: (typeof contract.documents)[number]) => ({
      ...document,
      uploadedAt: document.uploadedAt.toISOString(),
    })),
  }));
}

export async function getContractReferenceData(): Promise<ContractReferenceData> {
  const [projects, units] = await Promise.all([
    prisma.project.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.propertyUnit.findMany({
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const propertyUnits: PropertyUnitDTO[] = units.map((unit: (typeof units)[number]) => ({
    id: unit.id,
    projectId: unit.projectId,
    name: unit.name,
    block: unit.block,
    floor: unit.floor,
    unitNumber: unit.unitNumber,
    grossArea: unit.grossArea ? Number(unit.grossArea) : null,
    netArea: unit.netArea ? Number(unit.netArea) : null,
    status: unit.status,
    ownerName: unit.ownerName,
    ownerContact: unit.ownerContact,
    notes: unit.notes,
    purchaseDate: unit.purchaseDate?.toISOString() ?? null,
    handoverDate: unit.handoverDate?.toISOString() ?? null,
    createdAt: unit.createdAt.toISOString(),
    updatedAt: unit.updatedAt.toISOString(),
    project: unit.project,
    contracts: [],
    cheques: [],
    documents: [],
  }));

  return {
    projects,
    propertyUnits,
  };
}
