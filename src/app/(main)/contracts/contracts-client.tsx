"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FileText,
  HandPlatter,
  Loader2,
  RefreshCcw,
  ScrollText,
} from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import useSWR from "swr";
import type { z } from "zod";

import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatDate } from "@/lib/format";
import { fetcher } from "@/lib/swr";
import {
  contractStatusValues,
  createContractSchema,
  salesContractTypeValues,
} from "@/lib/validators";
import type { ContractReferenceData, ContractWithRelations } from "@/server/contracts";

const statusLabels: Record<(typeof contractStatusValues)[number], string> = {
  DRAFT: "Taslak",
  NEGOTIATION: "Görüşme",
  SIGNED: "İmzalandı",
  CLOSED: "Kapatıldı",
  CANCELLED: "İptal",
};

const contractTypeLabels: Record<(typeof salesContractTypeValues)[number], string> = {
  PROPERTY_SALE: "Gayrimenkul Satışı",
  MATERIAL_PURCHASE: "Malzeme Alımı",
  SERVICE: "Hizmet",
  OTHER: "Diğer",
};

type ContractFormValues = z.infer<typeof createContractSchema>;

interface ContractsClientProps {
  initialContracts: ContractWithRelations[];
  referenceData: ContractReferenceData;
}

export function ContractsClient({ initialContracts, referenceData }: ContractsClientProps) {
  const { data: contracts = [], mutate, isLoading } = useSWR<ContractWithRelations[]>(
    "/api/contracts",
    fetcher<ContractWithRelations[]>,
    {
      fallbackData: initialContracts,
    },
  );

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const contractForm = useForm<ContractFormValues>({
    resolver: zodResolver(createContractSchema) as Resolver<ContractFormValues>,
    defaultValues: {
      status: "DRAFT",
      contractType: "PROPERTY_SALE",
    } satisfies Partial<ContractFormValues>,
  });

  async function onCreateContract(values: ContractFormValues) {
    const response = await fetch("/api/contracts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error ?? "Sözleşme kaydedilemedi");
    }

    contractForm.reset({ status: "DRAFT", contractType: "PROPERTY_SALE" });
    void mutate();
  }

  async function updateStatus(id: number, status: ContractFormValues["status"]) {
    const response = await fetch(`/api/contracts/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error ?? "Durum güncellenemedi");
    }

    void mutate();
  }

  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      if (statusFilter && contract.status !== statusFilter) return false;
      if (typeFilter && contract.contractType !== typeFilter) return false;
      return true;
    });
  }, [contracts, statusFilter, typeFilter]);

  const totalSigned = contracts
    .filter((contract) => contract.status === "SIGNED" || contract.status === "CLOSED")
    .reduce((sum, contract) => sum + (contract.value ?? 0), 0);

  const propertySaleCount = contracts.filter(
    (contract) => contract.contractType === "PROPERTY_SALE",
  ).length;

  const materialOrderCount = contracts.filter(
    (contract) => contract.contractType === "MATERIAL_PURCHASE",
  ).length;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Toplam Değer"
            value={formatCurrency(totalSigned)}
            subtitle="İmzalanmış sözleşmeler"
            icon={HandPlatter}
            accent="emerald"
          />
          <StatCard
            title="Satış Sözleşmeleri"
            value={`${propertySaleCount}`}
            subtitle="Yap-sat kapsamı"
            icon={FileText}
            accent="sky"
          />
          <StatCard
            title="Malzeme Alımları"
            value={`${materialOrderCount}`}
            subtitle="Tedarik sözleşmeleri"
            icon={ScrollText}
            accent="amber"
          />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-6 py-4 text-sm font-semibold uppercase tracking-wide text-slate-200">
            <span>Sözleşme Kayıtları</span>
            <div className="ml-auto flex items-center gap-2 text-xs text-slate-300">
              <label className="uppercase tracking-wide">Durum</label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-xs text-white"
              >
                <option value="" className="bg-slate-900 text-white">
                  Tümü
                </option>
                {contractStatusValues.map((status) => (
                  <option key={status} value={status} className="bg-slate-900 text-white">
                    {statusLabels[status]}
                  </option>
                ))}
              </select>

              <label className="uppercase tracking-wide">Tür</label>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-xs text-white"
              >
                <option value="" className="bg-slate-900 text-white">
                  Tümü
                </option>
                {salesContractTypeValues.map((type) => (
                  <option key={type} value={type} className="bg-slate-900 text-white">
                    {contractTypeLabels[type]}
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

          <div className="divide-y divide-white/5">
            {isLoading && !contracts.length ? (
              <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" /> Sözleşme verileri yükleniyor...
              </div>
            ) : null}
            {filteredContracts.map((contract) => (
              <div key={contract.id} className="flex flex-col gap-4 px-6 py-5 transition hover:bg-white/[0.04]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{contract.title}</h3>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      {contract.clientName} • {contract.contractNumber ?? "Numara yok"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      {statusLabels[contract.status as keyof typeof statusLabels] ?? contract.status}
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-white">
                      {contractTypeLabels[contract.contractType as keyof typeof contractTypeLabels] ?? contract.contractType}
                    </span>
                    <span className="rounded-full border border-emerald-500/40 px-3 py-1 text-emerald-200">
                      {formatCurrency(contract.value ?? 0)}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 text-xs text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <span className="font-semibold text-slate-300">Proje:</span> {contract.project?.name ?? "Genel"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300">Bağımsız Bölüm:</span> {contract.propertyUnit?.name ?? "Atanmamış"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300">İmza:</span> {formatDate(contract.signedDate)}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300">Teslim:</span> {formatDate(contract.deliveryDate)}
                  </div>
                </div>

                {contract.notes ? (
                  <p className="text-xs text-slate-300">{contract.notes}</p>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  {contractStatusValues.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => void updateStatus(contract.id, status)}
                      className="rounded-full border border-white/10 px-3 py-1 transition hover:border-sky-400/60 hover:text-white"
                    >
                      {statusLabels[status]}
                    </button>
                  ))}
                  <span className="ml-auto text-slate-500">
                    Güncelleme: {formatDate(contract.updatedAt ?? null)}
                  </span>
                </div>

                {contract.cheques.length ? (
                  <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs text-slate-300">
                    <div className="mb-2 font-semibold text-sky-200">Bağlı Çek / Senet</div>
                    <ul className="space-y-1">
                      {contract.cheques.map((cheque) => (
                        <li key={cheque.id} className="flex items-center justify-between gap-3">
                          <span>{formatCurrency(cheque.amount)} • {formatDate(cheque.dueDate)}</span>
                          <span className="text-slate-400">{cheque.status}</span>
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
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
              <HandPlatter className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Yeni Sözleşme
              </h2>
              <p className="text-xs text-slate-400">Satış veya tedarik anlaşmalarını kaydedin.</p>
            </div>
          </div>

          <form
            onSubmit={contractForm.handleSubmit(async (values) => {
              try {
                await onCreateContract(values);
              } catch (error) {
                const message = error instanceof Error ? error.message : "Bilinmeyen hata";
                contractForm.setError("title", { message });
              }
            })}
            className="mt-5 space-y-4"
          >
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">Başlık</label>
              <input
                type="text"
                {...contractForm.register("title")}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                placeholder="Örn. 12 No Daire Satışı"
              />
              {contractForm.formState.errors.title ? (
                <p className="text-xs text-rose-400">{contractForm.formState.errors.title.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">Müşteri</label>
              <input
                type="text"
                {...contractForm.register("clientName")}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">Proje</label>
              <select
                {...contractForm.register("projectId", {
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
              <label className="text-xs uppercase tracking-wider text-slate-400">Bağımsız Bölüm</label>
              <select
                {...contractForm.register("propertyUnitId", {
                  setValueAs: (value: string) => (value ? Number(value) : undefined),
                })}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
              >
                <option value="" className="bg-slate-900 text-white">
                  Bölüm seçin
                </option>
                {referenceData.propertyUnits.map((unit) => (
                  <option key={unit.id} value={unit.id} className="bg-slate-900 text-white">
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Durum</label>
                <select
                  {...contractForm.register("status")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                >
                  {contractStatusValues.map((status) => (
                    <option key={status} value={status} className="bg-slate-900 text-white">
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Tür</label>
                <select
                  {...contractForm.register("contractType")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                >
                  {salesContractTypeValues.map((type) => (
                    <option key={type} value={type} className="bg-slate-900 text-white">
                      {contractTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">Sözleşme Numarası</label>
              <input
                type="text"
                {...contractForm.register("contractNumber")}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">Sözleşme Bedeli</label>
              <input
                type="number"
                step="0.01"
                {...contractForm.register("value", { valueAsNumber: true })}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">İmza Tarihi</label>
                <input
                  type="date"
                  {...contractForm.register("signedDate", {
                    setValueAs: (value: string) => (value ? new Date(value) : undefined),
                  })}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Teslim Tarihi</label>
                <input
                  type="date"
                  {...contractForm.register("deliveryDate", {
                    setValueAs: (value: string) => (value ? new Date(value) : undefined),
                  })}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Kapanış</label>
                <input
                  type="date"
                  {...contractForm.register("closingDate", {
                    setValueAs: (value: string) => (value ? new Date(value) : undefined),
                  })}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">Notlar</label>
              <textarea
                rows={3}
                {...contractForm.register("notes")}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                placeholder="Ödeme planı, teslim şartları, kritik maddeler..."
              />
            </div>

            <button
              type="submit"
              disabled={contractForm.formState.isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/80 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {contractForm.formState.isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Kaydı Oluştur
            </button>
          </form>
        </section>
      </aside>
    </div>
  );
}
