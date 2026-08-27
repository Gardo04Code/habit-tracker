import type { Habit } from "../types/habit";
import { getLogsForHabit } from "../data/mockHabitLogs";
import { TODAY } from "../data/referenceDate";
import { addDays } from "./formatDate";
import { calculateCurrentStreak } from "./streaks";
import { calculateRecentCompletionRate } from "./recentCompletion";
import { calculateDayCompletionPercentage } from "./streakTimeline";
import { isSupabaseDataSource } from "../lib/dataSource";

const ACTIVE_RISK_THRESHOLD = 50;

export function calculateBestActiveStreak(habits: Habit[]): number {
  const active = habits.filter((habit) => habit.lifecycleStatus === "active");
  if (active.length === 0) return 0;
  return Math.max(...active.map((habit) => calculateCurrentStreak(habit)));
}

export function calculateAverageCompletion(habits: Habit[], days = 14): number {
  const active = habits.filter((habit) => habit.lifecycleStatus === "active");
  if (active.length === 0) return 0;
  const total = active.reduce((sum, habit) => sum + calculateRecentCompletionRate(habit.id, days), 0);
  return Math.round(total / active.length);
}

export function countHabitsAtRisk(habits: Habit[], threshold = ACTIVE_RISK_THRESHOLD): number {
  return habits.filter(
    (habit) => habit.lifecycleStatus === "active" && calculateRecentCompletionRate(habit.id) < threshold,
  ).length;
}

/** Promedio del valor registrado (vasos, minutos, etc.) en los últimos N días. */
export function calculateAverageLoggedValue(habitId: string, days = 14): number | null {
  const since = addDays(TODAY, -(days - 1));
  const logs = getLogsForHabit(habitId).filter(
    (log) => log.date >= since && log.date <= TODAY && log.value !== undefined,
  );
  if (logs.length === 0) return null;
  const total = logs.reduce((sum, log) => sum + (log.value ?? 0), 0);
  return Math.round((total / logs.length) * 10) / 10;
}

/** % de cumplimiento agregado por día, para las mini-gráficas de las tarjetas KPI. */
export function calculateDailyCompletionTrend(days = 8): number[] {
  return Array.from({ length: days }, (_, index) =>
    calculateDayCompletionPercentage(addDays(TODAY, -(days - 1 - index))),
  );
}

export function countCompletedSessions(habitId: string): number {
  return getLogsForHabit(habitId).filter((log) => log.status === "completed").length;
}

/** Hora promedio registrada (para hábitos de tipo "hora límite"), formateada HH:MM. */
export function calculateAverageRecordedTime(habitId: string, days = 30): string | null {
  const since = addDays(TODAY, -(days - 1));
  const logs = getLogsForHabit(habitId).filter(
    (log) => log.date >= since && log.date <= TODAY && log.recordedTime,
  );
  if (logs.length === 0) return null;

  const totalMinutes = logs.reduce((sum, log) => {
    const [hours, minutes] = log.recordedTime!.split(":").map(Number);
    return sum + hours * 60 + minutes;
  }, 0);
  const avgMinutes = Math.round(totalMinutes / logs.length);
  const hh = Math.floor(avgMinutes / 60) % 24;
  const mm = avgMinutes % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Conteo acumulado de hábitos creados a lo largo del tiempo, muestreado en
 * puntos regulares desde el primer hábito hasta hoy — una curva de
 * crecimiento real, no una serie inventada. */
export function calculateHabitCountTrend(habits: Habit[], points = 8): number[] {
  if (habits.length === 0) return Array.from({ length: points }, () => 0);

  const createdTimestamps = habits.map((habit) => new Date(habit.createdAt).getTime()).sort((a, b) => a - b);
  const start = createdTimestamps[0];
  // BUG-PROD-006 (misma familia): esta serie SÍ recibe habits reales, pero
  // usaba el ancla fija de los mocks como fecha final incluso en modo
  // Supabase. En modo Supabase, el extremo derecho de la curva debe ser la
  // fecha real de hoy, igual que ya hace useDashboard.ts/useStatistics.ts.
  const end = isSupabaseDataSource ? Date.now() : new Date(`${TODAY}T00:00:00`).getTime();
  const span = Math.max(1, end - start);

  return Array.from({ length: points }, (_, index) => {
    const cutoff = start + (span * (index + 1)) / points;
    return createdTimestamps.filter((createdAt) => createdAt <= cutoff).length;
  });
}
