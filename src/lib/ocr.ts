import { readFile } from "fs/promises";
import path from "path";

import pdfParse from "pdf-parse/lib/pdf-parse.js";
import Tesseract from "tesseract.js";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"]);
const TEXT_EXTENSIONS = new Set([".txt", ".csv", ".json", ".md", ".log"]);

export interface OcrExtractResult {
  text: string;
  confidence?: number;
  source: "tesseract" | "pdf" | "text" | "binary";
  metadata?: Record<string, unknown>;
}

function normalizeConfidence(confidence?: number) {
  if (typeof confidence !== "number" || Number.isNaN(confidence)) {
    return undefined;
  }

  return Math.min(Math.max(confidence, 0), 100);
}

async function runTesseract(imagePath: string): Promise<OcrExtractResult> {
  const { data } = await Tesseract.recognize(imagePath, "tur+eng", {
    logger: process.env.NODE_ENV === "development" ? console.log : undefined,
  });

  return {
    text: data.text?.trim() ?? "",
    confidence: normalizeConfidence(data.confidence),
    source: "tesseract",
  };
}

export async function extractTextFromImage(imagePath: string): Promise<string> {
  const result = await runTesseract(imagePath);
  return result.text;
}

export async function extractTextFromFile(
  filePath: string,
  contentType?: string,
): Promise<OcrExtractResult> {
  const extension = path.extname(filePath).toLowerCase();

  const isImage = contentType?.startsWith("image/") || IMAGE_EXTENSIONS.has(extension);
  if (isImage) {
    return runTesseract(filePath);
  }

  const isPdf = contentType === "application/pdf" || extension === ".pdf";
  if (isPdf) {
    try {
      const buffer = await readFile(filePath);
      const parsed = await pdfParse(buffer);

      const text = parsed.text?.trim() ?? "";
      return {
        text,
        confidence: text ? 95 : 0,
        source: "pdf",
        metadata: {
          pages: parsed.numpages,
          info: parsed.info ?? undefined,
        },
      };
    } catch (error) {
      console.warn("PDF OCR failed, falling back to Tesseract", error);
      return runTesseract(filePath);
    }
  }

  const isText = contentType?.startsWith("text/") || TEXT_EXTENSIONS.has(extension);
  if (isText) {
    const buffer = await readFile(filePath, "utf-8");
    const text = buffer.toString().trim();
    return {
      text,
      confidence: text ? 100 : 0,
      source: "text",
    };
  }

  try {
    const buffer = await readFile(filePath, "utf-8");
    const text = buffer.toString().trim();
    if (text) {
      return {
        text,
        confidence: 25,
        source: "binary",
        metadata: { note: "Heuristic UTF-8 decode" },
      };
    }
  } catch (error) {
    console.warn("Binary file OCR fallback failed", error);
  }

  return {
    text: "",
    confidence: 0,
    source: "binary",
  };
}
