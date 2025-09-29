import { NextRequest } from "next/server";

import { created, handleError, success } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/storage";
import { extractTextFromImage } from "@/lib/ocr";
import { createDocumentSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toOptionalString(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") ?? undefined;
    const folderId = searchParams.get("folderId");
    const projectId = searchParams.get("projectId");
    const propertyUnitId = searchParams.get("propertyUnitId");
    const chequeId = searchParams.get("chequeId");
    const query = searchParams.get("q")?.toLowerCase();

    const documents = await prisma.documentRecord.findMany({
      where: {
        category,
        folderId: folderId ? Number(folderId) : undefined,
        projectId: projectId ? Number(projectId) : undefined,
        propertyUnitId: propertyUnitId ? Number(propertyUnitId) : undefined,
        chequeId: chequeId ? Number(chequeId) : undefined,
        OR: query
          ? [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { tags: { contains: query, mode: "insensitive" } },
              { extractedText: { contains: query, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        expense: {
          select: { id: true, title: true },
        },
        contract: {
          select: { id: true, title: true },
        },
        cheque: {
          select: {
            id: true,
            dueDate: true,
            amount: true,
            currency: true,
            status: true,
          },
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
        folder: true,
      },
      orderBy: { uploadedAt: "desc" },
    });

  const data = documents.map((document: (typeof documents)[number]) => ({
      ...document,
      cheque: document.cheque
        ? {
            ...document.cheque,
            amount: Number(document.cheque.amount),
          }
        : null,
    }));

    return success(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const base = createDocumentSchema.parse({
      name: toOptionalString(formData.get("name")) ?? "Dosya",
      description: toOptionalString(formData.get("description")),
      category: toOptionalString(formData.get("category")) ?? "GENERAL",
      projectId: toOptionalString(formData.get("projectId")),
      expenseId: toOptionalString(formData.get("expenseId")),
      contractId: toOptionalString(formData.get("contractId")),
      chequeId: toOptionalString(formData.get("chequeId")),
      propertyUnitId: toOptionalString(formData.get("propertyUnitId")),
      folderId: toOptionalString(formData.get("folderId")),
      tags: toOptionalString(formData.get("tags")),
      uploadedBy: toOptionalString(formData.get("uploadedBy")),
      metadata: toOptionalString(formData.get("metadata")),
    });

    let parsedMetadata: Record<string, unknown> | undefined;
    if (base.metadata) {
      try {
        parsedMetadata = JSON.parse(base.metadata);
      } catch (error) {
        console.warn("Failed to parse document metadata", error);
        throw new Error("Metaveri JSON formatında olmalıdır");
      }
    }

    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (!files.length) {
      throw new Error("Yüklenecek dosya bulunamadı");
    }

    const savedDocuments = [] as Array<{
      name: string;
      description?: string;
      category: string;
      filePath: string;
      fileSize: number;
      contentType: string;
      projectId?: number;
      expenseId?: number;
      contractId?: number;
      chequeId?: number;
      propertyUnitId?: number;
      folderId?: number;
      tags?: string;
      uploadedBy?: string;
      extractedText?: string;
      ocrProcessedAt?: Date;
      metadata?: Record<string, unknown>;
    }>;

    for (const [index, file] of files.entries()) {
      const saved = await saveFile({
        file,
        folder: "documents",
        prefix: `doc-${Date.now()}-${index}`,
      });

      let extractedText: string | undefined;
      if (saved.contentType.startsWith("image/")) {
        try {
          extractedText = await extractTextFromImage(saved.storedPath);
        } catch (error) {
          console.warn("OCR extraction failed", error);
        }
      }

      savedDocuments.push({
        name: files.length > 1 ? `${base.name}-${index + 1}` : base.name,
        description: base.description,
        category: base.category,
        filePath: saved.relativePath.replace(/\\\\/g, "/"),
        fileSize: saved.fileSize,
        contentType: saved.contentType,
        projectId: base.projectId ? Number(base.projectId) : undefined,
        expenseId: base.expenseId ? Number(base.expenseId) : undefined,
        contractId: base.contractId ? Number(base.contractId) : undefined,
        chequeId: base.chequeId ? Number(base.chequeId) : undefined,
        propertyUnitId: base.propertyUnitId
          ? Number(base.propertyUnitId)
          : undefined,
        folderId: base.folderId ? Number(base.folderId) : undefined,
        tags: base.tags,
        uploadedBy: base.uploadedBy,
        extractedText,
        ocrProcessedAt: extractedText ? new Date() : undefined,
        metadata: parsedMetadata,
      });
    }

    await prisma.documentRecord.createMany({ data: savedDocuments });

    return created(savedDocuments);
  } catch (error) {
    return handleError(error);
  }
}
