const LONG_DATE_REGEX = /(\d{1,2}\s+(OCAK|ŞUBAT|MART|NİSAN|MAYIS|HAZİRAN|TEMMUZ|AĞUSTOS|EYLÜL|EKİM|KASIM|ARALIK)\s+\d{2,4})/gi;
const AMOUNT_REGEX = /(?:₺|TL|TRY)?\s*([\d.,]{2,})\s*(?:₺|TL|TRY)/i;
const IBAN_REGEX = /(TR[\s\d]{10,36})/i;
const ACCOUNT_REGEX = /(HESAP\s*NO[:\s-]*)([\d\s-]+)/i;
const SERIAL_REGEX = /(SER[İI]?(?:\s*NO)?[:\s-]*)([\w\d-]+)/i;
const BRANCH_REGEX = /(ŞUBE|SUBE|BRANCH|ŞB\.)\s*[:\-]?\s*([\wÇĞİÖŞÜ\s\d-]+)/i;
const ISSUE_PLACE_REGEX = /(KEŞ[İI]DE\s*YER[İI]|KESIDE\s*YER[İI]|ISSUE\s*PLACE)[:\s-]*([\wÇĞİÖŞÜ\s\d-]+)/i;
const ENDORSE_REGEX = /(C[İI]RO|CÜRO|ENDORSE)[:\s-]*([\wÇĞİÖŞÜ\s\d-]+)/i;
const RECIPIENT_REGEX = /(LEHDAR|ALICI|PAYEE)[:\s-]*([\wÇĞİÖŞÜ\s\d-]+)/i;
const ISSUER_REGEX = /(KEŞ[İI]DECI?|ÇEK\s*SAH[İI]B[İI]|ISSUER)[:\s-]*([\wÇĞİÖŞÜ\s\d-]+)/i;

const TURKISH_MONTHS: Record<string, string> = {
  OCAK: "01",
  ŞUBAT: "02",
  SUBAT: "02",
  MART: "03",
  NİSAN: "04",
  NISAN: "04",
  MAYIS: "05",
  HAZİRAN: "06",
  HAZIRAN: "06",
  TEMMUZ: "07",
  AĞUSTOS: "08",
  AGUSTOS: "08",
  EYLÜL: "09",
  EYLUL: "09",
  EKİM: "10",
  EKIM: "10",
  KASIM: "11",
  ARALIK: "12",
};

