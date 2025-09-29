"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

type ExpenseTrendChartProps = {
  data: Array<{ month: string; amount: number }>;
};

const tooltipFormatter = (value: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);

export function ExpenseTrendChart({ data }: ExpenseTrendChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] text-sm text-slate-400">
        Son 6 ay için yeterli veri yok.
      </div>
    );
  }

  return (
    <div className="h-64 w-full overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4" stroke="rgba(148, 163, 184, 0.2)" />
          <XAxis dataKey="month" stroke="#cbd5f5" tickLine={false} axisLine={false} />
          <YAxis
            stroke="#cbd5f5"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${Math.round(value / 1000)}K`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(15, 23, 42, 0.9)",
              borderRadius: "0.75rem",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              color: "#e2e8f0",
            }}
            formatter={(value: number) => [tooltipFormatter(value), "Tutar"]}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#38bdf8"
            strokeWidth={2.5}
            fill="url(#expenseGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
