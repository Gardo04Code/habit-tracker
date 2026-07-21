import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import type { WeeklyProgressPoint } from "../../types/dashboard";
import { ChartContainer } from "../charts/ChartContainer";

interface EvolutionLineChartProps {
  data: WeeklyProgressPoint[];
}

export function EvolutionLineChart({ data }: EvolutionLineChartProps) {
  const showEveryNthTick = Math.ceil(data.length / 10);

  return (
    <ChartContainer>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
        <Line
          type="monotone"
          dataKey="completionRate"
          stroke="var(--color-primary)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
