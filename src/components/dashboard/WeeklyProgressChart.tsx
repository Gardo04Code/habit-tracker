import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LabelProps as RechartsLabelProps, XAxisTickContentProps } from "recharts";
import type { WeeklyProgressPoint } from "../../types/dashboard";
import { formatShortDate } from "../../utils/formatDate";
import { getPerformanceColor, lightenHex, normalizeInRange } from "../../utils/chartColors";
import { ChartContainer } from "../charts/ChartContainer";

interface WeeklyProgressChartProps {
  data: WeeklyProgressPoint[];
  goal?: number;
}

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
}

const BAR_SIZE = 26;
const BAR_RADIUS = BAR_SIZE / 2;

export function WeeklyProgressChart({ data, goal }: WeeklyProgressChartProps) {
  const values = data.map((point) => point.completionRate);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const colors = values.map((value) => getPerformanceColor(normalizeInRange(value, min, max)));

  function renderXAxisTick({ x, y, index, payload }: XAxisTickContentProps) {
    const point = data[index];
    if (!point) return <g />;
    return (
      <g transform={`translate(${x},${y})`}>
        <text dy={14} textAnchor="middle" fontSize={12} fill="var(--color-text-secondary)" className="capitalize">
          {String(payload.value)}
        </text>
        <text dy={29} textAnchor="middle" fontSize={10} fill="var(--color-text-disabled)">
          {formatShortDate(point.date)}
        </text>
      </g>
    );
  }

  function renderValueLabel({ x, y, width, value, index }: RechartsLabelProps) {
    if (x === undefined || y === undefined || width === undefined || value === undefined || index === undefined) {
      return <g />;
    }
    const color = colors[index];
    const cx = Number(x) + Number(width) / 2;
    const cy = Number(y) - 17;
    return (
      <g>
        <rect x={cx - 20} y={cy - 11} width={40} height={22} rx={11} fill="var(--color-surface-elevated)" stroke={color} strokeWidth={1.4} />
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight={700} fill={color}>
          {value}%
        </text>
      </g>
    );
  }

  function renderDot({ cx, cy, index }: DotProps) {
    if (cx === undefined || cy === undefined || index === undefined) return <g />;
    const color = colors[index];
    return (
      <g key={`dot-${index}`}>
        <circle cx={cx} cy={cy} r={7} fill={color} opacity={0.28} />
        <circle cx={cx} cy={cy} r={3.5} fill={color} stroke="var(--color-surface-elevated)" strokeWidth={1.5} />
      </g>
    );
  }

  return (
    <div>
      {goal !== undefined && (
        <div className="mb-1 flex justify-end">
          <span className="rounded-full border border-border-strong bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
            Meta {goal}%
          </span>
        </div>
      )}
      <ChartContainer height={240}>
        <ComposedChart data={data} margin={{ top: 30, right: 12, left: 0, bottom: 4 }}>
          <defs>
            {data.map((point, index) => (
              <linearGradient key={point.date} id={`weekly-bar-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lightenHex(colors[index], 0.3)} />
                <stop offset="100%" stopColor={colors[index]} />
              </linearGradient>
            ))}
            <linearGradient id="weekly-line-gradient" x1="0" y1="0" x2="1" y2="0">
              {colors.map((color, index) => (
                <stop key={index} offset={`${(index / Math.max(1, colors.length - 1)) * 100}%`} stopColor={color} />
              ))}
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={renderXAxisTick} height={40} interval={0} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={36}
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--color-surface-muted)" }}
            contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", fontSize: 13 }}
            formatter={(value) => [`${value}%`, "Cumplimiento"]}
          />
          {goal !== undefined && (
            <ReferenceLine y={goal} stroke="var(--color-text-disabled)" strokeDasharray="4 4" strokeOpacity={0.7} />
          )}
          <Bar dataKey="completionRate" radius={[BAR_RADIUS, BAR_RADIUS, BAR_RADIUS, BAR_RADIUS]} maxBarSize={BAR_SIZE} isAnimationActive={false}>
            {data.map((point, index) => (
              <Cell key={point.date} fill={`url(#weekly-bar-${index})`} />
            ))}
            <LabelList dataKey="completionRate" content={renderValueLabel} />
          </Bar>
          <Line
            type="monotone"
            dataKey="completionRate"
            stroke="url(#weekly-line-gradient)"
            strokeWidth={2.5}
            dot={renderDot}
            activeDot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}
