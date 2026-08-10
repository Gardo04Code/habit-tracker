import { useCallback, useEffect, useMemo, useState } from "react";
import type { Habit, HabitStatus } from "../types/habit";
import type { HabitLog as DbHabitLogRow, HabitSchedule } from "../types/entities";
import type { HabitStrengthEntry, StatusBreakdownPoint, WeeklyProgressPoint } from "../types/dashboard";
import type { StreakSummary } from "../types/streak";
import { activeHabits as mockActiveHabits } from "../data/mockHabits";
import { mockDashboard } from "../data/mockDashboard";
import { mockUser } from "../data/mockUser";
import { getInsights } from "../utils/insightsEngine";
import { TODAY as MOCK_TODAY } from "../data/referenceDate";
import { addDays, daysBetween, toDateOnly } from "../utils/formatDate";
import { isHabitScheduledUsingHistory } from "../utils/habitSchedule";
import { calculatePercentage, isGoalExceeded } from "../utils/calculateProgress";
import { getStreakSummary, calculateCurrentAggregateStreak, calculateBestAggregateStreak } from "../utils/streakTimeline";
import { isSupabaseDataSource } from "../lib/dataSource";
import { normalizeSupabaseError } from "../lib/errors";
import { useAuth } from "../contexts/AuthContext";
import { useDailyChecklist, type ChecklistEntry } from "./useDailyChecklist";
import { useGoals } from "./useGoals";
import { useStatistics, computeCurrentStreakReal } from "./useStatistics";
import { habitSchedulesService } from "../services/habitSchedules.service";
import type { Insight } from "../types/insight";

function groupSchedulesByHabit(rows: HabitSchedule[]): Map<string, HabitSchedule[]> {
  const map = new Map<string, HabitSchedule[]>();
  for (const row of rows) {
    const list = map.get(row.habit_id);
    if (list) list.push(row);
    else map.set(row.habit_id, [row]);
  }
  return map;
}

export interface DashboardRecommendation {
  id: string;
  text: string;
}

const TODAY = isSupabaseDataSource ? toDateOnly(new Date()) : MOCK_TODAY;

// Umbral aprobado de la sección "Constancia" (racha agregada) — el mismo
// que ya usa utils/streakTimeline.ts. No se introduce ningún otro valor.
const STREAK_THRESHOLD = 80;
const WEAK_HABIT_SAMPLE_MIN = 5;
const WEAK_HABIT_RATE_MAX = 70;

// ----------------------------------------------------------------------------
// Puerto local del algoritmo de utils/streakTimeline.ts (racha agregada +
// "mejor hábito del día"), parametrizado por datos reales en vez de
// mockHabitLogs/mockHabits/TODAY fijo. streakTimeline.ts es compartido con
// Checklist (MotivationHeader, ya congelado, la llama sin ninguna rama
// mock/Supabase) — modificarlo excede el alcance de esta tarea. En modo
// mock, useDashboard sigue llamando exactamente getStreakSummary()/
// calculateCurrentAggregateStreak()/calculateBestAggregateStreak() del
// archivo original, sin ningún cambio.
//
// Única diferencia deliberada frente al mock: el porcentaje/"meta superada"
// del mejor hábito del día usa target_value_snapshot del propio habit_log
// (nunca el target_value vigente del hábito) — mismo principio ya aplicado
// en Historial/Estadísticas para no reconstruir el pasado con la
// configuración actual.
// ----------------------------------------------------------------------------

interface RealBestHabit {
  id: string;
  name: string;
  icon: string;
  completionPercentage: number;
  value?: number;
  target?: number;
  unit?: string;
  goalExceeded: boolean;
}

interface RealStreakTimelineItem {
  id: string;
  date: string;
  streakNumber: number;
  completionPercentage: number;
  bestHabit: RealBestHabit;
}

