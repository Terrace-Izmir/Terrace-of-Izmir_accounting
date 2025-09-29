import { NextRequest } from "next/server";

import { created, handleError, success } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { createPropertyUnitSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const query = searchParams.get("q")?.trim();

    const units = await prisma.propertyUnit.findMany({
      where: {
        projectId: projectId ? Number(projectId) : undefined,
        status: status ?? undefined,
        OR: query
          ? [
              { name: { contains: query, mode: "insensitive" } },
              { unitNumber: { contains: query, mode: "insensitive" } },
              { block: { contains: query, mode: "insensitive" } },
              { ownerName: { contains: query, mode: "insensitive" } },
            ]
          : undefined,
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
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });

    return success(units);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = createPropertyUnitSchema.parse(await request.json());

    const unit = await prisma.propertyUnit.create({
      data: {
        projectId: payload.projectId,
        name: payload.name,
        block: payload.block,
        floor: payload.floor,
        unitNumber: payload.unitNumber,
        grossArea: payload.grossArea,
        netArea: payload.netArea,
        status: payload.status ?? "AVAILABLE",
        ownerName: payload.ownerName,
        ownerContact: payload.ownerContact,
        notes: payload.notes,
        purchaseDate: payload.purchaseDate,
        handoverDate: payload.handoverDate,
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    return created(unit);
  } catch (error) {
    return handleError(error);
  }
}
