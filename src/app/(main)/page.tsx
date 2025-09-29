import {
  Building2,
  FileStack,
  HandCoins,
  LayoutDashboard,
  Receipt,
  ScrollText,
} from "lucide-react";

import { StatCard } from "@/components/ui/stat-card";
import { ExpenseTrendChart } from "@/components/charts/expense-trend-chart";
import { formatCurrency, formatDate } from "@/lib/format";
import { getDashboardSummary } from "@/server/dashboard";

const statusMap: Record<string, string> = {
  PLANNING: "Planlama",
  IN_PROGRESS: "Devam ediyor",
  ON_HOLD: "Beklemede",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <div className="space-y-10">
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Toplam Proje"
          value={summary.totals.projects.toString()}
          subtitle={`${summary.totals.activeProjects} aktif proje`}
          icon={LayoutDashboard}
          accent="sky"
        />
        <StatCard
          title="Masraf Toplamı"
          value={formatCurrency(summary.totals.expenses)}
          subtitle="Son 6 ay içindeki kayıtlar"
          icon={Receipt}
          accent="emerald"
        />
        <StatCard
          title="Aktif Çek/Senet"
          value={`${summary.upcomingCheques.length} adet`}
          subtitle="Önümüzdeki 14 güne odaklanın"
          icon={ScrollText}
          accent="amber"
        />
        <StatCard
          title="Doküman Arşivi"
          value={summary.totals.documents.toString()}
          subtitle={`${summary.totals.contracts} sözleşme kaydı`}
          icon={FileStack}
          accent="violet"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">
            Ay Bazlı Masraf Trendleri
          </h2>
          <ExpenseTrendChart data={summary.monthlyExpenses} />
        </div>
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Yaklaşan Çek / Senet
            </h2>
            <span className="text-xs text-slate-400">14 gün içinde</span>
          </div>
          <div className="space-y-3">
            {summary.upcomingCheques.length ? (
              summary.upcomingCheques.map((cheque: (typeof summary.upcomingCheques)[number]) => (
                <div
                  key={cheque.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-inner shadow-black/20"
                >
                  <div className="flex items-center justify-between text-sm font-medium text-white">
                    <span>{formatCurrency(cheque.amount)}</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                      {formatDate(cheque.dueDate)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-300">
                    {cheque.issuer ?? "Bilinmeyen kesici"} → {cheque.recipient ?? "Alıcı belirsiz"}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-sky-300">
                    {cheque.project?.name ?? "Genel"}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center text-sm text-slate-400">
                Yaklaşan kayıt bulunmuyor. Hatırlatmaları netleştirmek için çek/senet
                modülünü kullanın.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/20">
              <Building2 className="h-5 w-5 text-sky-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Proje İlerlemeleri
              </h2>
              <p className="text-xs text-slate-400">
                Güncel durum ve tamamlanma yüzdeleri
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {summary.projectProgress.map((project: (typeof summary.projectProgress)[number]) => (
              <div key={project.id} className="space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between text-sm font-medium text-white">
                  <span>{project.name}</span>
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    {statusMap[project.status] ?? project.status}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400">%{project.progress} tamamlandı</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
              <HandCoins className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Son Masraflar
              </h2>
              <p className="text-xs text-slate-400">
                OCR ile işlenmiş son 20 kayıt
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {summary.recentExpenses.map((expense: (typeof summary.recentExpenses)[number]) => (
              <div
                key={expense.id}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-white">{expense.title}</p>
                  <p className="text-xs text-slate-400">
                    {formatDate(expense.incurredAt)} • {expense.category}
                  </p>
                </div>
                <span className="font-semibold text-emerald-300">
                  {formatCurrency(expense.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