function buildRealStreakEngine(
  activeHabits: Habit[],
  logsByHabit: Map<string, Map<string, HabitStatus>>,
  rowsByHabit: Map<string, Map<string, DbHabitLogRow>>,
  today: string,
  scheduleHistories: Map<string, HabitSchedule[]>,
) {
  const earliestStartDate = activeHabits.reduce((min, habit) => (habit.startDate < min ? habit.startDate : min), today);

  // Corrección de BUG-004: para cada fecha del recorrido de la racha (que
  // puede retroceder muchos días respecto a hoy) se resuelve la versión de
  // habit_schedules que REALMENTE regía ese día, en vez de asumir la
  // vigente hoy (isHabitScheduledForDate original). scheduleHistories ya
  // trae el historial completo de todos los `activeHabits` en memoria (una
  // sola consulta en lote, ver useDashboard más abajo) — esta función no
  // hace ninguna consulta nueva por fecha ni por hábito.
  function getScheduledForDate(date: string): Habit[] {
    return activeHabits.filter((habit) =>
      isHabitScheduledUsingHistory(habit, scheduleHistories.get(habit.id) ?? [], date),
    );
  }

  function statusOn(habitId: string, date: string): HabitStatus {
    return logsByHabit.get(habitId)?.get(date) ?? "pending";
  }

  function hasUnloggedHabits(date: string): boolean {
    return getScheduledForDate(date).some((habit) => statusOn(habit.id, date) === "pending");
  }

  function getAnchorDate(): string {
    return hasUnloggedHabits(today) ? addDays(today, -1) : today;
  }

  function dayCompletionPercentage(date: string): number {
    const habits = getScheduledForDate(date);
    if (habits.length === 0) return 0;
    let weighted = 0;
    let applicable = 0;
    for (const habit of habits) {
      const status = statusOn(habit.id, date);
      if (status === "not_applicable") continue;
      applicable += 1;
      if (status === "completed") weighted += 1;
      else if (status === "partial") weighted += 0.5;
    }
    if (applicable === 0) return 0;
    return Math.round((weighted / applicable) * 100);
  }

  function qualifies(percentage: number): boolean {
    return percentage >= STREAK_THRESHOLD;
  }

  function currentStreak(): number {
    let streak = 0;
    let date = getAnchorDate();
    while (date >= earliestStartDate) {
      if (!qualifies(dayCompletionPercentage(date))) break;
      streak += 1;
      date = addDays(date, -1);
    }
    return streak;
  }

  function bestStreak(): number {
    let current = 0;
    let best = 0;
    let date = earliestStartDate;
    const anchor = getAnchorDate();
    while (date <= anchor) {
      if (qualifies(dayCompletionPercentage(date))) {
        current += 1;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
      date = addDays(date, 1);
    }
    return best;
  }

  function historicalConsistency(habitId: string): number {
    const byDate = logsByHabit.get(habitId);
    if (!byDate || byDate.size === 0) return 0;
    let weighted = 0;
    let count = 0;
    for (const status of byDate.values()) {
      if (status === "not_applicable") continue;
      count += 1;
      if (status === "completed") weighted += 1;
      else if (status === "partial") weighted += 0.5;
    }
    return count > 0 ? weighted / count : 0;
  }

  function habitPercentage(row: DbHabitLogRow | undefined): number {
    if (!row) return 0;
    const targetSnapshot = row.target_value_snapshot ?? undefined;
    if (targetSnapshot && row.value !== undefined && row.value !== null) {
      return calculatePercentage(row.value, targetSnapshot);
    }
    if (row.status === "completed") return 100;
    if (row.status === "partial") return 50;
    return 0;
  }

  /** Mismo orden de prioridad exacto que determineBestHabit() (mock):
   * 1) meta superada, 2) mayor %, 3) mayor consistencia histórica,
   * 4) empate -> hora de registro más temprana. */
  function determineBestHabit(date: string): RealBestHabit | undefined {
    const habits = getScheduledForDate(date);
    if (habits.length === 0) return undefined;

    const candidates = habits.map((habit) => {
      const row = rowsByHabit.get(habit.id)?.get(date);
      const percentage = habitPercentage(row);
      const targetSnapshot = row?.target_value_snapshot ?? undefined;
      const goalExceeded = Boolean(targetSnapshot && row?.value !== undefined && row?.value !== null && isGoalExceeded(row.value, targetSnapshot));
      return { habit, row, percentage, goalExceeded };
    });

    candidates.sort((a, b) => {
      if (a.goalExceeded !== b.goalExceeded) return a.goalExceeded ? -1 : 1;
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      const consistencyDiff = historicalConsistency(b.habit.id) - historicalConsistency(a.habit.id);
      if (Math.abs(consistencyDiff) > 0.0001) return consistencyDiff > 0 ? 1 : -1;
      const aTime = a.row?.recorded_time ?? "23:59";
      const bTime = b.row?.recorded_time ?? "23:59";
      return aTime.localeCompare(bTime);
    });

    const best = candidates[0];
    return {
      id: best.habit.id,
      name: best.habit.name,
      icon: best.habit.icon,
      completionPercentage: best.percentage,
      value: best.row?.value ?? undefined,
      target: best.row?.target_value_snapshot ?? undefined,
      unit: best.row?.target_unit_snapshot ?? undefined,
      goalExceeded: best.goalExceeded,
    };
  }

  function lastStreakDays(count: number): RealStreakTimelineItem[] {
    const streak = currentStreak();
    const take = Math.min(count, streak);
    const dates: string[] = [];
    let date = getAnchorDate();
    for (let i = 0; i < take; i += 1) {
      dates.push(date);
      date = addDays(date, -1);
    }
    dates.reverse();

    return dates.map((itemDate, index) => {
      const streakNumber = streak - take + index + 1;
      const bestHabit = determineBestHabit(itemDate) ?? {
        id: "unknown",
        name: "Sin datos",
        icon: "sparkles",
        completionPercentage: 0,
        goalExceeded: false,
      };
      return {
        id: `streak-${itemDate}`,
        date: itemDate,
        streakNumber,
        completionPercentage: dayCompletionPercentage(itemDate),
        bestHabit,
      };
    });
  }

  return { currentStreak, bestStreak, lastStreakDays, dayCompletionPercentage };
}

function computeCompletionCounts(entries: ChecklistEntry[]): { completed: number; total: number; pending: number } {
  return {
    completed: entries.filter((entry) => entry.status === "completed").length,
    total: entries.length,
    pending: entries.filter((entry) => entry.status === "pending").length,
  };
}

/**
 * Dashboard: vista de resumen que COMPONE hooks ya validados (useAuth,
 * useDailyChecklist, useGoals, useStatistics) — nunca vuelve a consultar
 * habit_logs/habits por su cuenta ni reimplementa create/update/delete.
 * Nunca escribe nada: solo lee. Alterna mock/Supabase sin que
 * DashboardPage.tsx conozca el origen (salvo la única excepción,
 * documentada, de "recomendaciones" — ver MDs/12).
 */
export function useDashboard() {
  // Auth siempre es real (nunca tuvo rama mock — a diferencia de las
  // fuentes de datos de hábitos/logs/metas). En modo mock, el saludo sigue
  // mostrando exactamente el mismo mockUser.name de siempre (la "persona"
  // de demostración), independiente de qué usuario real haya iniciado
  // sesión — es la experiencia mock ya validada, que este cambio no debe
  // romper (VITE_DATA_SOURCE=mock nunca implicó autenticación falsa).
  const { profile, loading: authLoading } = useAuth();
  const displayName = isSupabaseDataSource ? (profile?.name ?? "") : mockUser.name;
  const checklist = useDailyChecklist(TODAY);
  const goalsHook = useGoals();
  // period=7: statusBreakdown/dailyRates ya nacen recortados a la semana que
  // usa esta pantalla ("Registros de la semana", "últimos 7 días") — sin
  // eso, useStatistics() por defecto traería 30 días. kpis.weekly/monthly
  // son independientes del period seleccionado (siempre ventanas fijas de
  // 7/30 días), así que no se ven afectados.
  const stats = useStatistics(7);

  const rowsByHabit = useMemo(() => {
    const map = new Map<string, Map<string, DbHabitLogRow>>();
    for (const row of stats.dbLogs) {
      let byDate = map.get(row.habit_id);
      if (!byDate) {
        byDate = new Map();
        map.set(row.habit_id, byDate);
      }
      byDate.set(row.date, row);
    }
    return map;
  }, [stats.dbLogs]);

  const realActiveHabits = useMemo(() => stats.allHabits.filter((habit) => habit.lifecycleStatus === "active"), [stats.allHabits]);

  // ---- Corrección de BUG-004 (solo modo Supabase) ----
  // Historial completo de habit_schedules de los hábitos activos que ve el
  // motor de racha, en UNA sola consulta en lote — independiente del
  // historial que `useDailyChecklist(TODAY)` ya carga para sus propios
  // `activeHabits` (instancia separada de `useHabits()`, mismo patrón ya
  // existente y documentado de useDashboard componiendo hooks que no
  // comparten estado entre sí). No se intenta reutilizar la colección de
  // `checklist` aquí para no acoplar dos hooks independientes ni cambiar el
  // contrato público de useDailyChecklist — ver conteo de consultas en la
  // documentación de esta corrección.
  const realActiveHabitIds = useMemo(() => realActiveHabits.map((habit) => habit.id), [realActiveHabits]);
  const [scheduleHistories, setScheduleHistories] = useState<Map<string, HabitSchedule[]>>(new Map());
  const [schedulesLoading, setSchedulesLoading] = useState(isSupabaseDataSource);
  const [schedulesError, setSchedulesError] = useState<string | null>(null);

  const refreshScheduleHistories = useCallback(async () => {
    if (!isSupabaseDataSource) return;
    try {
      const rows = await habitSchedulesService.getHabitScheduleHistories(realActiveHabitIds);
      setScheduleHistories(groupSchedulesByHabit(rows));
      setSchedulesError(null);
    } catch (caught) {
      setSchedulesError(normalizeSupabaseError(caught).friendlyMessage);
    }
  }, [realActiveHabitIds]);

  useEffect(() => {
    if (!isSupabaseDataSource) return;
    let cancelled = false;

    habitSchedulesService
      .getHabitScheduleHistories(realActiveHabitIds)
      .then((rows) => {
        if (!cancelled) {
          setScheduleHistories(groupSchedulesByHabit(rows));
          setSchedulesError(null);
        }
      })
      .catch((caught) => {
        if (!cancelled) setSchedulesError(normalizeSupabaseError(caught).friendlyMessage);
      })
      .finally(() => {
        if (!cancelled) setSchedulesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [realActiveHabitIds]);

  const realStreakEngine = useMemo(
    () => buildRealStreakEngine(realActiveHabits, stats.logsByHabit, rowsByHabit, TODAY, scheduleHistories),
    [realActiveHabits, stats.logsByHabit, rowsByHabit, scheduleHistories],
  );

  // ---- Resumen de hoy (reutiliza useDailyChecklist tal cual) ----
  const todayChecklist = checklist.allEntries;
  const { completed: completedToday, total: totalToday, pending: pendingToday } = computeCompletionCounts(todayChecklist);
  const hasActiveHabits = isSupabaseDataSource ? realActiveHabits.length > 0 : mockActiveHabits.length > 0;

  // ---- Racha (regla del 80%, agregada) ----
  const currentStreak = isSupabaseDataSource ? realStreakEngine.currentStreak() : calculateCurrentAggregateStreak();
  const bestStreak = isSupabaseDataSource ? realStreakEngine.bestStreak() : calculateBestAggregateStreak();
  const streakSummary: StreakSummary = isSupabaseDataSource
    ? {
        currentStreak,
        personalRecord: bestStreak,
        remainingToRecord: Math.max(0, bestStreak - currentStreak),
        items: realStreakEngine.lastStreakDays(5).map((item) => ({
          ...item,
          qualifiesForStreak: true,
          bestHabit: { ...item.bestHabit, category: "otros" },
        })),
      }
    : getStreakSummary(5);

  // ---- Cumplimiento semanal/mensual (reutiliza useStatistics, sin fórmula nueva) ----
  const weeklyCompletionRate = stats.kpis.weekly;
  const monthlyGoalProgress = stats.kpis.monthly;
  const monthlyGoalTarget = STREAK_THRESHOLD;

  // Aproximación documentada: promedio de tasas diarias (consistency, que
  // ya trae 8 semanas sin importar el period seleccionado) de los últimos 7
  // días vs. los 7 anteriores — no es una resta de dos cumplimientos
  // ponderados independientes (eso exigiría una segunda consulta), es un
  // proxy honesto con el mismo método en ambos lados.
  const weeklyCompletionTrend = useMemo(() => {
    if (!isSupabaseDataSource) return mockDashboard.weeklyCompletionTrend;
    const days = stats.consistency;
    if (days.length < 14) return 0;
    const last7 = days.slice(-7);
    const prev7 = days.slice(-14, -7);
    const avg = (list: typeof days) => {
      const withData = list.filter((d) => d.hasData);
      if (withData.length === 0) return 0;
      return Math.round(withData.reduce((sum, d) => sum + d.completionRate, 0) / withData.length);
    };
    return avg(last7) - avg(prev7);
  }, [stats.consistency]);

  // ---- Progreso semanal (reutiliza dailyRates de useStatistics, period=7) ----
  const weeklyProgress: WeeklyProgressPoint[] = isSupabaseDataSource ? stats.dailyRates : mockDashboard.weeklyProgress;
  const statusBreakdown: StatusBreakdownPoint[] = isSupabaseDataSource ? stats.statusBreakdown : mockDashboard.statusBreakdown;

  // ---- Hábitos más fuertes/débiles (reutiliza habitComparison de useStatistics, mismo criterio, sin ranking nuevo) ----
  function toStrengthEntry(entry: (typeof stats.habitComparison)[number]): HabitStrengthEntry {
    const habit = stats.habitsById.get(entry.habitId);
    const streak = habit ? computeCurrentStreakReal(habit, stats.logsByHabit, TODAY) : 0;
    return {
      habitId: entry.habitId,
      habitName: entry.habitName,
      icon: entry.icon,
      color: entry.color,
      completionRate: entry.completionRate,
      streak,
    };
  }

  const strongestHabits: HabitStrengthEntry[] = isSupabaseDataSource
    ? stats.habitComparison.slice(0, 2).map(toStrengthEntry)
    : mockDashboard.strongestHabits;
  const weakestHabits: HabitStrengthEntry[] = isSupabaseDataSource
    ? [...stats.habitComparison].reverse().slice(0, 2).map(toStrengthEntry)
    : mockDashboard.weakestHabits;

  // ---- Recomendaciones ----
  // Modo mock: exactamente el motor original (getInsights/Insight[]), sin
  // ningún cambio — DashboardPage.tsx sigue usando InsightCard tal cual.
  // Modo Supabase: NO se reimplementa el motor de insights completo (9
  // generadores con "confianza de modelo", correlaciones, predicciones —
  // duplicaría un algoritmo enorme y, más importante, presentaría reglas
  // deterministas como si fueran una IA real, algo que este encargo prohíbe
  // explícitamente). En su lugar, mensajes neutrales cortos derivados de
  // datos ya calculados arriba (sin ninguna consulta ni fórmula nueva).
  const insights: Insight[] = isSupabaseDataSource ? [] : getInsights();

  const recommendations: DashboardRecommendation[] = useMemo(() => {
    if (!isSupabaseDataSource) return [];
    const items: DashboardRecommendation[] = [];

    if (pendingToday > 0) {
      items.push({
        id: "rec-pending-today",
        text: `Te falta registrar ${pendingToday} ${pendingToday === 1 ? "hábito" : "hábitos"} hoy.`,
      });
    }

    if (currentStreak >= 3) {
      items.push({
        id: "rec-good-streak",
        text: `Llevas ${currentStreak} días de racha. ¡Sigue así!`,
      });
    }

    const weakCandidate = [...stats.habitComparison]
      .filter((entry) => (stats.logsByHabit.get(entry.habitId)?.size ?? 0) >= WEAK_HABIT_SAMPLE_MIN)
      .sort((a, b) => a.completionRate - b.completionRate)[0];
    if (weakCandidate && weakCandidate.completionRate < WEAK_HABIT_RATE_MAX) {
      items.push({
        id: `rec-weak-${weakCandidate.habitId}`,
        text: `"${weakCandidate.habitName}" tiene bajo cumplimiento esta semana (${weakCandidate.completionRate}%).`,
      });
    }

    const upcomingGoal = goalsHook.activeGoals
      .filter((goal) => goal.status === "active")
      .map((goal) => ({ goal, daysLeft: daysBetween(TODAY, goal.endDate) }))
      .filter((entry) => entry.daysLeft >= 0 && entry.daysLeft <= 7)
      .sort((a, b) => a.daysLeft - b.daysLeft)[0];
    if (upcomingGoal) {
      items.push({
        id: `rec-goal-${upcomingGoal.goal.id}`,
        text: `Tu meta "${upcomingGoal.goal.title}" vence en ${upcomingGoal.daysLeft} ${upcomingGoal.daysLeft === 1 ? "día" : "días"}.`,
      });
    }

    if (weeklyCompletionTrend > 0) {
      items.push({
        id: "rec-improving",
        text: `Mejoraste ${weeklyCompletionTrend} puntos frente a la semana pasada.`,
      });
    }

    return items;
  }, [pendingToday, currentStreak, stats.habitComparison, stats.logsByHabit, goalsHook.activeGoals, weeklyCompletionTrend]);

  const loading = isSupabaseDataSource && (authLoading || checklist.loading || stats.loading || goalsHook.loading || schedulesLoading);
  const error = isSupabaseDataSource ? (checklist.error ?? stats.error ?? goalsHook.error ?? schedulesError ?? null) : null;

  const refresh = async () => {
    if (!isSupabaseDataSource) return;
    await Promise.all([checklist.refresh(), stats.refresh(), goalsHook.refresh(), refreshScheduleHistories()]);
  };

  return {
    profile,
    displayName,
    today: TODAY,
    hasActiveHabits,
    todayChecklist,
    completedToday,
    totalToday,
    pendingToday,
    currentStreak,
    bestStreak,
    streakSummary,
    weeklyCompletionRate,
    weeklyCompletionTrend,
    monthlyGoalProgress,
    monthlyGoalTarget,
    weeklyProgress,
    statusBreakdown,
    strongestHabits,
    weakestHabits,
    insights,
    recommendations,
    loading,
    error,
    refresh,
  };
}
