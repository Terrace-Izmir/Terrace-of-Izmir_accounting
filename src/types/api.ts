export interface ProjectSummary {
  id: number;
  name: string;
  code: string | null;
  status: string;
  progress: number;
  summary?: string | null;
  budget: number | null;
  actualCost: number | null;
  totalExpense: number;
  counts: {
    expenses: number;
    cheques: number;
    salesContracts: number;
  };
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  managerName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseAttachmentDTO {
  id: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
  extractedText: string | null;
  uploadedAt: string;
}

export interface ExpenseDTO {
  id: number;
  title: string;
  amount: number;
  currency: string;
  category: string;
  note?: string | null;
  vendor?: string | null;
  paymentMethod?: string | null;
  incurredAt: string;
  approvalStatus: string;
  projectId?: number | null;
  memberId?: number | null;
  attachments: ExpenseAttachmentDTO[];
  project?: {
    id: number;
    name: string;
  } | null;
  member?: {
    id: number;
    name: string;
  } | null;
}

export interface ChequeDTO {
  id: number;
  amount: number;
  currency: string;
  status: string;
  type: string;
  purpose?: string | null;
  issueDate?: string | null;
  dueDate: string;
  issuer?: string | null;
  recipient?: string | null;
  remindAt?: string | null;
  reminderSent?: boolean;
  reminderSentAt?: string | null;
  reminderCount?: number;
  notes?: string | null;
  project?: { id: number; name: string } | null;
  member?: { id: number; name: string } | null;
  contract?: {
    id: number;
    title: string;
    clientName: string;
    contractType: string;
  } | null;
  propertyUnit?: {
    id: number;
    name: string;
    status: string;
    block?: string | null;
    floor?: string | null;
    unitNumber?: string | null;
  } | null;
}

export interface PartnershipMemberDTO {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  createdAt: string;
  updatedAt: string;
  totals?: Record<string, number>;
  _count?: {
    expenses: number;
    cheques: number;
    transactions: number;
  };
}

export interface PartnershipTransactionDTO {
  id: number;
  memberId: number;
  projectId?: number | null;
  expenseId?: number | null;
  type: string;
  amount: number;
  description?: string | null;
  occurredAt: string;
  member?: { id: number; name: string } | null;
  project?: { id: number; name: string } | null;
  expense?: { id: number; title: string } | null;
}

export interface SalesContractDTO {
  id: number;
  projectId?: number | null;
  contractNumber?: string | null;
  title: string;
  clientName: string;
  status: string;
  contractType: string;
  value?: number | null;
  signedDate?: string | null;
  deliveryDate?: string | null;
  closingDate?: string | null;
  notes?: string | null;
  project?: { id: number; name: string } | null;
  propertyUnit?: PropertyUnitDTO | null;
  cheques?: ChequeDTO[];
}

export interface DocumentRecordDTO {
  id: number;
  name: string;
  description?: string | null;
  category: string;
  filePath: string;
  fileSize: number;
  contentType: string;
  projectId?: number | null;
  expenseId?: number | null;
  contractId?: number | null;
  chequeId?: number | null;
  propertyUnitId?: number | null;
  folderId?: number | null;
  tags?: string | null;
  uploadedBy?: string | null;
  uploadedAt: string;
  project?: { id: number; name: string } | null;
  expense?: { id: number; title: string } | null;
  contract?: { id: number; title: string } | null;
  cheque?: {
    id: number;
    amount: number;
    currency: string;
    status: string;
    dueDate: string;
  } | null;
  propertyUnit?: PropertyUnitDTO | null;
  folder?: { id: number; name: string } | null;
  extractedText?: string | null;
  ocrProcessedAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface FileFolderDTO {
  id: number;
  name: string;
  slug: string;
  parentId?: number | null;
  children: FileFolderDTO[];
}

export interface PropertyUnitDTO {
  id: number;
  projectId: number;
  name: string;
  block?: string | null;
  floor?: string | null;
  unitNumber?: string | null;
  grossArea?: number | null;
  netArea?: number | null;
  status: string;
  ownerName?: string | null;
  ownerContact?: string | null;
  notes?: string | null;
  purchaseDate?: string | null;
  handoverDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  project?: { id: number; name: string } | null;
  contracts?: SalesContractDTO[];
  cheques?: ChequeDTO[];
  documents?: DocumentRecordDTO[];
}
