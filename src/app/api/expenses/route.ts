import { NextRequest } from "next/server";

import { created, handleError, success } from "@/lib/api-utils";
import { extractTextFromImage } from "@/lib/ocr";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/storage";
import { createExpenseSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toOptionalString(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toOptionalNumber(value: FormDataEntryValue | null) {
  const asString = toOptionalString(value);
  if (asString === undefined) {
    return undefined;
  }

  const numeric = Number(asString);
  return Number.isNaN(numeric) ? undefined : numeric;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const memberId = searchParams.get("memberId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const expenses = await prisma.expense.findMany({
      where: {
        projectId: projectId ? Number(projectId) : undefined,
        memberId: memberId ? Number(memberId) : undefined,
        incurredAt: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      include: {
        attachments: true,
        member: true,
        project: {
          select: { id: true, name: true },
        },
      },
      orderBy: { incurredAt: "desc" },
    });

  const data = expenses.map((expense: (typeof expenses)[number]) => ({
      ...expense,
      amount: Number(expense.amount),
    }));

    return success(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const payload = createExpenseSchema.parse({
      title: toOptionalString(formData.get("title")),
      amount: toOptionalString(formData.get("amount")),
      currency: toOptionalString(formData.get("currency")) ?? "TRY",
      category: toOptionalString(formData.get("category")),
      note: toOptionalString(formData.get("note")),
      vendor: toOptionalString(formData.get("vendor")),
      paymentMethod: toOptionalString(formData.get("paymentMethod")),
      incurredAt: toOptionalString(formData.get("incurredAt")),
      approvalStatus: toOptionalString(formData.get("approvalStatus")),
      projectId: toOptionalNumber(formData.get("projectId")),
      memberId: toOptionalNumber(formData.get("memberId")),
    });

    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    const attachmentsData = [] as Array<{
      fileName: string;
      filePath: string;
      fileSize: number;
      contentType: string;
      extractedText: string;
    }>;

    for (const file of files) {
      const saved = await saveFile({
        file,
        folder: "expenses",
        prefix: `expense-${Date.now()}`,
      });

      const extractedText = await extractTextFromImage(saved.storedPath);
      attachmentsData.push({
        fileName: file.name,
        filePath: saved.relativePath.replace(/\\\\/g, "/"),
        fileSize: saved.fileSize,
        contentType: saved.contentType,
        extractedText,
      });
    }

    const expense = await prisma.expense.create({
      data: {
        title: payload.title,
        amount: payload.amount,
        currency: payload.currency,
        category: payload.category,
        note: payload.note,
        vendor: payload.vendor,
        paymentMethod: payload.paymentMethod,
        incurredAt: payload.incurredAt,
        approvalStatus: payload.approvalStatus ?? "PENDING",
        projectId: payload.projectId,
        memberId: payload.memberId,
        attachments: attachmentsData.length
          ? {
              create: attachmentsData,
            }
          : undefined,
      },
      include: {
        attachments: true,
      },
    });

    if (attachmentsData.length) {
      await prisma.documentRecord.createMany({
        data: attachmentsData.map((attachment) => ({
          name: attachment.fileName,
          description: payload.note,
          category: "EXPENSE",
          filePath: attachment.filePath,
          fileSize: attachment.fileSize,
          contentType: attachment.contentType,
          expenseId: expense.id,
          projectId: payload.projectId ?? undefined,
          tags: payload.category,
        })),
      });
    }

    return created({
      ...expense,
      amount: Number(expense.amount),
    });
  } catch (error) {
    return handleError(error);
  }
}
