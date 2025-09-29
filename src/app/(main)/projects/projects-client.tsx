"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArchiveRestore,
  Building2,
  ClipboardList,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import useSWR from "swr";
import type { z } from "zod";

import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatDate } from "@/lib/format";
import { fetcher } from "@/lib/swr";
import {
  createProgressLogSchema,
  createProjectSchema,
  projectStatusValues,
} from "@/lib/validators";
import type { ProjectSummary } from "@/types/api";

type ProjectStatus = (typeof projectStatusValues)[number];

const statusLabels: Record<ProjectStatus, string> = {
  PLANNING: "Planlama",
  IN_PROGRESS: "Devam ediyor",
  ON_HOLD: "Beklemede",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal edildi",
};

type ProjectFormValues = z.infer<typeof createProjectSchema>;
type ProgressFormValues = z.infer<typeof createProgressLogSchema>;

const isProjectStatus = (value: string | null | undefined): value is ProjectStatus =>
  value != null && projectStatusValues.includes(value as ProjectStatus);

const toProjectStatus = (value: string | null | undefined): ProjectStatus | undefined =>
  isProjectStatus(value) ? value : undefined;

const getStatusLabel = (value: string | null | undefined): string => {
  const status = toProjectStatus(value);
  return status ? statusLabels[status] : value ?? "-";
};

interface ProjectsClientProps {
  initialProjects: ProjectSummary[];
}

