import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Flame, Trophy } from "lucide-react";
import { getStreakSummary } from "../../utils/streakTimeline";
import { getHabitAccent } from "../../utils/habitAccent";
import { getHabitIcon } from "../../utils/habitIcons";
import { formatFullDate } from "../../utils/formatDate";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { EmptyState } from "../ui/EmptyState";
import { StreakTimelineItem } from "./StreakTimelineItem";

const ITEM_WIDTH = 150;
const ITEM_GAP = 12;

function getMotivationalMessage(currentStreak: number, remainingToRecord: number): string {
  if (currentStreak === 0) return "Completa el 80% de tus hábitos hoy para empezar una racha.";
  if (remainingToRecord === 0) return "¡Estás en tu mejor racha de siempre!";
  if (remainingToRecord <= 3) return `Ya casi igualas tu récord — ${remainingToRecord} ${remainingToRecord === 1 ? "día" : "días"} más.`;
  return "Sigue así, tu constancia está dando resultados.";
}

export function StreakTimeline() {
  const summary = useMemo(() => getStreakSummary(5), []);
  const [selectedId, setSelectedId] = useState<string | null>(
    summary.items.length > 0 ? summary.items[summary.items.length - 1].id : null,
  );
  const prefersReducedMotion = useReducedMotion();

  const selectedItem = summary.items.find((item) => item.id === selectedId) ?? null;

  if (summary.items.length === 0) {
    return (
      <EmptyState
        icon={<Flame size={20} aria-hidden="true" />}
        title="Todavía no tienes una racha activa"
        description="Completa al menos el 80% de tus hábitos programados en un día para empezar a construir tu racha."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted px-4 py-3">
          <span className="shadow-glow flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <Flame size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold leading-tight text-text-primary">
              <AnimatedNumber value={summary.currentStreak} />
            </p>
            <p className="text-xs font-medium text-text-secondary">
              {summary.currentStreak === 1 ? "día de racha" : "días de racha"}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {getMotivationalMessage(summary.currentStreak, summary.remainingToRecord)}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-muted text-warning">
            <Trophy size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold leading-tight text-text-primary">
              <AnimatedNumber value={summary.personalRecord} />
            </p>
            <p className="text-xs font-medium text-text-secondary">récord personal</p>
            <p className="mt-1 text-xs text-text-secondary">
              {summary.remainingToRecord > 0
                ? `Te faltan ${summary.remainingToRecord} ${summary.remainingToRecord === 1 ? "día" : "días"} para igualarlo`
                : "¡Récord igualado o superado!"}
            </p>
          </div>
        </div>
      </div>

      <div
        role="list"
        aria-label="Últimos días de racha"
        className="scrollbar-none relative flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1"
      >
        <div
          className="pointer-events-none absolute top-[38px] h-px bg-gradient-to-r from-transparent via-border-strong to-transparent"
          style={{
            left: ITEM_WIDTH / 2,
            width: (summary.items.length - 1) * (ITEM_WIDTH + ITEM_GAP),
          }}
          aria-hidden="true"
        />
        {summary.items.map((item, index) => (
          <StreakTimelineItem
            key={item.id}
            item={item}
            index={index}
            isMostRecent={index === summary.items.length - 1}
            isSelected={item.id === selectedId}
            onSelect={(id) => setSelectedId((current) => (current === id ? null : id))}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {selectedItem && (
          <motion.div
            key={selectedItem.id}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted px-4 py-3"
          >
            {(() => {
              const accent = getHabitAccent(selectedItem.bestHabit.icon);
              const Icon = getHabitIcon(selectedItem.bestHabit.icon);
              return (
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ background: `linear-gradient(145deg, ${accent.light}, ${accent.base})` }}
                  aria-hidden="true"
                >
                  <Icon size={18} />
                </span>
              );
            })()}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold capitalize text-text-primary">{formatFullDate(selectedItem.date)}</p>
              <p className="text-xs text-text-secondary">
                Día {selectedItem.streakNumber} de racha · {selectedItem.completionPercentage}% de cumplimiento
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-text-primary">{selectedItem.bestHabit.name}</p>
              <p className="text-xs text-text-secondary">
                {selectedItem.bestHabit.value !== undefined && selectedItem.bestHabit.target !== undefined
                  ? `${selectedItem.bestHabit.value} / ${selectedItem.bestHabit.target} ${selectedItem.bestHabit.unit ?? ""}`
                  : `${selectedItem.bestHabit.completionPercentage}% completado`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
