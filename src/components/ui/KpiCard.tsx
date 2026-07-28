import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Sparkline } from "./Sparkline";

export type KpiTone = "primary" | "success" | "info" | "danger" | "warning";

export interface KpiDelta {
  value: number;
  direction: "up" | "down";
}

interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  delta?: KpiDelta;
  deltaLabel?: string;
  trend: number[];
  tone: KpiTone;
  index?: number;
}

const TONE_CLASSES: Record<KpiTone, { badge: string; line: string }> = {
  primary: { badge: "bg-primary-muted text-primary", line: "var(--color-primary)" },
  success: { badge: "bg-success-muted text-success", line: "var(--color-success)" },
  info: { badge: "bg-info-muted text-info", line: "var(--color-info)" },
  danger: { badge: "bg-danger-muted text-danger", line: "var(--color-danger)" },
  warning: { badge: "bg-warning-muted text-warning", line: "var(--color-warning)" },
};

export function KpiCard({ icon, label, value, sublabel, delta, deltaLabel, trend, tone, index = 0 }: KpiCardProps) {
  const toneClasses = TONE_CLASSES[tone];
  const DeltaIcon = delta?.direction === "up" ? ArrowUp : ArrowDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="shadow-elevation-1 flex items-center gap-3 rounded-2xl border border-border bg-surface p-4"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClasses.badge}`} aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-text-secondary">{label}</p>
        <p className="text-xl font-bold text-text-primary">{value}</p>
        {delta ? (
          <p className={`flex items-center gap-1 text-xs ${delta.direction === "up" ? "text-success" : "text-danger"}`}>
            <DeltaIcon size={11} className="shrink-0" aria-hidden="true" />
            <span className="truncate">
              {Math.abs(delta.value)}
              {deltaLabel ?? "% vs. periodo anterior"}
            </span>
          </p>
        ) : (
          sublabel && <p className="truncate text-xs text-text-disabled">{sublabel}</p>
        )}
      </div>
      <Sparkline data={trend} color={toneClasses.line} width={64} height={28} className="hidden shrink-0 sm:block" />
    </motion.div>
  );
}
