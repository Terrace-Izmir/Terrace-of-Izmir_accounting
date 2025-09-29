import { unlink } from "fs/promises";
import path from "path";

import { NextRequest, NextResponse } from "next/server";

import { handleError, success } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

function parseExpenseId(params: RouteParams["params"]) {
  const expenseId = Number(params.id);
  if (Number.isNaN(expenseId)) {
    throw new Error("Geçersiz masraf kimliği");
  }

  return expenseId;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const id = parseExpenseId(params);
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        attachments: true,
        documents: true,
        member: true,
        project: true,
      },
    });

    if (!expense) {
      return NextResponse.json({ error: "Masraf bulunamadı" }, { status: 404 });
    }

    return success({
      ...expense,
      amount: Number(expense.amount),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const id = parseExpenseId(params);
    const body = await request.json();

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        note: body.note,
        approvalStatus: body.approvalStatus,
        category: body.category,
      },
      include: {
        attachments: true,
      },
    });

    return success({
      ...expense,
      amount: Number(expense.amount),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const id = parseExpenseId(params);

    const attachments = await prisma.expenseAttachment.findMany({
      where: { expenseId: id },
    });

    await prisma.$transaction([
      prisma.documentRecord.deleteMany({ where: { expenseId: id } }),
      prisma.expenseAttachment.deleteMany({ where: { expenseId: id } }),
      prisma.expense.delete({ where: { id } }),
    ]);

    for (const attachment of attachments) {
      const absolutePath = path.join(process.cwd(), attachment.filePath);
      await unlink(absolutePath).catch(() => undefined);
    }

    return NextResponse.json({ ok: true }, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
