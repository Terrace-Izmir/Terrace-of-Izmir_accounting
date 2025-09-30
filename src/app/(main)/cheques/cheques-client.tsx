"use client";

import { useCallback, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format } from "date-fns";
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCcw,
  StickyNote,
} from "lucide-react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import useSWR from "swr";
import type { z } from "zod";

import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatDate } from "@/lib/format";
import { fetcher } from "@/lib/swr";
import {
  chequePurposeValues,
  chequeStatusValues,
  chequeTypeValues,
  createChequeSchema,
} from "@/lib/validators";
import type { ChequeDTO } from "@/types/api";
import type { ChequeReferenceData, ChequeWithRelations } from "@/server/cheques";
import type { ParsedChequeFields } from "@/server/cheque-ocr";

const statusLabels: Record<(typeof chequeStatusValues)[number], string> = {
  PENDING: "Bekleyen",
  PAID: "Ödendi",
  CANCELLED: "İptal",
};

const purposeLabels: Record<(typeof chequePurposeValues)[number], string> = {
  PROPERTY_SALE_PAYMENT: "Yap-Sat Satışı",
  MATERIAL_PURCHASE_PAYMENT: "Malzeme Alımı",
  SERVICE_PAYMENT: "Hizmet Ödemesi",
  OTHER: "Diğer",
};

const formatConfidence = (value?: number | null) =>
  value == null ? "-" : `${Math.round(value)}%`;

const truncateText = (value: string, limit = 280) =>
  value.length <= limit ? value : `${value.slice(0, limit)}…`;

type ChequeFormValues = z.infer<typeof createChequeSchema>;

type ChequeRow = ChequeWithRelations & {
  reminderLogs?: Array<{
    id: number;
    reminderSentAt: string;
    channel?: string | null;
    notes?: string | null;
  }>;
};

interface OcrDocumentResult {
  documentId: number;
  fileName: string;
  filePath: string;
  contentType: string;
  parsedFields: ParsedChequeFields;
  ocrText: string;
  ocrConfidence?: number;
  ocrSource: string;
  documentMetadata: Record<string, unknown>;
}

interface ChequesClientProps {
  initialCheques: ChequeWithRelations[];
  referenceData: ChequeReferenceData;
}

