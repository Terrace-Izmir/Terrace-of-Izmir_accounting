import { NextRequest } from "next/server";

import { created, handleError, success } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { createContractSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const projectId = searchParams.get("projectId");

    const contracts = await prisma.salesContract.findMany({
      where: {
        status: status ?? undefined,
        projectId: projectId ? Number(projectId) : undefined,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        documents: true,
      },
      orderBy: { createdAt: "desc" },
    });

  const data = contracts.map((contract: (typeof contracts)[number]) => ({
      ...contract,
      value: contract.value ? Number(contract.value) : null,
    }));

    return success(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = createContractSchema.parse(await request.json());

    const contract = await prisma.salesContract.create({
      data: {
        projectId: payload.projectId,
        contractNumber: payload.contractNumber,
        title: payload.title,
        clientName: payload.clientName,
        status: payload.status ?? "DRAFT",
        value: payload.value,
        signedDate: payload.signedDate,
        deliveryDate: payload.deliveryDate,
        closingDate: payload.closingDate,
        notes: payload.notes,
      },
    });

    return created({
      ...contract,
      value: contract.value ? Number(contract.value) : null,
    });
  } catch (error) {
    return handleError(error);
  }
}
