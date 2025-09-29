import type { ReactNode } from "react";
import {
  Building2,
  FileStack,
  HandPlatter,
  LayoutDashboard,
  Receipt,
  ScrollText,
  Users2,
} from "lucide-react";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopBar } from "@/components/layout/top-bar";

const NAV_ITEMS = [
  {
    label: "Kontrol Paneli",
    href: "/",
    icon: LayoutDashboard,
    description: "Finansal özet ve kritik göstergeler",
  },
  {
    label: "Projeler",
    href: "/projects",
    icon: Building2,
    description: "İlerleme, bütçe ve kârlılık takibi",
  },
  {
    label: "Masraflar",
    href: "/expenses",
    icon: Receipt,
    description: "Masraf yönetimi ve OCR kayıtları",
  },
  {
    label: "Çek / Senet",
    href: "/cheques",
    icon: ScrollText,
    description: "Yaklaşan ödemeler ve hatırlatmalar",
  },
  {
    label: "Adi Ortaklık",
    href: "/partnership",
    icon: Users2,
    description: "Ortak hareketleri ve dengeler",
  },
  {
    label: "Sözleşmeler",
    href: "/contracts",
    icon: HandPlatter,
    description: "Satış ve sözleşme takibi",
  },
  {
    label: "Dosya Merkezi",
    href: "/documents",
    icon: FileStack,
    description: "Şantiye ve finans dökümanları",
  },
] as const;

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <aside className="hidden w-80 shrink-0 border-r border-white/10 bg-slate-950/80 px-6 py-10 lg:flex lg:flex-col">
        <div className="mb-10">
          <div className="text-xs uppercase tracking-[0.4em] text-sky-400">
            Terrace of İzmir
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-white">
            Muhasebe Panosu
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Şantiye ekonomisi, satış süreçleri ve dokümanlar tek ekranda.
          </p>
        </div>
        <SidebarNav items={NAV_ITEMS} />
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">
            Hızlı Not
          </p>
          <p className="mt-2 text-sm text-slate-200">
            Masraf yüklerken dekont fotoğrafını ekleyin, OCR ile otomatik veri
            işleme aktifleşir.
          </p>
        </div>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 lg:px-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
