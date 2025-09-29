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

    const data: Record<string, unknown> = {};

    if (body.status) data.status = body.status;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.remindAt !== undefined)
      data.remindAt = body.remindAt ? new Date(body.remindAt) : null;
    if (body.contractId !== undefined)
      data.contract = body.contractId
        ? { connect: { id: Number(body.contractId) } }
        : { disconnect: true };
    if (body.propertyUnitId !== undefined)
      data.propertyUnit = body.propertyUnitId
        ? { connect: { id: Number(body.propertyUnitId) } }
        : { disconnect: true };
    if (body.projectId !== undefined)
      data.project = body.projectId
        ? { connect: { id: Number(body.projectId) } }
        : { disconnect: true };
    if (body.memberId !== undefined)
      data.member = body.memberId
        ? { connect: { id: Number(body.memberId) } }
        : { disconnect: true };
    if (body.purpose !== undefined) data.purpose = body.purpose;
    if (body.reminderSent !== undefined)
      data.reminderSent = Boolean(body.reminderSent);
    if (body.reminderSentAt !== undefined)
      data.reminderSentAt = body.reminderSentAt
        ? new Date(body.reminderSentAt)
        : null;
    if (body.reminderCount !== undefined)
      data.reminderCount = Number(body.reminderCount);

    const logReminder = Boolean(body.recordReminder);

    if (logReminder) {
      if (data.reminderSent === undefined) data.reminderSent = true;
      if (data.reminderSentAt === undefined) data.reminderSentAt = new Date();
      if (data.reminderCount === undefined)
        data.reminderCount = { increment: 1 };
    }

    const include = {
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
        select: { id: true, name: true, filePath: true },
      },
    } as const;

    const hasUpdateFields = Object.keys(data).length > 0;

    const baseQuery = hasUpdateFields
      ? prisma.cheque.update({ where: { id }, data, include })
      : prisma.cheque.findUniqueOrThrow({ where: { id }, include });

    const [cheque] = logReminder
      ? await prisma.$transaction([
          baseQuery,
          prisma.chequeReminderLog.create({
            data: {
              chequeId: id,
              reminderSentAt: body.reminderSentAt
                ? new Date(body.reminderSentAt)
                : undefined,
              channel: body.reminderChannel ?? undefined,
              notes: body.reminderNotes ?? undefined,
            },
          }),
        ])
      : [await baseQuery];

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
