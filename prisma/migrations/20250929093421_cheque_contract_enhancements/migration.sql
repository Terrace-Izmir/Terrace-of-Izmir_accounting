-- CreateTable
CREATE TABLE "PropertyUnit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "block" TEXT,
    "floor" TEXT,
    "unitNumber" TEXT,
    "grossArea" DECIMAL,
    "netArea" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "ownerName" TEXT,
    "ownerContact" TEXT,
    "notes" TEXT,
    "purchaseDate" DATETIME,
    "handoverDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PropertyUnit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChequeReminderLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "chequeId" INTEGER NOT NULL,
    "reminderSentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" TEXT,
    "notes" TEXT,
    CONSTRAINT "ChequeReminderLog_chequeId_fkey" FOREIGN KEY ("chequeId") REFERENCES "Cheque" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Cheque" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER,
    "memberId" INTEGER,
    "contractId" INTEGER,
    "propertyUnitId" INTEGER,
    "type" TEXT NOT NULL DEFAULT 'CHEQUE',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "purpose" TEXT,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "issueDate" DATETIME,
    "dueDate" DATETIME NOT NULL,
    "issuer" TEXT,
    "recipient" TEXT,
    "notes" TEXT,
    "remindAt" DATETIME,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderSentAt" DATETIME,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cheque_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Cheque_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "PartnershipMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Cheque_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "SalesContract" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Cheque_propertyUnitId_fkey" FOREIGN KEY ("propertyUnitId") REFERENCES "PropertyUnit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Cheque" ("amount", "createdAt", "currency", "dueDate", "id", "issueDate", "issuer", "memberId", "notes", "projectId", "recipient", "remindAt", "status", "type", "updatedAt") SELECT "amount", "createdAt", "currency", "dueDate", "id", "issueDate", "issuer", "memberId", "notes", "projectId", "recipient", "remindAt", "status", "type", "updatedAt" FROM "Cheque";
DROP TABLE "Cheque";
ALTER TABLE "new_Cheque" RENAME TO "Cheque";
CREATE TABLE "new_DocumentRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "projectId" INTEGER,
    "expenseId" INTEGER,
    "contractId" INTEGER,
    "chequeId" INTEGER,
    "propertyUnitId" INTEGER,
    "folderId" INTEGER,
    "tags" TEXT,
    "uploadedBy" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "extractedText" TEXT,
    "ocrProcessedAt" DATETIME,
    "metadata" JSONB,
    CONSTRAINT "DocumentRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocumentRecord_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocumentRecord_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "SalesContract" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocumentRecord_chequeId_fkey" FOREIGN KEY ("chequeId") REFERENCES "Cheque" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocumentRecord_propertyUnitId_fkey" FOREIGN KEY ("propertyUnitId") REFERENCES "PropertyUnit" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocumentRecord_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "FileFolder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DocumentRecord" ("category", "contentType", "contractId", "createdAt", "description", "expenseId", "filePath", "fileSize", "folderId", "id", "name", "projectId", "tags", "uploadedAt", "uploadedBy") SELECT "category", "contentType", "contractId", "createdAt", "description", "expenseId", "filePath", "fileSize", "folderId", "id", "name", "projectId", "tags", "uploadedAt", "uploadedBy" FROM "DocumentRecord";
DROP TABLE "DocumentRecord";
ALTER TABLE "new_DocumentRecord" RENAME TO "DocumentRecord";
CREATE TABLE "new_SalesContract" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER,
    "contractNumber" TEXT,
    "title" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "contractType" TEXT NOT NULL DEFAULT 'PROPERTY_SALE',
    "value" DECIMAL,
    "signedDate" DATETIME,
    "deliveryDate" DATETIME,
    "closingDate" DATETIME,
    "notes" TEXT,
    "propertyUnitId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalesContract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SalesContract_propertyUnitId_fkey" FOREIGN KEY ("propertyUnitId") REFERENCES "PropertyUnit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SalesContract" ("clientName", "closingDate", "contractNumber", "createdAt", "deliveryDate", "id", "notes", "projectId", "signedDate", "status", "title", "updatedAt", "value") SELECT "clientName", "closingDate", "contractNumber", "createdAt", "deliveryDate", "id", "notes", "projectId", "signedDate", "status", "title", "updatedAt", "value" FROM "SalesContract";
DROP TABLE "SalesContract";
ALTER TABLE "new_SalesContract" RENAME TO "SalesContract";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
