import { useId } from "react";
import { Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import clsx from "clsx";
import type { StreakTimelineItem as StreakTimelineItemData } from "../../types/streak";
import { formatFullDate } from "../../utils/formatDate";
import { getHabitAccent } from "../../utils/habitAccent";
import { getHabitIcon } from "../../utils/habitIcons";
import { CircularProgress } from "../ui/CircularProgress";
import { Tooltip } from "../ui/Tooltip";

interface StreakTimelineItemProps {
  item: StreakTimelineItemData;
  index: number;
  isMostRecent: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function StreakTimelineItem({ item, index, isMostRecent, isSelected, onSelect }: StreakTimelineItemProps) {
  const prefersReducedMotion = useReducedMotion();
  const headingId = useId();
  const accent = getHabitAccent(item.bestHabit.icon);
  const Icon = getHabitIcon(item.bestHabit.icon);

  return (
    <Tooltip
      content={
        <div className="flex flex-col gap-0.5">
          <p className="font-semibold text-text-primary">{formatFullDate(item.date)}</p>
          <p className="text-text-secondary">
            {item.completionPercentage}% de cumplimiento · Mejor hábito: {item.bestHabit.name}
          </p>
          {item.bestHabit.value !== undefined && item.bestHabit.target !== undefined && (
            <p className="text-text-secondary">
              {item.bestHabit.value} / {item.bestHabit.target} {item.bestHabit.unit ?? ""}
            </p>
          )}
        </div>
      }
    >
      <motion.button
        type="button"
        role="listitem"
        aria-labelledby={headingId}
        aria-pressed={isSelected}
        onClick={() => onSelect(item.id)}
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
        whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.35, delay: prefersReducedMotion ? 0 : index * 0.08, ease: [0.16, 1, 0.3, 1] }}
        whileHover={prefersReducedMotion ? undefined : { y: -4 }}
        className={clsx(
          "group relative flex w-[150px] shrink-0 snap-center flex-col items-center gap-3 rounded-2xl border px-3 py-4 text-left transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          isSelected
            ? "border-border-strong bg-surface-elevated shadow-elevation-3"
            : "border-border bg-surface hover:border-border-strong hover:bg-surface-muted",
        )}
        style={{ willChange: "transform" }}
      >
        <div className="relative">
          <CircularProgress
            percentage={item.completionPercentage}
            size={76}
            strokeWidth={5}
            color={accent.base}
            glow={accent.glow}
            delay={prefersReducedMotion ? 0 : index * 0.08 + 0.15}
          >
            {isMostRecent && !prefersReducedMotion && (
              <motion.span
                className="absolute h-12 w-12 rounded-full"
                style={{ backgroundColor: accent.glow }}
                animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden="true"
              />
            )}
            <span id={headingId} className="relative text-xl font-bold text-text-primary">
              {item.streakNumber}
            </span>
          </CircularProgress>
          <span
            className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-success text-white shadow-elevation-1"
            aria-hidden="true"
          >
            <Check size={12} strokeWidth={3} />
          </span>
        </div>

        <div
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl shadow-elevation-2"
          style={{
            background: `linear-gradient(145deg, ${accent.light}, ${accent.base})`,
            boxShadow: `0 6px 16px -4px ${accent.glow}, inset 0 1px 1px rgba(255,255,255,0.4)`,
          }}
          aria-hidden="true"
        >
          <div className="absolute inset-x-1.5 top-1 h-1/3 rounded-full bg-white/30 blur-[2px]" />
          {/* eslint-disable-next-line react-hooks/static-components -- getHabitIcon resolves a stable reference from a static icon map, it never defines a new component type. */}
          <Icon size={20} className="relative text-white drop-shadow-sm" strokeWidth={2.2} />
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-xs font-medium text-text-secondary">Día {item.streakNumber}</p>
          <p className="text-[11px] text-text-disabled">Mejor hábito</p>
          <p className="max-w-[140px] truncate text-sm font-semibold" style={{ color: accent.base }}>
            {item.bestHabit.name}
          </p>
          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
            {item.bestHabit.completionPercentage}% hábitos
          </span>
        </div>
      </motion.button>
    </Tooltip>
  );
}
