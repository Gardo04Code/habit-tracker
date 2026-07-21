import { Bar, BarChart, Cell, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Repeat } from "lucide-react";
import { ChartContainer } from "../charts/ChartContainer";
import { EmptyState } from "../ui/EmptyState";

interface HabitComparisonEntry {
  habitId: string;
  habitName: string;
  color: string;
  completionRate: number;
}

interface HabitComparisonChartProps {
  data: HabitComparisonEntry[];
}

export function HabitComparisonChart({ data }: HabitComparisonChartProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<Repeat size={20} aria-hidden="true" />}
        title="Selecciona todos los hábitos"
        description='La comparación entre hábitos solo está disponible cuando el filtro de hábito está en "Todos los hábitos".'
      />
    );
  }

  return (
    <ChartContainer height={Math.max(180, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke="var(--color-border)" />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
        />
        <YAxis
          type="category"
          dataKey="habitName"
          width={140}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--color-text-primary)" }}
        />
        <Tooltip
          cursor={{ fill: "var(--color-surface-muted)" }}
          contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", fontSize: 13 }}
          formatter={(value) => [`${value}%`, "Cumplimiento"]}
        />
        <Bar dataKey="completionRate" radius={[0, 6, 6, 0]} maxBarSize={20}>
          {data.map((entry) => (
            <Cell key={entry.habitId} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
