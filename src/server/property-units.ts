import { prisma } from "@/lib/prisma";
import type { PropertyUnitDTO } from "@/types/api";

export async function getPropertyUnits(): Promise<PropertyUnitDTO[]> {
  const units = await prisma.propertyUnit.findMany({
    include: {
      project: { select: { id: true, name: true } },
      contracts: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          contractType: true,
          value: true,
        },
      },
      cheques: {
        orderBy: { dueDate: "asc" },
        select: {
          id: true,
          amount: true,
          dueDate: true,
          status: true,
          currency: true,
        },
      },
      documents: {
        select: {
          id: true,
          name: true,
          filePath: true,
          uploadedAt: true,
          category: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return units.map((unit: (typeof units)[number]) => ({
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
  contracts: unit.contracts.map((contract: (typeof unit.contracts)[number]) => ({
      ...contract,
      value: contract.value ? Number(contract.value) : null,
    })),
  cheques: unit.cheques.map((cheque: (typeof unit.cheques)[number]) => ({
      ...cheque,
      amount: Number(cheque.amount),
      dueDate: cheque.dueDate.toISOString(),
    })),
  documents: unit.documents.map((document: (typeof unit.documents)[number]) => ({
      ...document,
      uploadedAt: document.uploadedAt.toISOString(),
    })),
  }));
}
