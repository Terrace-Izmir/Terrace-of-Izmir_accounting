import { CalendarDays, Plus } from "lucide-react";
import Link from "next/link";

const formatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "full",
});

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-900/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex flex-col">
          <span className="text-sm uppercase tracking-widest text-sky-300">
            Terrace of İzmir
          </span>
          <h1 className="text-lg font-semibold text-white">
            Ön Muhasebe & Proje Yönetimi
          </h1>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
            <CalendarDays className="h-4 w-4" />
            <span>{formatter.format(new Date())}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/expenses"
            className="flex items-center gap-2 rounded-xl bg-sky-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-sky-500/40 transition hover:bg-sky-400/90"
          >
            <Plus className="h-4 w-4" />
            Yeni Masraf
          </Link>
          <Link
            href="/documents"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-sky-400/60 hover:text-white"
          >
            Dosya Yönetimi
          </Link>
        </div>
      </div>
    </header>
  );
}
