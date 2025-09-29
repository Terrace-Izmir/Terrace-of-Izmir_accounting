import { NextRequest, NextResponse } from "next/server";

import { handleError, success } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { createContractSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

function parseContractId(params: RouteParams["params"]) {
  const contractId = Number(params.id);
  if (Number.isNaN(contractId)) {
    throw new Error("Geçersiz sözleşme kimliği");
  }

  return contractId;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const id = parseContractId(params);
    const payload = createContractSchema.partial().parse(await request.json());

    const contract = await prisma.salesContract.update({
      where: { id },
      data: payload,
    });

    return success({
      ...contract,
      value: contract.value ? Number(contract.value) : null,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const id = parseContractId(params);

    await prisma.$transaction([
      prisma.documentRecord.deleteMany({ where: { contractId: id } }),
      prisma.salesContract.delete({ where: { id } }),
    ]);

    return NextResponse.json({ ok: true }, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
