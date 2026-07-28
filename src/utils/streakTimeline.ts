import type { Habit, HabitLog } from "../types/habit";
import type { StreakBestHabit, StreakSummary, StreakTimelineItem } from "../types/streak";
import { activeHabits } from "../data/mockHabits";
import { getLogForHabitOnDate, getLogsForHabit } from "../data/mockHabitLogs";
import { TODAY } from "../data/referenceDate";
import { addDays } from "./formatDate";
import { isHabitScheduledForDate } from "./habitSchedule";
import { calculatePercentage, isGoalExceeded } from "./calculateProgress";

/**
 * Racha "agregada": a diferencia de utils/streaks.ts (racha POR hábito, con
 * tolerancia de un día fallido), esta cuenta días completos del usuario
 * (>= 80% de sus hábitos programados ese día), sin tolerancia, tal como lo
 * pide la sección "Constancia". Vive aparte para no alterar el cálculo que
 * ya usa Estadísticas.
 */
const STREAK_THRESHOLD = 80;

const EARLIEST_ACTIVE_START_DATE = activeHabits.reduce(
  (min, habit) => (habit.startDate < min ? habit.startDate : min),
  TODAY,
);

function getScheduledActiveHabitsForDate(date: string): Habit[] {
  return activeHabits.filter((habit) => isHabitScheduledForDate(habit, date));
}

function hasUnloggedHabits(date: string): boolean {
  return getScheduledActiveHabitsForDate(date).some((habit) => !getLogForHabitOnDate(habit.id, date));
}

/** Hoy no se juzga como "roto" mientras el usuario todavía puede registrarlo. */
function getStreakAnchorDate(): string {
  return hasUnloggedHabits(TODAY) ? addDays(TODAY, -1) : TODAY;
}

export function calculateDayCompletionPercentage(date: string): number {
  const habits = getScheduledActiveHabitsForDate(date);
  if (habits.length === 0) return 0;

  let weighted = 0;
  let applicable = 0;

  for (const habit of habits) {
    const status = getLogForHabitOnDate(habit.id, date)?.status ?? "pending";
    if (status === "not_applicable") continue;
    applicable += 1;
    if (status === "completed") weighted += 1;
    else if (status === "partial") weighted += 0.5;
  }

  if (applicable === 0) return 0;
  return Math.round((weighted / applicable) * 100);
}

export function qualifiesForStreak(percentage: number): boolean {
  return percentage >= STREAK_THRESHOLD;
}

export function calculateCurrentAggregateStreak(): number {
  let streak = 0;
  let date = getStreakAnchorDate();

  while (date >= EARLIEST_ACTIVE_START_DATE) {
    if (!qualifiesForStreak(calculateDayCompletionPercentage(date))) break;
    streak += 1;
    date = addDays(date, -1);
  }

  return streak;
}

export function calculateBestAggregateStreak(): number {
  let current = 0;
  let best = 0;
  let date = EARLIEST_ACTIVE_START_DATE;
  const lastFullyJudgedDate = getStreakAnchorDate();

  while (date <= lastFullyJudgedDate) {
    if (qualifiesForStreak(calculateDayCompletionPercentage(date))) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
    date = addDays(date, 1);
  }

  return best;
}

export function calculateRemainingToRecord(currentStreak: number, personalRecord: number): number {
  return Math.max(0, personalRecord - currentStreak);
}

function computeHabitPercentage(habit: Habit, log: HabitLog | undefined): number {
  if (!log) return 0;
  if (habit.targetValue && log.value !== undefined) {
    return calculatePercentage(log.value, habit.targetValue);
  }
  if (log.status === "completed") return 100;
  if (log.status === "partial") return 50;
  return 0;
}

function historicalConsistency(habitId: string): number {
  const logs = getLogsForHabit(habitId).filter((log) => log.status !== "not_applicable");
  if (logs.length === 0) return 0;
  const weighted = logs.reduce((sum, log) => {
    if (log.status === "completed") return sum + 1;
    if (log.status === "partial") return sum + 0.5;
    return sum;
  }, 0);
  return weighted / logs.length;
}

/**
 * Prioridad exacta pedida: 1) superó más su meta, 2) mayor % de
 * cumplimiento, 3) mayor consistencia histórica, 4) empate -> el primero
 * registrado en el día.
 */
export function determineBestHabit(date: string): StreakBestHabit | undefined {
  const habits = getScheduledActiveHabitsForDate(date);
  if (habits.length === 0) return undefined;

  const candidates = habits.map((habit) => {
    const log = getLogForHabitOnDate(habit.id, date);
    const percentage = computeHabitPercentage(habit, log);
    const goalExceeded = Boolean(habit.targetValue && log?.value !== undefined && isGoalExceeded(log.value, habit.targetValue));
    return { habit, log, percentage, goalExceeded };
  });

  candidates.sort((a, b) => {
    if (a.goalExceeded !== b.goalExceeded) return a.goalExceeded ? -1 : 1;
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;

    const consistencyDiff = historicalConsistency(b.habit.id) - historicalConsistency(a.habit.id);
    if (Math.abs(consistencyDiff) > 0.0001) return consistencyDiff > 0 ? 1 : -1;

    const aTime = a.log?.recordedTime ?? "23:59";
    const bTime = b.log?.recordedTime ?? "23:59";
    return aTime.localeCompare(bTime);
  });

  const best = candidates[0];
  return {
    id: best.habit.id,
    name: best.habit.name,
    category: best.habit.categoryIds[0] ?? "otros",
    icon: best.habit.icon,
    completionPercentage: best.percentage,
    value: best.log?.value,
    target: best.habit.targetValue,
    unit: best.habit.targetUnit,
    goalExceeded: best.goalExceeded,
  };
}

export function getLastStreakDays(count = 5): StreakTimelineItem[] {
  const currentStreak = calculateCurrentAggregateStreak();
  const take = Math.min(count, currentStreak);

  const dates: string[] = [];
  let date = getStreakAnchorDate();
  for (let i = 0; i < take; i += 1) {
    dates.push(date);
    date = addDays(date, -1);
  }
  dates.reverse();

  return dates.map((itemDate, index) => {
    const streakNumber = currentStreak - take + index + 1;
    // Un día que ya calificó para la racha siempre tiene al menos un hábito
    // programado (ver qualifiesForStreak), así que determineBestHabit no
    // debería devolver undefined aquí; el fallback es solo defensivo.
    const bestHabit = determineBestHabit(itemDate) ?? {
      id: "unknown",
      name: "Sin datos",
      category: "otros",
      icon: "sparkles",
      completionPercentage: 0,
      goalExceeded: false,
    };

    return {
      id: `streak-${itemDate}`,
      date: itemDate,
      streakNumber,
      completionPercentage: calculateDayCompletionPercentage(itemDate),
      qualifiesForStreak: true,
      bestHabit,
    };
  });
}

export function getStreakSummary(count = 5): StreakSummary {
  const currentStreak = calculateCurrentAggregateStreak();
  const personalRecord = calculateBestAggregateStreak();

  return {
    currentStreak,
    personalRecord,
    remainingToRecord: calculateRemainingToRecord(currentStreak, personalRecord),
    items: getLastStreakDays(count),
  };
}
