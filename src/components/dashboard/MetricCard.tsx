import type { ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import clsx from "clsx";
import { Card } from "../ui/Card";

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  helpText?: string;
  trendValue?: number;
  trendLabel?: string;
  tone?: "primary" | "success" | "purple" | "streak";
}

const TONE_CLASSES: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  primary: "bg-primary-muted text-primary",
  success: "bg-success-muted text-success",
  purple: "bg-purple-muted text-purple",
  streak: "bg-streak-muted text-streak",
};

export function MetricCard({ icon, label, value, helpText, trendValue, trendLabel, tone = "primary" }: MetricCardProps) {
  const hasTrend = trendValue !== undefined;
  const isPositive = (trendValue ?? 0) >= 0;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className={clsx("flex h-9 w-9 items-center justify-center rounded-lg", TONE_CLASSES[tone])}>
          {icon}
        </span>
        {hasTrend && (
          <span
            className={clsx(
              "flex items-center gap-1 text-xs font-medium",
              isPositive ? "text-success" : "text-danger",
            )}
          >
            {isPositive ? <TrendingUp size={14} aria-hidden="true" /> : <TrendingDown size={14} aria-hidden="true" />}
            {Math.abs(trendValue ?? 0)}
            {trendLabel}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-semibold text-text-primary">{value}</p>
        <p className="text-sm text-text-secondary">{label}</p>
      </div>
      {helpText && <p className="text-xs text-text-disabled">{helpText}</p>}
    </Card>
  );
}