export interface ParsedChequeFields {
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

export interface ChequeOcrAnalysis {
  fields: ParsedChequeFields;
  matches: Record<string, unknown>;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function toTitleCase(value?: string | null) {
  if (!value) return undefined;
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseDateCandidate(input: string) {
  const cleaned = input.replace(/[^\dA-ZÇĞİÖŞÜ\s.\/-]/gi, " ").trim();
  const numeric = cleaned.match(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/);
  if (numeric) {
    const [day, month, year] = numeric[0].split(/[./-]/);
    const normalizedYear = year.length === 2 ? `20${year}` : year;
    const normalizedMonth = month.padStart(2, "0");
    const normalizedDay = day.padStart(2, "0");
    return `${normalizedYear}-${normalizedMonth}-${normalizedDay}`;
  }

  const longForm = cleaned.match(LONG_DATE_REGEX);
  if (longForm) {
    const parts = longForm[0].split(/\s+/);
    const day = parts[0].padStart(2, "0");
    const month = TURKISH_MONTHS[parts[1].toUpperCase()] ?? "01";
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    return `${year}-${month}-${day}`;
  }

  return undefined;
}

function parseAmountCandidate(input: string) {
  const match = input.match(AMOUNT_REGEX);
  if (!match) return undefined;
  const raw = match[1].replace(/\./g, "").replace(/,/g, ".");
  const amount = Number.parseFloat(raw);
  if (Number.isNaN(amount)) return undefined;
  return amount;
}

export function analyzeChequeText(text: string): ChequeOcrAnalysis {
  const fields: ParsedChequeFields = {};
  const matches: Record<string, unknown> = {};

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const joinedUpper = text.toUpperCase();

  const bankLine = lines.find((line) => /BANKAS[İI]/i.test(line));
  if (bankLine) {
    matches.bankLine = bankLine;
    const cleanedBank = bankLine
      .replace(/ŞUBE.*/i, "")
      .replace(/SUBE.*/i, "")
      .trim();
    fields.bankName = toTitleCase(cleanedBank);
  }

  const ibanMatch = joinedUpper.match(IBAN_REGEX);
  if (ibanMatch) {
    const iban = ibanMatch[1].replace(/\s+/g, "");
    matches.iban = iban;
    fields.iban = iban.slice(0, 34);
  }

  const accountMatch = joinedUpper.match(ACCOUNT_REGEX);
  if (accountMatch) {
    const account = accountMatch[2].replace(/\s+/g, "");
    matches.account = account;
    fields.bankAccount = account;
  }

  const serialMatch = joinedUpper.match(SERIAL_REGEX);
  if (serialMatch) {
    matches.serialNumber = serialMatch[2].trim();
    fields.serialNumber = serialMatch[2].replace(/\s+/g, "");
  }

  const branchMatch = joinedUpper.match(BRANCH_REGEX);
  if (branchMatch) {
    const branchRaw = normalizeWhitespace(branchMatch[2]);
    matches.branch = branchRaw;
    fields.bankBranch = toTitleCase(branchRaw);
  }

  const issuePlaceMatch = joinedUpper.match(ISSUE_PLACE_REGEX);
  if (issuePlaceMatch) {
    const place = normalizeWhitespace(issuePlaceMatch[2]);
    matches.issuePlace = place;
    fields.issuePlace = toTitleCase(place);
  }

  const endorseMatch = joinedUpper.match(ENDORSE_REGEX);
  if (endorseMatch) {
    const endorsed = normalizeWhitespace(endorseMatch[2]);
    matches.endorsedBy = endorsed;
    fields.endorsedBy = toTitleCase(endorsed);
  }

  const recipientMatch = joinedUpper.match(RECIPIENT_REGEX);
  if (recipientMatch) {
    const recipient = normalizeWhitespace(recipientMatch[2]);
    matches.recipient = recipient;
    fields.recipient = toTitleCase(recipient);
  }

  const issuerMatch = joinedUpper.match(ISSUER_REGEX);
  if (issuerMatch) {
    const issuer = normalizeWhitespace(issuerMatch[2]);
    matches.issuer = issuer;
    fields.issuer = toTitleCase(issuer);
  }

  for (const line of lines) {
    if (!fields.dueDate && /VADE|ÖDEME|DUE/i.test(line)) {
      const parsed = parseDateCandidate(line);
      if (parsed) {
        fields.dueDate = parsed;
        matches.dueDateLine = line;
      }
    }
    if (!fields.issueDate && /KEŞ[İI]DE|ISSUE/i.test(line)) {
      const parsed = parseDateCandidate(line);
      if (parsed) {
        fields.issueDate = parsed;
        matches.issueDateLine = line;
      }
    }
    if (!fields.amount) {
      const amount = parseAmountCandidate(line);
      if (amount) {
        fields.amount = amount;
        fields.currency = line.includes("$") ? "USD" : "TRY";
        matches.amountLine = line;
      }
    }
  }

  if (!fields.dueDate) {
    const genericDate = parseDateCandidate(text);
    if (genericDate) {
      fields.dueDate = genericDate;
      matches.genericDate = genericDate;
    }
  }

  if (!fields.amount) {
    const amount = parseAmountCandidate(text);
    if (amount) {
      fields.amount = amount;
      fields.currency = text.includes("$") ? "USD" : "TRY";
      matches.amountFallback = amount;
    }
  }

  if (!fields.bankName && branchMatch) {
    fields.bankName = toTitleCase(branchMatch[2].split(" ")[0] + " Bankası");
  }

  if (fields.bankBranch) {
    const parts = fields.bankBranch.split(" ");
    if (parts.length > 1) {
      fields.bankCity = toTitleCase(parts[parts.length - 1]);
    }
  }

  return {
    fields,
    matches,
  };
}
