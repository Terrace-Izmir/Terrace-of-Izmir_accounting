import { z } from "zod";

export const projectStatusValues = [
  "PLANNING",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
] as const;

export const chequeTypeValues = ["CHEQUE", "PROMISSORY_NOTE"] as const;

export const chequeStatusValues = ["PENDING", "PAID", "CANCELLED"] as const;

export const partnershipTransactionValues = [
  "CONTRIBUTION",
  "EXPENSE",
  "WITHDRAWAL",
  "ADJUSTMENT",
] as const;

export const contractStatusValues = [
  "DRAFT",
  "NEGOTIATION",
  "SIGNED",
  "CLOSED",
  "CANCELLED",
] as const;

export const documentCategoryValues = [
  "GENERAL",
  "PROJECT",
  "EXPENSE",
  "CONTRACT",
  "PARTNERSHIP",
  "SALES",
] as const;

const decimal = z.coerce.number();

export const createProjectSchema = z.object({
  name: z.string().min(1, "Proje adı gerekli"),
  code: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(projectStatusValues).optional(),
  progress: z.coerce.number().min(0).max(100).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  budget: decimal.nonnegative().optional(),
  actualCost: decimal.nonnegative().optional(),
  location: z.string().optional(),
  managerName: z.string().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const createProgressLogSchema = z.object({
  projectId: z.coerce.number().int(),
  progress: z.coerce.number().min(0).max(100),
  status: z.enum(projectStatusValues).optional(),
  summary: z.string().min(1),
  details: z.string().optional(),
  insights: z.string().optional(),
  recordedAt: z.coerce.date().optional(),
});

export const createExpenseSchema = z.object({
  title: z.string().min(1),
  amount: decimal.positive(),
  currency: z.string().default("TRY"),
  category: z.string().min(1),
  note: z.string().optional(),
  vendor: z.string().optional(),
  paymentMethod: z.string().optional(),
  incurredAt: z.coerce.date(),
  approvalStatus: z.string().optional(),
  projectId: z.coerce.number().int().optional(),
  memberId: z.coerce.number().int().optional(),
});

export const createChequeSchema = z.object({
  projectId: z.coerce.number().int().optional(),
  memberId: z.coerce.number().int().optional(),
  type: z.enum(chequeTypeValues).default("CHEQUE"),
  status: z.enum(chequeStatusValues).default("PENDING"),
  amount: decimal.positive(),
  currency: z.string().default("TRY"),
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date(),
  issuer: z.string().optional(),
  recipient: z.string().optional(),
  remindAt: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const createPartnershipMemberSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.string().optional(),
});

export const createPartnershipTransactionSchema = z.object({
  memberId: z.coerce.number().int(),
  projectId: z.coerce.number().int().optional(),
  expenseId: z.coerce.number().int().optional(),
  type: z.enum(partnershipTransactionValues),
  amount: decimal,
  description: z.string().optional(),
  occurredAt: z.coerce.date().optional(),
});

export const createContractSchema = z.object({
  projectId: z.coerce.number().int().optional(),
  contractNumber: z.string().optional(),
  title: z.string().min(1),
  clientName: z.string().min(1),
  status: z.enum(contractStatusValues).optional(),
  value: decimal.nonnegative().optional(),
  signedDate: z.coerce.date().optional(),
  deliveryDate: z.coerce.date().optional(),
  closingDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const createDocumentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(documentCategoryValues).default("GENERAL"),
  projectId: z.coerce.number().int().optional(),
  expenseId: z.coerce.number().int().optional(),
  contractId: z.coerce.number().int().optional(),
  folderId: z.coerce.number().int().optional(),
  tags: z.string().optional(),
  uploadedBy: z.string().optional(),
});

export const createFolderSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  parentId: z.coerce.number().int().optional(),
});
