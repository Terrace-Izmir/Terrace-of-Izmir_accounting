import { NextRequest, NextResponse } from "next/server";

import { handleError, success } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

function parseChequeId(params: RouteParams["params"]) {
  const chequeId = Number(params.id);
  if (Number.isNaN(chequeId)) {
    throw new Error("Geçersiz çek senet kimliği");
  }

  return chequeId;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const id = parseChequeId(params);
    const body = await request.json();

    const cheque = await prisma.cheque.update({
      where: { id },
      data: {
        status: body.status,
        notes: body.notes,
        remindAt: body.remindAt,
      },
    });

    return success({
      ...cheque,
      amount: Number(cheque.amount),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const id = parseChequeId(params);
    await prisma.cheque.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
