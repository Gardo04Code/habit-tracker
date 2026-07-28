import { useState } from "react";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import clsx from "clsx";
import type { WeeklyProgressPoint } from "../../types/dashboard";
import { ChartContainer } from "../charts/ChartContainer";

interface EvolutionLineChartProps {
  data: WeeklyProgressPoint[];
}

type Granularity = "daily" | "weekly";

function toWeeklyAverages(data: WeeklyProgressPoint[]): WeeklyProgressPoint[] {
  const buckets: WeeklyProgressPoint[][] = [];
  for (let index = 0; index < data.length; index += 7) {
    buckets.push(data.slice(index, index + 7));
  }
  return buckets.map((bucket, index) => ({
    date: bucket[0].date,
    label: `Sem. ${index + 1}`,
    completionRate: Math.round(bucket.reduce((sum, point) => sum + point.completionRate, 0) / bucket.length),
  }));
}

export function EvolutionLineChart({ data }: EvolutionLineChartProps) {
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const canAggregate = data.length > 10;
  const chartData = granularity === "weekly" && canAggregate ? toWeeklyAverages(data) : data;
  const showEveryNthTick = Math.ceil(chartData.length / 10);

  return (
    <div>
      {canAggregate && (
        <div className="mb-2 flex justify-end">
          <div className="flex gap-1 rounded-lg bg-surface-muted p-1" role="group" aria-label="Cambiar granularidad">
            {(["daily", "weekly"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setGranularity(option)}
                className={clsx(
                  "shadow-elevation-1 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  granularity === option ? "bg-surface text-text-primary" : "text-text-secondary shadow-none",
                )}
              >
                {option === "daily" ? "Diario" : "Semanal"}
              </button>
            ))}
          </div>
        </div>
      )}
      <ChartContainer>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="evolution-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={showEveryNthTick - 1}
            tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
            className="capitalize"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={36}
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
          />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", fontSize: 13 }}
            formatter={(value) => [`${value}%`, "Cumplimiento"]}
          />
          <Area
            type="monotone"
            dataKey="completionRate"
            stroke="var(--color-primary)"
            strokeWidth={2.5}
            fill="url(#evolution-fill)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
