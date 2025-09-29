import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  accent?: "sky" | "cyan" | "emerald" | "violet" | "amber";
}

const accentMap: Record<NonNullable<StatCardProps["accent"]>, string> = {
  sky: "from-sky-500/90 to-sky-700/60",
  cyan: "from-cyan-500/90 to-cyan-700/60",
  emerald: "from-emerald-500/90 to-emerald-700/60",
  violet: "from-violet-500/90 to-violet-700/60",
  amber: "from-amber-500/90 to-amber-700/60",
};

export function StatCard({ title, value, subtitle, icon: Icon, accent = "sky" }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-6 shadow-xl shadow-black/30">
      <div
        className={`absolute inset-0 -z-10 bg-gradient-to-br ${accentMap[accent]} opacity-10`}
      />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-300">
            {title}
          </p>
          <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
          {subtitle ? (
            <p className="mt-2 text-xs text-slate-300">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}