export function ChequesClient({ initialCheques, referenceData }: ChequesClientProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [purposeFilter, setPurposeFilter] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState<number | "">("");
  const [uploadedDocumentIds, setUploadedDocumentIds] = useState<number[]>([]);
  const [ocrDocuments, setOcrDocuments] = useState<OcrDocumentResult[]>([]);
  const [ocrAggregatedFields, setOcrAggregatedFields] = useState<Partial<ParsedChequeFields>>({});
  const [isUploadingOcr, setIsUploadingOcr] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const apiKey = useMemo(() => {
    const params = new URLSearchParams({ withLogs: "true" });
    if (searchTerm.trim()) {
      params.set("q", searchTerm.trim());
    }
    return `/api/cheques?${params.toString()}`;
  }, [searchTerm]);

  const { data: cheques = [], mutate, isLoading } = useSWR<ChequeWithRelations[]>(
    apiKey,
    fetcher<ChequeWithRelations[]>,
    {
      fallbackData: initialCheques,
    },
  );

  const chequeForm = useForm<ChequeFormValues>({
    resolver: zodResolver(createChequeSchema) as Resolver<ChequeFormValues>,
    defaultValues: {
      status: "PENDING",
      type: "CHEQUE",
      currency: "TRY",
      dueDate: new Date(),
      remindAt: addDays(new Date(), 7),
      documentIds: [],
    } satisfies Partial<ChequeFormValues>,
  });

  async function onCreateCheque(values: ChequeFormValues) {
    const response = await fetch("/api/cheques", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error ?? "Çek/Senet oluşturulamadı");
    }

    chequeForm.reset({
      status: "PENDING",
      type: "CHEQUE",
      currency: "TRY",
      dueDate: new Date(),
      remindAt: addDays(new Date(), 7),
  bankName: "",
  bankBranch: "",
  bankCity: "",
  bankAccount: "",
  iban: "",
  serialNumber: "",
  endorsedBy: "",
  issuePlace: "",
      issueDate: undefined,
      documentIds: [],
    });
    setUploadedDocumentIds([]);
    setOcrDocuments([]);
    setOcrAggregatedFields({});
    setOcrError(null);
    void mutate();
  }

  async function markChequeStatus(chequeId: number, nextStatus: ChequeDTO["status"]) {
    const response = await fetch(`/api/cheques/${chequeId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error ?? "Durum güncellenemedi");
    }

    void mutate();
  }

  async function logReminder(cheque: ChequeRow) {
    const response = await fetch(`/api/cheques/${cheque.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recordReminder: true,
        reminderChannel: "MANUAL",
        reminderNotes: `Hatırlatma - ${format(new Date(), "dd.MM.yyyy HH:mm")}`,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error ?? "Hatırlatma kaydedilemedi");
    }

    void mutate();
  }

  const handleOcrUpload = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length) {
        return;
      }

      const files = Array.from(fileList);
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const currentValues = chequeForm.getValues();
      if (currentValues.projectId) formData.append("projectId", String(currentValues.projectId));
      if (currentValues.contractId) formData.append("contractId", String(currentValues.contractId));
      if (currentValues.propertyUnitId)
        formData.append("propertyUnitId", String(currentValues.propertyUnitId));

      setIsUploadingOcr(true);
      setOcrError(null);

      try {
        const response = await fetch("/api/cheques/ocr", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? "OCR işlemi tamamlanamadı");
        }

        const payload = (await response.json()) as {
          documents: OcrDocumentResult[];
          aggregatedFields?: Partial<ParsedChequeFields>;
          documentIds?: number[];
        };

        const documentIds = payload.documentIds ?? [];
        const aggregated = payload.aggregatedFields ?? {};

        if (aggregated.amount !== undefined) {
          chequeForm.setValue("amount", aggregated.amount, { shouldDirty: true });
        }
        if (aggregated.dueDate) {
          chequeForm.setValue("dueDate", new Date(aggregated.dueDate), { shouldDirty: true });
        }
        if (aggregated.issueDate) {
          chequeForm.setValue("issueDate", new Date(aggregated.issueDate), { shouldDirty: true });
        }

        chequeForm.setValue("bankName", aggregated.bankName ?? "", { shouldDirty: true });
        chequeForm.setValue("bankBranch", aggregated.bankBranch ?? "", { shouldDirty: true });
        chequeForm.setValue("bankCity", aggregated.bankCity ?? "", { shouldDirty: true });
        chequeForm.setValue("bankAccount", aggregated.bankAccount ?? "", { shouldDirty: true });
        chequeForm.setValue("iban", aggregated.iban ?? "", { shouldDirty: true });
        chequeForm.setValue("serialNumber", aggregated.serialNumber ?? "", { shouldDirty: true });
        chequeForm.setValue("endorsedBy", aggregated.endorsedBy ?? "", { shouldDirty: true });
        chequeForm.setValue("issuePlace", aggregated.issuePlace ?? "", { shouldDirty: true });
        chequeForm.setValue("issuer", aggregated.issuer ?? "", { shouldDirty: true });
        chequeForm.setValue("recipient", aggregated.recipient ?? "", { shouldDirty: true });
        chequeForm.setValue("documentIds", documentIds, { shouldDirty: true });

        setUploadedDocumentIds(documentIds);
        setOcrDocuments(payload.documents ?? []);
        setOcrAggregatedFields(aggregated);
      } catch (error) {
        const message = error instanceof Error ? error.message : "OCR sırasında hata oluştu";
        setOcrError(message);
      } finally {
        setIsUploadingOcr(false);
      }
    },
    [chequeForm],
  );

  const filteredCheques = useMemo(() => {
    return cheques.filter((cheque) => {
      if (statusFilter && cheque.status !== statusFilter) return false;
      if (purposeFilter && cheque.purpose !== purposeFilter) return false;
      if (projectFilter && cheque.project?.id !== projectFilter) return false;
      return true;
    });
  }, [cheques, statusFilter, purposeFilter, projectFilter]);

  const ocrSummary = useMemo(
    () => [
      { label: "Tutar", value: ocrAggregatedFields.amount ? formatCurrency(ocrAggregatedFields.amount) : "-" },
      { label: "Vade", value: ocrAggregatedFields.dueDate ? formatDate(ocrAggregatedFields.dueDate) : "-" },
      { label: "Banka", value: ocrAggregatedFields.bankName ?? "-" },
      { label: "Şube", value: ocrAggregatedFields.bankBranch ?? "-" },
      { label: "IBAN", value: ocrAggregatedFields.iban ?? "-" },
      { label: "Seri No", value: ocrAggregatedFields.serialNumber ?? "-" },
    ],
    [ocrAggregatedFields],
  );

  const pendingTotal = filteredCheques
    .filter((cheque) => cheque.status === "PENDING")
    .reduce((sum, cheque) => sum + cheque.amount, 0);

  const upcomingCheques = useMemo(() => {
    const now = new Date();
    const threshold = addDays(now, 14);
    return cheques
      .filter((cheque) => cheque.status === "PENDING")
      .filter((cheque) => new Date(cheque.dueDate) <= threshold)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [cheques]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Bekleyen"
            value={`${filteredCheques.filter((cheque) => cheque.status === "PENDING").length}`}
            subtitle={formatCurrency(pendingTotal)}
            icon={CalendarClock}
            accent="amber"
          />
          <StatCard
            title="Ödenen"
            value={`${cheques.filter((cheque) => cheque.status === "PAID").length}`}
            subtitle="Kayıtlı tüm ödemeler"
            icon={CheckCircle2}
            accent="emerald"
          />
          <StatCard
            title="Hatırlatmalar"
            value={`${cheques.reduce((acc, cheque) => acc + (cheque.reminderCount ?? 0), 0)}`}
            subtitle="Gönderilen toplam uyarı"
            icon={BellRing}
            accent="sky"
          />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-6 py-4">
            <div className="text-sm font-semibold uppercase tracking-wide text-slate-200">
              Çek / Senet Listesi
            </div>
            <div className="ml-auto flex items-center gap-2 text-xs text-slate-300">
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-xs text-white">
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="OCR ve banka bilgisi ara"
                  className="w-48 bg-transparent text-white outline-none placeholder:text-slate-500"
                />
              </div>
              <label className="uppercase tracking-wide">Durum</label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-xs text-white"
              >
                <option value="" className="bg-slate-900 text-white">
                  Tümü
                </option>
                {chequeStatusValues.map((status) => (
                  <option key={status} value={status} className="bg-slate-900 text-white">
                    {statusLabels[status]}
                  </option>
                ))}
              </select>

              <label className="uppercase tracking-wide">Amaç</label>
              <select
                value={purposeFilter}
                onChange={(event) => setPurposeFilter(event.target.value)}
                className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-xs text-white"
              >
                <option value="" className="bg-slate-900 text-white">
                  Tümü
                </option>
                {chequePurposeValues.map((purpose) => (
                  <option key={purpose} value={purpose} className="bg-slate-900 text-white">
                    {purposeLabels[purpose]}
                  </option>
                ))}
              </select>

              <label className="uppercase tracking-wide">Proje</label>
              <select
                value={projectFilter === "" ? "" : projectFilter}
                onChange={(event) =>
                  setProjectFilter(event.target.value ? Number(event.target.value) : "")
                }
                className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-xs text-white"
              >
                <option value="" className="bg-slate-900 text-white">
                  Tümü
                </option>
                {referenceData.projects.map((project) => (
                  <option key={project.id} value={project.id} className="bg-slate-900 text-white">
                    {project.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => void mutate()}
                className="flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:border-sky-400/60 hover:text-white"
              >
                <RefreshCcw className="h-3.5 w-3.5" /> Yenile
              </button>
            </div>
          </div>
          <div className="px-6 pb-3 sm:hidden">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="OCR ve banka bilgisi ara"
              className="w-full rounded-full border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white placeholder:text-slate-500"
            />
          </div>

          <div className="divide-y divide-white/5">
            {isLoading && !cheques.length ? (
              <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" /> Çek verileri yükleniyor...
              </div>
            ) : null}
            {filteredCheques.map((cheque) => (
              <div key={cheque.id} className="flex flex-col gap-4 px-6 py-5 hover:bg-white/[0.04]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">
                      {formatCurrency(cheque.amount)}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      {cheque.contract?.title ?? cheque.propertyUnit?.name ?? cheque.issuer ?? "Tanımsız"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      {statusLabels[cheque.status as keyof typeof statusLabels] ?? cheque.status}
                    </span>
                    {cheque.purpose ? (
                      <span className="rounded-full border border-sky-500/40 px-3 py-1 text-sky-200">
                        {purposeLabels[cheque.purpose as keyof typeof purposeLabels] ?? cheque.purpose}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-white/10 px-3 py-1 text-white">
                      {formatDate(cheque.dueDate)}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 text-xs text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <span className="font-semibold text-slate-300">Proje:</span> {cheque.project?.name ?? "Genel"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300">Müşteri:</span> {cheque.recipient ?? "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300">Hatırlatma:</span> {formatDate(cheque.remindAt)}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300">Yapılan Uyarı:</span> {cheque.reminderCount}
                  </div>
                </div>

                <div className="grid gap-3 text-xs text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <span className="font-semibold text-slate-300">Banka:</span> {cheque.bankName ?? "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300">Şube:</span> {cheque.bankBranch ?? "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300">IBAN:</span> {cheque.iban ?? "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300">Seri No:</span> {cheque.serialNumber ?? "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300">Ciro Eden:</span> {cheque.endorsedBy ?? "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300">Keşide Yeri:</span> {cheque.issuePlace ?? "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300">Keşide Tarihi:</span> {formatDate(cheque.issueDate)}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300">OCR Güveni:</span> {formatConfidence(cheque.ocrConfidence)}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {cheque.status === "PENDING" ? (
                    <button
                      type="button"
                      onClick={() => void markChequeStatus(cheque.id, "PAID")}
                      className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-200 transition hover:bg-emerald-500/30"
                    >
                      Ödendi İşaretle
                    </button>
                  ) : null}
                  {cheque.status !== "CANCELLED" ? (
                    <button
                      type="button"
                      onClick={() => void markChequeStatus(cheque.id, "CANCELLED")}
                      className="rounded-full bg-rose-500/10 px-3 py-1 text-rose-200 transition hover:bg-rose-500/20"
                    >
                      İptal Et
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void logReminder(cheque)}
                    className="rounded-full bg-sky-500/10 px-3 py-1 text-sky-200 transition hover:bg-sky-500/20"
                  >
                    Hatırlatma Kaydet
                  </button>
                </div>

                {cheque.documents.length ? (
                  <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs text-slate-300">
                    <div className="mb-2 flex items-center gap-2 text-amber-200">
                      <FileText className="h-3.5 w-3.5" /> Ekli Dokümanlar
                    </div>
                    <ul className="space-y-1">
                      {cheque.documents.map((document) => (
                        <li key={document.id} className="flex flex-wrap items-center justify-between gap-2">
                          <a
                            href={`/${document.filePath}`}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate text-sky-200 hover:underline"
                          >
                            {document.name}
                          </a>
                          <span className="text-slate-500">{document.contentType}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {cheque.ocrExtractedText ? (
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-300">
                    <p className="mb-1 font-semibold text-slate-200">OCR Metni</p>
                    <p className="max-h-36 overflow-y-auto whitespace-pre-wrap text-[11px] text-slate-400">
                      {truncateText(cheque.ocrExtractedText, 420)}
                    </p>
                  </div>
                ) : null}

                {cheque.reminderLogs.length ? (
                  <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs text-slate-300">
                    <div className="mb-2 flex items-center gap-2 text-sky-200">
                      <BellRing className="h-3.5 w-3.5" /> Hatırlatma Geçmişi
                    </div>
                    <ul className="space-y-1">
                      {cheque.reminderLogs.map((log) => (
                        <li key={log.id} className="flex items-center justify-between gap-3">
                          <span>{formatDate(log.reminderSentAt)}</span>
                          <span className="text-slate-400">{log.notes ?? log.channel ?? "Manual"}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
              <FileText className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                OCR ile Dosya Oku
              </h2>
              <p className="text-xs text-slate-400">PDF veya görselleri yükleyerek banka ve çek bilgilerini otomatik doldurun.</p>
            </div>
          </div>

          <div className="mt-5 space-y-4 text-xs text-slate-300">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] px-4 py-6 text-center transition hover:border-amber-400/60 hover:bg-white/[0.04]">
              <span className="text-sm font-semibold text-white">Dosya Seç</span>
              <span className="text-[11px] text-slate-400">PDF, JPG, PNG ve metin dosyaları desteklenir</span>
              <input
                type="file"
                accept="image/*,application/pdf,text/plain"
                multiple
                className="hidden"
                onChange={(event) => {
                  void handleOcrUpload(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>

            {isUploadingOcr ? (
              <div className="flex items-center justify-center gap-2 text-xs text-amber-200">
                <Loader2 className="h-4 w-4 animate-spin" /> OCR işlemi yapılıyor...
              </div>
            ) : null}

            {ocrError ? <p className="rounded-lg border border-rose-500/40 bg-rose-500/5 px-3 py-2 text-rose-200">{ocrError}</p> : null}

            {uploadedDocumentIds.length ? (
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Yüklenen Dokümanlar</p>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {uploadedDocumentIds.map((id) => (
                    <span key={id} className="rounded-full border border-white/10 px-3 py-1 text-white">
                      #{id}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {ocrDocuments.length ? (
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">OCR Sonuçları</p>
                <ul className="space-y-2">
                  {ocrDocuments.map((document) => (
                    <li key={document.documentId} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                      <div className="flex items-center justify-between text-[11px] text-slate-200">
                        <span className="font-semibold">{document.fileName}</span>
                        <span className="text-slate-400">{formatConfidence(document.ocrConfidence)}</span>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-400">
                        {document.parsedFields.bankName ? `${document.parsedFields.bankName} • ` : ""}
                        {document.parsedFields.dueDate ? formatDate(document.parsedFields.dueDate) : "Vade bilinmiyor"}
                      </p>
                      {document.ocrText ? (
                        <p className="mt-2 max-h-24 overflow-y-auto whitespace-pre-wrap text-[11px] text-slate-500">
                          {truncateText(document.ocrText, 220)}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {ocrDocuments.length || uploadedDocumentIds.length ? (
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Önerilen Bilgiler</p>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  {ocrSummary.map((item) => (
                    <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">{item.label}</p>
                      <p className="mt-1 text-xs text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/20">
              <StickyNote className="h-5 w-5 text-sky-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Yeni Çek / Senet
              </h2>
              <p className="text-xs text-slate-400">Sözleşme, bağımsız bölüm ve hatırlatma bağlantılarını ekleyin.</p>
            </div>
          </div>

          <form
            onSubmit={chequeForm.handleSubmit(async (values) => {
              try {
                await onCreateCheque(values);
              } catch (error) {
                const message = error instanceof Error ? error.message : "Bilinmeyen hata";
                chequeForm.setError("amount", { message });
              }
            })}
            className="mt-5 space-y-4"
          >
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">Tutar (₺)</label>
              <input
                type="number"
                step="0.01"
                {...chequeForm.register("amount", { valueAsNumber: true })}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
              />
              {chequeForm.formState.errors.amount ? (
                <p className="text-xs text-rose-400">{chequeForm.formState.errors.amount.message}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Vade Tarihi</label>
                <Controller
                  control={chequeForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <input
                      type="date"
                      value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                      onChange={(event) =>
                        field.onChange(event.target.value ? new Date(event.target.value) : undefined)
                      }
                      className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                    />
                  )}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Keşide Tarihi</label>
                <Controller
                  control={chequeForm.control}
                  name="issueDate"
                  render={({ field }) => (
                    <input
                      type="date"
                      value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                      onChange={(event) =>
                        field.onChange(event.target.value ? new Date(event.target.value) : undefined)
                      }
                      className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                    />
                  )}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Hatırlatma</label>
                <Controller
                  control={chequeForm.control}
                  name="remindAt"
                  render={({ field }) => (
                    <input
                      type="date"
                      value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                      onChange={(event) =>
                        field.onChange(event.target.value ? new Date(event.target.value) : undefined)
                      }
                      className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                    />
                  )}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">Proje</label>
              <select
                {...chequeForm.register("projectId", {
                  setValueAs: (value: string) => (value ? Number(value) : undefined),
                })}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
              >
                <option value="" className="bg-slate-900 text-white">
                  Proje seçin
                </option>
                {referenceData.projects.map((project) => (
                  <option key={project.id} value={project.id} className="bg-slate-900 text-white">
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">Sözleşme</label>
              <select
                {...chequeForm.register("contractId", {
                  setValueAs: (value: string) => (value ? Number(value) : undefined),
                })}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
              >
                <option value="" className="bg-slate-900 text-white">
                  Sözleşme bağla
                </option>
                {referenceData.contracts.map((contract) => (
                  <option key={contract.id} value={contract.id} className="bg-slate-900 text-white">
                    {contract.title} • {contract.contractType}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">Bağımsız Bölüm</label>
              <select
                {...chequeForm.register("propertyUnitId", {
                  setValueAs: (value: string) => (value ? Number(value) : undefined),
                })}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
              >
                <option value="" className="bg-slate-900 text-white">
                  Daire / Bölüm seçin
                </option>
                {referenceData.propertyUnits.map((unit) => (
                  <option key={unit.id} value={unit.id} className="bg-slate-900 text-white">
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">Amaç</label>
              <select
                {...chequeForm.register("purpose")}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
              >
                <option value="" className="bg-slate-900 text-white">
                  Seçiniz
                </option>
                {chequePurposeValues.map((purpose) => (
                  <option key={purpose} value={purpose} className="bg-slate-900 text-white">
                    {purposeLabels[purpose]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Banka</label>
                <input
                  type="text"
                  {...chequeForm.register("bankName")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                  placeholder="Örn. Ziraat Bankası"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Şube</label>
                <input
                  type="text"
                  {...chequeForm.register("bankBranch")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                  placeholder="Örn. Karşıyaka Şubesi"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Şehir</label>
                <input
                  type="text"
                  {...chequeForm.register("bankCity")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Hesap No</label>
                <input
                  type="text"
                  {...chequeForm.register("bankAccount")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">IBAN</label>
                <input
                  type="text"
                  {...chequeForm.register("iban")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                  placeholder="TRXX XXXX XXXX XXXX XXXX XXXX"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Seri / Çek No</label>
                <input
                  type="text"
                  {...chequeForm.register("serialNumber")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Ciro Eden</label>
                <input
                  type="text"
                  {...chequeForm.register("endorsedBy")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Keşide Yeri</label>
                <input
                  type="text"
                  {...chequeForm.register("issuePlace")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Durum</label>
                <select
                  {...chequeForm.register("status")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                >
                  {chequeStatusValues.map((status) => (
                    <option key={status} value={status} className="bg-slate-900 text-white">
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Tür</label>
                <select
                  {...chequeForm.register("type")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                >
                  {chequeTypeValues.map((type) => (
                    <option key={type} value={type} className="bg-slate-900 text-white">
                      {type === "CHEQUE" ? "Çek" : "Senet"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Düzenleyen</label>
                <input
                  type="text"
                  {...chequeForm.register("issuer")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                  placeholder="Çeki düzenleyen"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Alıcı</label>
                <input
                  type="text"
                  {...chequeForm.register("recipient")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                  placeholder="Çeki alan kişi/kurum"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">Ortak / Yetkili</label>
              <select
                {...chequeForm.register("memberId", {
                  setValueAs: (value: string) => (value ? Number(value) : undefined),
                })}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
              >
                <option value="" className="bg-slate-900 text-white">
                  Kişi seçin
                </option>
                {referenceData.members.map((member) => (
                  <option key={member.id} value={member.id} className="bg-slate-900 text-white">
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">Notlar</label>
              <textarea
                rows={3}
                {...chequeForm.register("notes")}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                placeholder="Ek bilgi, hatırlatma detayları..."
              />
            </div>

            <button
              type="submit"
              disabled={chequeForm.formState.isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500/80 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {chequeForm.formState.isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Kaydı Oluştur
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
              <CalendarClock className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                14 Günlük Takvim
              </h2>
              <p className="text-xs text-slate-400">Yaklaşan çek ve senetler</p>
            </div>
          </div>
          <div className="space-y-3">
            {upcomingCheques.length ? (
              upcomingCheques.map((cheque) => (
                <div key={cheque.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
                  <div className="flex items-center justify-between text-white">
                    <span>{formatCurrency(cheque.amount)}</span>
                    <span className="text-xs text-amber-300">{formatDate(cheque.dueDate)}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-300">
                    {cheque.contract?.title ?? cheque.recipient ?? "-"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Hatırlatma: {formatDate(cheque.remindAt)} • {cheque.project?.name ?? "Genel"}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.01] p-6 text-center text-xs text-slate-400">
                Yaklaşan ödeme bulunmuyor.
              </div>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}
