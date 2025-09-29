"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  ClipboardSignature,
  Home,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import useSWR from "swr";
import type { z } from "zod";

import { StatCard } from "@/components/ui/stat-card";
import { formatDate } from "@/lib/format";
import { fetcher } from "@/lib/swr";
import {
  createPropertyUnitSchema,
  propertyUnitStatusValues,
} from "@/lib/validators";
import type { PropertyUnitDTO } from "@/types/api";

const statusLabels: Record<(typeof propertyUnitStatusValues)[number], string> = {
  AVAILABLE: "Uygun",
  RESERVED: "Rezerve",
  SOLD: "Satıldı",
  DELIVERED: "Teslim Edildi",
  TRANSFERRED: "Devredildi",
};

type PropertyUnitFormValues = z.infer<typeof createPropertyUnitSchema>;

interface PropertyUnitsClientProps {
  initialUnits: PropertyUnitDTO[];
  projects: Array<{ id: number; name: string }>;
}

export function PropertyUnitsClient({ initialUnits, projects }: PropertyUnitsClientProps) {
  const { data: units = [], mutate, isLoading } = useSWR<PropertyUnitDTO[]>(
    "/api/property-units",
    fetcher<PropertyUnitDTO[]>,
    {
      fallbackData: initialUnits,
    },
  );

  const [statusFilter, setStatusFilter] = useState<string>("");

  const unitForm = useForm<PropertyUnitFormValues>({
    resolver: zodResolver(createPropertyUnitSchema) as Resolver<PropertyUnitFormValues>,
    defaultValues: {
      status: "AVAILABLE",
    } satisfies Partial<PropertyUnitFormValues>,
  });

  async function onCreateUnit(values: PropertyUnitFormValues) {
    const response = await fetch("/api/property-units", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error ?? "Bağımsız bölüm oluşturulamadı");
    }

    unitForm.reset({ status: "AVAILABLE" });
    void mutate();
  }

  async function updateStatus(id: number, status: PropertyUnitDTO["status"]) {
    const response = await fetch(`/api/property-units/${id}`, {
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

  const filteredUnits = useMemo(() => {
    if (!statusFilter) return units;
    return units.filter((unit) => unit.status === statusFilter);
  }, [units, statusFilter]);

  const totalSold = units.filter((unit) => unit.status === "SOLD").length;
  const totalAvailable = units.filter((unit) => unit.status === "AVAILABLE").length;
  const reservedCount = units.filter((unit) => unit.status === "RESERVED").length;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Toplam Satış"
            value={`${totalSold}`}
            subtitle="Tamamlanan sözleşmeler"
            icon={Home}
            accent="emerald"
          />
          <StatCard
            title="Rezerve"
            value={`${reservedCount}`}
            subtitle="Bekleyen teslimatlar"
            icon={ClipboardSignature}
            accent="amber"
          />
          <StatCard
            title="Uygun"
            value={`${totalAvailable}`}
            subtitle="Pazarlamaya açık daire sayısı"
            icon={Building2}
            accent="sky"
          />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-6 py-4 text-sm font-semibold uppercase tracking-wide text-slate-200">
            <span>Bağımsız Bölümler</span>
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
                {propertyUnitStatusValues.map((status) => (
                  <option key={status} value={status} className="bg-slate-900 text-white">
                    {statusLabels[status]}
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
            {isLoading && !units.length ? (
              <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" /> Bağımsız bölümler yükleniyor...
              </div>
            ) : null}
            {filteredUnits.map((unit) => (
              <div key={unit.id} className="flex flex-col gap-4 px-6 py-5 transition hover:bg-white/[0.04]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{unit.name}</h3>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      {unit.block ?? "Blok"} • {unit.floor ?? "Kat"} • {unit.unitNumber ?? "No"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      {statusLabels[unit.status as keyof typeof statusLabels] ?? unit.status}
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-white">
                      {projects.find((project) => project.id === unit.projectId)?.name ?? "Genel"}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 text-xs text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <span className="font-semibold text-slate-300">Metrekare:</span> {unit.netArea ?? unit.grossArea ?? "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300">Alıcı:</span> {unit.ownerName ?? "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300">Sözleşme:</span> {unit.contracts?.at(0)?.title ?? "Tanımlı değil"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300">Teslim:</span> {formatDate(unit.handoverDate ?? null)}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  {propertyUnitStatusValues.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => void updateStatus(unit.id, status)}
                      className="rounded-full border border-white/10 px-3 py-1 transition hover:border-sky-400/60 hover:text-white"
                    >
                      {statusLabels[status]}
                    </button>
                  ))}
                  <span className="ml-auto text-slate-500">
                    Güncellendi: {formatDate(unit.updatedAt ?? null)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/20">
              <Home className="h-5 w-5 text-sky-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Yeni Bağımsız Bölüm
              </h2>
              <p className="text-xs text-slate-400">Tapu bilgilerini ve proje ilişkisini kaydedin.</p>
            </div>
          </div>

          <form
            onSubmit={unitForm.handleSubmit(async (values) => {
              try {
                await onCreateUnit(values);
              } catch (error) {
                const message = error instanceof Error ? error.message : "Bilinmeyen hata";
                unitForm.setError("name", { message });
              }
            })}
            className="mt-5 space-y-4"
          >
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">Adı / Tanımı</label>
              <input
                type="text"
                {...unitForm.register("name")}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                placeholder="Örn. A Blok 12 No"
              />
              {unitForm.formState.errors.name ? (
                <p className="text-xs text-rose-400">{unitForm.formState.errors.name.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">Proje</label>
              <select
                {...unitForm.register("projectId", {
                  setValueAs: (value: string) => Number(value),
                })}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id} className="bg-slate-900 text-white">
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Blok</label>
                <input
                  type="text"
                  {...unitForm.register("block")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Kat</label>
                <input
                  type="text"
                  {...unitForm.register("floor")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">No</label>
                <input
                  type="text"
                  {...unitForm.register("unitNumber")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Brüt m²</label>
                <input
                  type="number"
                  step="0.01"
                  {...unitForm.register("grossArea", { valueAsNumber: true })}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Net m²</label>
                <input
                  type="number"
                  step="0.01"
                  {...unitForm.register("netArea", { valueAsNumber: true })}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">Durum</label>
              <select
                {...unitForm.register("status")}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
              >
                {propertyUnitStatusValues.map((status) => (
                  <option key={status} value={status} className="bg-slate-900 text-white">
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">Alıcı Adı</label>
              <input
                type="text"
                {...unitForm.register("ownerName")}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">Alıcı İletişim</label>
              <input
                type="text"
                {...unitForm.register("ownerContact")}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Satın Alma</label>
                <input
                  type="date"
                  {...unitForm.register("purchaseDate")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Teslim</label>
                <input
                  type="date"
                  {...unitForm.register("handoverDate")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">Notlar</label>
              <textarea
                rows={3}
                {...unitForm.register("notes")}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                placeholder="Tapu numarası, bağımsız bölüm detayları..."
              />
            </div>

            <button
              type="submit"
              disabled={unitForm.formState.isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500/80 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {unitForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Kaydı Kaydet
            </button>
          </form>
        </section>
      </aside>
    </div>
  );
}
