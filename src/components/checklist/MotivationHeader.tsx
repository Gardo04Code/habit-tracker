import { ChevronLeft, ChevronRight, Flame, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { formatFullDate, isToday } from "../../utils/formatDate";
import { getDailyMotivationalMessage, getGreeting } from "../../utils/checklistMotivation";
import { CircularProgress } from "../ui/CircularProgress";
import { IconButton } from "../ui/IconButton";
import { Button } from "../ui/Button";

interface MotivationHeaderProps {
  userName: string;
  date: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  completionPercentage: number;
  completedCount: number;
  totalCount: number;
  currentStreak: number;
  personalRecord: number;
}

export function MotivationHeader({
  userName,
  date,
  onPrevious,
  onNext,
  onToday,
  completionPercentage,
  completedCount,
  totalCount,
  currentStreak,
  personalRecord,
}: MotivationHeaderProps) {
  const pendingCount = Math.max(0, totalCount - completedCount);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="glass-surface shadow-elevation-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-surface-elevated to-surface-elevated p-5"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text-primary sm:text-xl">
            {getGreeting()}, {userName.split(" ")[0]} 👋
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">Hoy es {formatFullDate(date)}</p>
        </div>

        <div className="flex items-center gap-1.5">
          {!isToday(date) && (
            <Button variant="secondary" size="sm" onClick={onToday}>
              Hoy
            </Button>
          )}
          <IconButton icon={<ChevronLeft size={16} />} label="Día anterior" variant="secondary" onClick={onPrevious} />
          <IconButton icon={<ChevronRight size={16} />} label="Día siguiente" variant="secondary" onClick={onNext} />
        </div>
      </div>

      <div className="relative mt-5 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <CircularProgress percentage={completionPercentage} size={96} strokeWidth={7} color="var(--color-primary)" glow="rgba(76,124,240,0.55)">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-text-primary">{completionPercentage}%</span>
              <span className="text-[10px] text-text-secondary">Día completado</span>
            </div>
          </CircularProgress>
          <div className="max-w-xs">
            <p className="text-base font-semibold text-text-primary">
              {pendingCount === 0 ? "¡Día completo!" : completionPercentage >= 75 ? "Vas increíble 💪" : "Sigue así"}
            </p>
            <p className="mt-1 text-sm text-text-secondary">{getDailyMotivationalMessage(completionPercentage, pendingCount)}</p>
            {pendingCount > 0 && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-text-secondary">
                {pendingCount} {pendingCount === 1 ? "hábito pendiente" : "hábitos pendientes"}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-5 rounded-xl border border-border bg-surface-muted/60 px-4 py-3">
          <span className="shadow-glow flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white">
            <Flame size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs text-text-secondary">Racha actual</p>
            <p className="text-xl font-bold text-text-primary">
              {currentStreak} {currentStreak === 1 ? "día" : "días"}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-text-disabled">
              <Trophy size={11} aria-hidden="true" />
              Récord personal: {personalRecord} {personalRecord === 1 ? "día" : "días"}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