export function ProjectsClient({ initialProjects }: ProjectsClientProps) {
  const { data: projects = [], mutate, isLoading } = useSWR<ProjectSummary[]>(
    "/api/projects",
    fetcher<ProjectSummary[]>,
    {
      fallbackData: initialProjects,
    },
  );

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    projects.at(0)?.id ?? null,
  );
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const projectForm = useForm<ProjectFormValues>({
    resolver: zodResolver(createProjectSchema) as Resolver<ProjectFormValues>,
    defaultValues: {
      progress: 0,
      status: "PLANNING",
    } satisfies Partial<ProjectFormValues>,
  });

  const progressForm = useForm<ProgressFormValues>({
    resolver: zodResolver(createProgressLogSchema) as Resolver<ProgressFormValues>,
    defaultValues: {
      projectId: selectedProject?.id,
      progress: selectedProject?.progress ?? 0,
      summary: "",
      status: toProjectStatus(selectedProject?.status),
    } satisfies Partial<ProgressFormValues>,
  });

  async function onCreateProject(values: ProjectFormValues) {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error ?? "Proje oluşturulamadı");
    }

    projectForm.reset();
    await mutate();
  }

  async function onProgressSubmit(values: ProgressFormValues) {
    if (!selectedProject) return;

    const response = await fetch(`/api/projects/${selectedProject.id}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...values, recordedAt: values.recordedAt ?? new Date() }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error ?? "İlerleme kaydedilemedi");
    }

    await mutate();
    progressForm.reset();
  }

  const totalBudget = projects.reduce((acc, project) => acc + (project.budget ?? 0), 0);
  const totalActual = projects.reduce((acc, project) => acc + (project.actualCost ?? 0), 0);
  const totalExpense = projects.reduce((acc, project) => acc + project.totalExpense, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Toplam Bütçe"
            value={formatCurrency(totalBudget)}
            subtitle="Projelerde tanımlı toplam bütçe"
            icon={Building2}
            accent="sky"
          />
          <StatCard
            title="Harcanan"
            value={formatCurrency(totalActual || totalExpense)}
            subtitle="Gerçekleşen veya işlenen masraflar"
            icon={ClipboardList}
            accent="emerald"
          />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 text-sm font-semibold uppercase tracking-wide text-slate-200">
            <span>Proje Listesi</span>
            <button
              type="button"
              onClick={() => mutate()}
              className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:border-sky-400/60 hover:text-white"
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Yenile
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {isLoading && !projects.length ? (
              <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" /> Proje verileri yükleniyor...
              </div>
            ) : null}
            {projects.map((project) => {
              const budget = formatCurrency(project.budget);
              const expense = formatCurrency(project.totalExpense);
              const difference = formatCurrency(
                (project.budget ?? project.totalExpense) - project.totalExpense,
              );

              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    setSelectedProjectId(project.id);
                    progressForm.reset({
                      projectId: project.id,
                      progress: project.progress,
                      status: toProjectStatus(project.status),
                      summary: "",
                    });
                  }}
                  className="flex w-full flex-col gap-3 px-6 py-5 text-left transition hover:bg-white/[0.04]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-white">{project.name}</h3>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        {project.code ?? "Kodsuz"} • {getStatusLabel(project.status)}
                      </p>
                    </div>
                    <div className="text-right text-sm text-slate-300">
                      <p>Bütçe: {budget}</p>
                      <p>Masraf: {expense}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="w-48 text-xs text-slate-400">
                      Başlangıç: {formatDate(project.startDate)}
                    </div>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <div className="w-20 text-right text-sm font-semibold text-sky-300">
                      %{project.progress}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span>Bitiş: {formatDate(project.endDate)}</span>
                    <span>Masraf Farkı: {difference}</span>
                    <span>
                      {project.counts.expenses} masraf • {project.counts.salesContracts} sözleşme
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/20">
              <ArchiveRestore className="h-5 w-5 text-sky-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Yeni Proje
              </h2>
              <p className="text-xs text-slate-400">Temel bilgileri doldurup süreci başlatın.</p>
            </div>
          </div>
          <form
            onSubmit={projectForm.handleSubmit(async (values) => {
              try {
                await onCreateProject(values);
              } catch (error) {
                const message = error instanceof Error ? error.message : "Bilinmeyen hata";
                projectForm.setError("name", { message });
              }
            })}
            className="mt-4 space-y-4"
          >
            <div className="grid gap-3">
              <label className="text-xs font-medium uppercase tracking-wider text-slate-300">
                Proje Adı
              </label>
              <input
                type="text"
                {...projectForm.register("name")}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                placeholder="Örn. Alsancak Rezidans"
              />
              {projectForm.formState.errors.name ? (
                <p className="text-xs text-rose-400">
                  {projectForm.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">
                  Proje Kodu
                </label>
                <input
                  type="text"
                  {...projectForm.register("code")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                  placeholder="PRJ-2025"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">
                  Proje Sorumlusu
                </label>
                <input
                  type="text"
                  {...projectForm.register("managerName")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                  placeholder="Ad Soyad"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">
                  Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  {...projectForm.register("startDate")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">
                  Bitiş Tarihi
                </label>
                <input
                  type="date"
                  {...projectForm.register("endDate")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">
                  Bütçe (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...projectForm.register("budget")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">
                  Konum
                </label>
                <input
                  type="text"
                  {...projectForm.register("location")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                  placeholder="İzmir / Karşıyaka"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">
                Proje Durumu
              </label>
              <select
                {...projectForm.register("status", {
                  setValueAs: (value: string) =>
                    value === "" ? undefined : (value as ProjectStatus),
                })}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
              >
                {projectStatusValues.map((status) => (
                  <option key={status} value={status} className="bg-slate-900 text-white">
                    {statusLabels[status] ?? status}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">
                Açıklama
              </label>
              <textarea
                rows={3}
                {...projectForm.register("description")}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                placeholder="Şantiye notları, kapsam, kritik tarihler..."
              />
            </div>

            <button
              type="submit"
              disabled={projectForm.formState.isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500/80 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {projectForm.formState.isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Proje Oluştur
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
              <ClipboardList className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                İlerleme Kaydı
              </h2>
              <p className="text-xs text-slate-400">
                Seçili proje için son durum bilgisini paylaşın.
              </p>
            </div>
          </div>

          {selectedProject ? (
            <form
              onSubmit={progressForm.handleSubmit(async (values) => {
                try {
                  await onProgressSubmit(values);
                } catch (error) {
                  const message = error instanceof Error ? error.message : "Bilinmeyen hata";
                  progressForm.setError("summary", { message });
                }
              })}
              className="mt-4 space-y-4"
            >
              <div className="grid gap-1 text-xs text-slate-400">
                <span className="font-semibold text-slate-200">{selectedProject.name}</span>
                <span>Kod: {selectedProject.code ?? "-"}</span>
              </div>

              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">
                  Yeni Durum
                </label>
                <select
                  {...progressForm.register("status", {
                    setValueAs: (value: string) =>
                      value === "" ? undefined : (value as ProjectStatus),
                  })}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                >
                  <option value="">Değişiklik yok</option>
                  {projectStatusValues.map((status) => (
                    <option key={status} value={status} className="bg-slate-900 text-white">
                      {statusLabels[status] ?? status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">
                  Tamamlanma (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  {...progressForm.register("progress", { valueAsNumber: true })}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">
                  Özet
                </label>
                <textarea
                  rows={3}
                  {...progressForm.register("summary")}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white"
                  placeholder="Şantiye ilerlemesi, malzeme teslimleri vb."
                />
                {progressForm.formState.errors.summary ? (
                  <p className="text-xs text-rose-400">
                    {progressForm.formState.errors.summary.message}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={progressForm.formState.isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/80 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {progressForm.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Kaydet
              </button>
            </form>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-slate-400">
              Bir proje seçin ve ilerleme kaydını buradan yönetin.
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
