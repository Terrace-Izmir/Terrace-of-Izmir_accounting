declare module "pdf-parse" {
  interface PDFParseResult {
    numpages: number;
    numrender?: number;
    info?: Record<string, unknown>;
    metadata?: unknown;
    text: string;
    version?: string;
  }

  type PdfParseInput = ArrayBuffer | Buffer | Uint8Array | string;

  export default function pdfParse(
    input: PdfParseInput,
    options?: unknown,
  ): Promise<PDFParseResult>;
}

declare module "pdf-parse/lib/pdf-parse.js" {
  import pdfParse from "pdf-parse";
  export default pdfParse;
}
