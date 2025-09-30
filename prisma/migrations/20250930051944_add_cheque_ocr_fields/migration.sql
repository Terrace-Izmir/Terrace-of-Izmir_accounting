-- AlterTable
ALTER TABLE "Cheque" ADD COLUMN "bankAccount" TEXT;
ALTER TABLE "Cheque" ADD COLUMN "bankBranch" TEXT;
ALTER TABLE "Cheque" ADD COLUMN "bankCity" TEXT;
ALTER TABLE "Cheque" ADD COLUMN "bankName" TEXT;
ALTER TABLE "Cheque" ADD COLUMN "endorsedBy" TEXT;
ALTER TABLE "Cheque" ADD COLUMN "iban" TEXT;
ALTER TABLE "Cheque" ADD COLUMN "issuePlace" TEXT;
ALTER TABLE "Cheque" ADD COLUMN "ocrConfidence" REAL;
ALTER TABLE "Cheque" ADD COLUMN "ocrExtractedText" TEXT;
ALTER TABLE "Cheque" ADD COLUMN "ocrMetadata" JSONB;
ALTER TABLE "Cheque" ADD COLUMN "ocrProcessedAt" DATETIME;
ALTER TABLE "Cheque" ADD COLUMN "serialNumber" TEXT;
