import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

async function ensureDirectoryExists(directory: string) {
  await mkdir(directory, { recursive: true });
}

export interface SaveFileParams {
  file: File;
  folder?: string;
  prefix?: string;
}

export interface SaveFileResult {
  storedPath: string;
  relativePath: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

export async function saveFile({
  file,
  folder = "general",
  prefix,
}: SaveFileParams): Promise<SaveFileResult> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const extension = path.extname(file.name) || "";
  const safePrefix = prefix ? `${prefix}-` : "";
  const fileName = `${safePrefix}${randomUUID()}${extension}`;

  const targetDirectory = path.join(UPLOAD_ROOT, folder);
  await ensureDirectoryExists(targetDirectory);

  const storedPath = path.join(targetDirectory, fileName);
  await writeFile(storedPath, buffer);

  const relativePath = path.relative(process.cwd(), storedPath);

  return {
    storedPath,
    relativePath,
    fileName,
    fileSize: buffer.byteLength,
    contentType: file.type || "application/octet-stream",
  };
}
