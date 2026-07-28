import type { Habit, HabitStatus } from "../types/habit";
import { calculatePercentage, isGoalExceeded } from "./calculateProgress";

export function getGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function getDailyMotivationalMessage(percentage: number, pendingCount: number): string {
  if (pendingCount === 0) {
    return "Completaste todos tus hábitos de hoy. Excelente trabajo.";
  }
  if (percentage >= 75) {
    return `Vas increíble. Solo ${pendingCount === 1 ? "falta uno" : `faltan ${pendingCount}`} para terminar el día.`;
  }
  if (percentage >= 40) {
    return `Vas a la mitad. ${pendingCount === 1 ? "Un hábito más" : `${pendingCount} hábitos más`} y cierras el día.`;
  }
  if (percentage > 0) {
    return "Buen comienzo. Cada hábito que registres suma para tu racha.";
  }
  return "Hoy todavía no registras nada — empieza con el más fácil.";
}

interface LiveEntry {
  habit: Habit;
  status: HabitStatus;
  value?: number;
  recordedTime?: string;
}

export interface BestEntrySummary {
  habitName: string;
  icon: string;
  percentage: number;
  goalExceeded: boolean;
}

/**
 * Igual que determineBestHabit del motor de insights, pero opera sobre las
 * entradas EN VIVO del checklist (con overrides de la sesión) en vez de
 * releer mockHabitLogs — así el panel de IA refleja al instante lo que el
 * usuario acaba de marcar, sin duplicar la fuente de verdad del historial.
 */
export function pickBestEntryOfDay(entries: LiveEntry[]): BestEntrySummary | null {
  const candidates = entries
    .filter((entry) => entry.status === "completed" || entry.status === "partial")
    .map((entry) => {
      const { habit, value, status } = entry;
      let percentage = 0;
      if (habit.targetValue && value !== undefined) {
        percentage = calculatePercentage(value, habit.targetValue);
      } else if (status === "completed") {
        percentage = 100;
      } else if (status === "partial") {
        percentage = 50;
      }
      const goalExceeded = Boolean(habit.targetValue && value !== undefined && isGoalExceeded(value, habit.targetValue));
      return {
        habitName: habit.name,
        icon: habit.icon,
        percentage,
        goalExceeded,
        recordedTime: entry.recordedTime ?? "23:59",
      };
    });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.goalExceeded !== b.goalExceeded) return a.goalExceeded ? -1 : 1;
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    return a.recordedTime.localeCompare(b.recordedTime);
  });

  const best = candidates[0];
  return { habitName: best.habitName, icon: best.icon, percentage: best.percentage, goalExceeded: best.goalExceeded };
}
