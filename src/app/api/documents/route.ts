import { NextRequest } from "next/server";

import { created, handleError, success } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/storage";
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
    const query = searchParams.get("q")?.toLowerCase();

    const documents = await prisma.documentRecord.findMany({
      where: {
        category,
        folderId: folderId ? Number(folderId) : undefined,
        projectId: projectId ? Number(projectId) : undefined,
        OR: query
          ? [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { tags: { contains: query, mode: "insensitive" } },
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
        folder: true,
      },
      orderBy: { uploadedAt: "desc" },
    });

    return success(documents);
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
      folderId: toOptionalString(formData.get("folderId")),
      tags: toOptionalString(formData.get("tags")),
      uploadedBy: toOptionalString(formData.get("uploadedBy")),
    });

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
      folderId?: number;
      tags?: string;
      uploadedBy?: string;
    }>;

    for (const [index, file] of files.entries()) {
      const saved = await saveFile({
        file,
        folder: "documents",
        prefix: `doc-${Date.now()}-${index}`,
      });

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
        folderId: base.folderId ? Number(base.folderId) : undefined,
        tags: base.tags,
        uploadedBy: base.uploadedBy,
      });
    }

    await prisma.documentRecord.createMany({ data: savedDocuments });

    return created(savedDocuments);
  } catch (error) {
    return handleError(error);
  }
}
