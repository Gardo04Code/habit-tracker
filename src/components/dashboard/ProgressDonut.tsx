import { Cell, Pie, PieChart, Tooltip } from "recharts";
import type { StatusBreakdownPoint } from "../../types/dashboard";
import type { HabitStatus } from "../../types/habit";
import { getStatusColorVar, getStatusLabel } from "../../utils/habitStatus";
import { ChartContainer } from "../charts/ChartContainer";

interface ProgressDonutProps {
  data: StatusBreakdownPoint[];
}

export function ProgressDonut({ data }: ProgressDonutProps) {
  const total = data.reduce((sum, point) => sum + point.count, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ChartContainer height={180}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="status"
            innerRadius={54}
            outerRadius={78}
            paddingAngle={2}
            stroke="var(--color-surface)"
            strokeWidth={2}
          >
            {data.map((point) => (
              <Cell key={point.status} fill={getStatusColorVar(point.status)} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", fontSize: 13 }}
            formatter={(value, name) => [`${value} registros`, getStatusLabel(name as HabitStatus)]}
          />
        </PieChart>
      </ChartContainer>
      <ul className="flex flex-1 flex-col gap-2 text-sm">
        {data.map((point) => (
          <li key={point.status} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-text-secondary">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: getStatusColorVar(point.status) }}
                aria-hidden="true"
              />
              {getStatusLabel(point.status)}
            </span>
            <span className="font-medium text-text-primary">
              {point.count} · {total > 0 ? Math.round((point.count / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
