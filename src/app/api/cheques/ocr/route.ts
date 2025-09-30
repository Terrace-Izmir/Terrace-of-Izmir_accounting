import { NextRequest } from "next/server";

import type { Prisma } from "@prisma/client";

import { created, handleError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { extractTextFromFile } from "@/lib/ocr";
import { saveFile } from "@/lib/storage";
import { analyzeChequeText } from "@/server/cheque-ocr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ParsedFields {
  amount?: number;
  currency?: string;
  dueDate?: string;
  issueDate?: string;
  issuer?: string;
  recipient?: string;
  bankName?: string;
  bankBranch?: string;
  bankCity?: string;
  bankAccount?: string;
  iban?: string;
  serialNumber?: string;
  endorsedBy?: string;
  issuePlace?: string;
}

function parseNumber(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const chequeId = parseNumber(formData.get("chequeId"));
    const projectId = parseNumber(formData.get("projectId"));
    const contractId = parseNumber(formData.get("contractId"));
    const propertyUnitId = parseNumber(formData.get("propertyUnitId"));
    const uploadedBy = formData.get("uploadedBy");
    const autoApply = formData.get("autoApply") === "true";

    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (!files.length) {
      throw new Error("OCR için en az bir dosya yükleyin");
    }

    const aggregatedFields: ParsedFields = {};
    const documents: Array<{
      documentId: number;
      fileName: string;
      filePath: string;
      contentType: string;
      parsedFields: ParsedFields;
      ocrText: string;
      ocrConfidence?: number;
      ocrSource: string;
      documentMetadata: Record<string, unknown>;
    }> = [];

    for (const [index, file] of files.entries()) {
      const saved = await saveFile({
        file,
        folder: "cheques",
        prefix: `cheque-${Date.now()}-${index}`,
      });

      const ocrResult = await extractTextFromFile(saved.storedPath, saved.contentType);
      const analysis = analyzeChequeText(ocrResult.text);

      const metadata: Record<string, unknown> = {
        parsedFields: analysis.fields,
        parserMatches: analysis.matches,
        ocr: {
          source: ocrResult.source,
          confidence: ocrResult.confidence,
          engineMetadata: ocrResult.metadata,
        },
      };

      const document = await prisma.documentRecord.create({
        data: {
          name: file.name || `cheque-${index + 1}`,
          filePath: saved.relativePath.replace(/\\\\/g, "/"),
          fileSize: saved.fileSize,
          contentType: saved.contentType,
          category: "SALES",
          chequeId: chequeId,
          projectId,
          contractId,
          propertyUnitId,
          uploadedBy: typeof uploadedBy === "string" ? uploadedBy : undefined,
          extractedText: ocrResult.text,
          ocrProcessedAt: new Date(),
          metadata: metadata as Prisma.InputJsonValue,
        },
      });

      documents.push({
        documentId: document.id,
        fileName: document.name,
        filePath: document.filePath,
        contentType: document.contentType,
        parsedFields: analysis.fields,
        ocrText: ocrResult.text,
        ocrConfidence: ocrResult.confidence,
        ocrSource: ocrResult.source,
        documentMetadata: metadata,
      });

      for (const [key, value] of Object.entries(analysis.fields)) {
        if (value !== undefined && aggregatedFields[key as keyof ParsedFields] === undefined) {
          aggregatedFields[key as keyof ParsedFields] = value;
        }
      }

      if (autoApply && chequeId) {
        const updateData: Record<string, unknown> = {
          bankName: analysis.fields.bankName ?? undefined,
          bankBranch: analysis.fields.bankBranch ?? undefined,
          bankCity: analysis.fields.bankCity ?? undefined,
          bankAccount: analysis.fields.bankAccount ?? undefined,
          iban: analysis.fields.iban ?? undefined,
          serialNumber: analysis.fields.serialNumber ?? undefined,
          endorsedBy: analysis.fields.endorsedBy ?? undefined,
          issuePlace: analysis.fields.issuePlace ?? undefined,
          issuer: analysis.fields.issuer ?? undefined,
          recipient: analysis.fields.recipient ?? undefined,
          ocrExtractedText: ocrResult.text,
          ocrConfidence: ocrResult.confidence,
          ocrMetadata: metadata as Prisma.InputJsonValue,
          ocrProcessedAt: new Date(),
        };

        if (analysis.fields.amount !== undefined) {
          updateData.amount = analysis.fields.amount;
        }
        if (analysis.fields.dueDate) {
          updateData.dueDate = new Date(analysis.fields.dueDate);
        }
        if (analysis.fields.issueDate) {
          updateData.issueDate = new Date(analysis.fields.issueDate);
        }

        await prisma.cheque.update({
          where: { id: chequeId },
          data: updateData,
        });
      }
    }

    return created({
      documents,
      aggregatedFields,
      documentIds: documents.map((document) => document.documentId),
    });
  } catch (error) {
    return handleError(error);
  }
}
