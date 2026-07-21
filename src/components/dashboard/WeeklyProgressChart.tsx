import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import type { WeeklyProgressPoint } from "../../types/dashboard";
import { ChartContainer } from "../charts/ChartContainer";

interface WeeklyProgressChartProps {
  data: WeeklyProgressPoint[];
}

export function WeeklyProgressChart({ data }: WeeklyProgressChartProps) {
  return (
    <ChartContainer>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
          className="capitalize"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={36}
          domain={[0, 100]}
          tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
        />
        <Tooltip
          cursor={{ fill: "var(--color-surface-muted)" }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid var(--color-border)",
            fontSize: 13,
          }}
          formatter={(value) => [`${value}%`, "Cumplimiento"]}
        />
        <Bar dataKey="completionRate" fill="var(--color-primary)" radius={[6, 6, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ChartContainer>
  );
}
