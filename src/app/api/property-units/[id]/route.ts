import { NextRequest, NextResponse } from "next/server";

import { handleError, success } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { updatePropertyUnitSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

function parseUnitId(params: RouteParams["params"]) {
  const unitId = Number(params.id);
  if (Number.isNaN(unitId)) {
    throw new Error("Geçersiz bağımsız bölüm kimliği");
  }

  return unitId;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const id = parseUnitId(params);
    const payload = updatePropertyUnitSchema.parse(await request.json());

    const unit = await prisma.propertyUnit.update({
      where: { id },
      data: {
        projectId: payload.projectId,
        name: payload.name,
        block: payload.block,
        floor: payload.floor,
        unitNumber: payload.unitNumber,
        grossArea: payload.grossArea,
        netArea: payload.netArea,
        status: payload.status,
        ownerName: payload.ownerName,
        ownerContact: payload.ownerContact,
        notes: payload.notes,
        purchaseDate: payload.purchaseDate,
        handoverDate: payload.handoverDate,
      },
      include: {
        project: { select: { id: true, name: true } },
        contracts: {
          orderBy: { createdAt: "desc" },
          include: {
            cheques: {
              orderBy: { dueDate: "asc" },
            },
          },
        },
        cheques: {
          orderBy: { dueDate: "asc" },
          include: {
            contract: {
              select: { id: true, title: true, status: true },
            },
          },
        },
        documents: {
          select: {
            id: true,
            name: true,
            filePath: true,
            category: true,
            uploadedAt: true,
          },
        },
      },
    });

    return success(unit);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const id = parseUnitId(params);

    await prisma.$transaction([
      prisma.salesContract.updateMany({
        where: { propertyUnitId: id },
        data: { propertyUnitId: null },
      }),
      prisma.cheque.updateMany({
        where: { propertyUnitId: id },
        data: { propertyUnitId: null },
      }),
      prisma.documentRecord.updateMany({
        where: { propertyUnitId: id },
        data: { propertyUnitId: null },
      }),
      prisma.propertyUnit.delete({ where: { id } }),
    ]);

    return NextResponse.json({ ok: true }, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
