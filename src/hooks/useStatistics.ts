import { useCallback, useEffect, useMemo, useState } from "react";
import type { Habit, HabitStatus } from "../types/habit";
import type { HabitLog as DbHabitLogRow } from "../types/entities";
import { mockHabitLogs } from "../data/mockHabitLogs";
import { mockCategories } from "../data/mockCategories";
import { activeHabits, archivedHabits, getHabitById, mockHabits, pausedHabits } from "../data/mockHabits";
import { TODAY as MOCK_TODAY } from "../data/referenceDate";
import { addDays, formatWeekdayLabel, toDateOnly } from "../utils/formatDate";
import { calculateBestStreak, calculateCurrentStreak } from "../utils/streaks";
import { isSupabaseDataSource } from "../lib/dataSource";
import { normalizeSupabaseError } from "../lib/errors";
import { habitLogsService } from "../services/habitLogs.service";
import { useHabits } from "./useHabits";
import { useCategories } from "./useCategories";

export type StatisticsPeriod = 7 | 30 | 90;

export interface StatisticsHabitOption {
  id: string;
  name: string;
}

export interface StatisticsCategoryOption {
  id: string;
  name: string;
}

const WEEKDAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// MOCK_TODAY (src/data/referenceDate.ts) es una fecha fija de la era mock.
// En modo Supabase todo cálculo de "hoy" debe partir de la fecha real —
// mismo motivo ya documentado en useHistoryLogs.ts (DEFAULT_REFERENCE_DATE)
// y HistoryCalendar.tsx.
const TODAY = isSupabaseDataSource ? toDateOnly(new Date()) : MOCK_TODAY;

// Mismo criterio ya usado por useHistoryLogs.ts/useStatistics.ts (mock):
// excluye únicamente hábitos eliminados. Se conserva deliberadamente
// idéntico entre mock y Supabase — la especificación (MDs/04, sección
// Estadísticas) no distingue activos/pausados/archivados para "Comparación
// por hábito", así que no se introduce un filtro nuevo no pedido.
function isComparisonEligible(habit: Habit): boolean {
  return habit.lifecycleStatus !== "deleted";
}

// Igual que el mock (streakEligibleHabits): las rachas solo consideran
// hábitos activos o pausados — un hábito archivado no debería seguir
// "compitiendo" por una racha vigente.
function isStreakEligible(habit: Habit): boolean {
  return habit.lifecycleStatus === "active" || habit.lifecycleStatus === "paused";
}

interface LogWithHabit {
  date: string;
  status: HabitStatus;
  habitId: string;
}

// ----------------------------------------------------------------------------
// Funciones puras de agregación — reciben el conjunto de origen (mock o
// Supabase) como parámetro en vez de leer un array global, para no duplicar
// la lógica de cálculo entre los dos modos (mismo patrón ya usado en
// useHistoryLogs.ts).
// ----------------------------------------------------------------------------

/**
 * Definición de cumplimiento (única, documentada en MDs/12): numerador =
 * completed(1) + partial(0.5); denominador = completed + partial +
 * not_completed (not_applicable excluido de ambos); ausencia de log no
 * participa (no hay fila que sumar ni restar); si el denominador es 0,
 * el resultado es 0%, nunca NaN.
 */
function dayRate(logs: LogWithHabit[]): number {
  const applicable = logs.filter((log) => log.status !== "not_applicable");
  if (applicable.length === 0) return 0;
  const weighted = applicable.reduce((sum, log) => {
    if (log.status === "completed") return sum + 1;
    if (log.status === "partial") return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((weighted / applicable.length) * 100);
}

// Decisión explícita (sección 9 del encargo): las series temporales/
// agregadas (KPIs, dailyRates, statusBreakdown, consistencia) SÍ conservan
// los logs de hábitos hoy "deleted" — un hábito eliminado no debe borrar su
// huella histórica de "qué tan cumplidor fui esas semanas". La exclusión de
// hábitos eliminados se aplica únicamente en el ranking "Comparación entre
// hábitos" (habitComparison, más abajo), a través de `statisticsHabits`, que
// sí los excluye — un hábito que ya no existe no debería competir en un
// ranking accionable. Difiere deliberadamente del mock anterior (que
// excluía logs de hábitos eliminados en TODAS las series, incluidas las
// temporales) — cambio aplicado a ambos modos por igual, documentado en
// MDs/12.
function filterLogsFrom(
  source: LogWithHabit[],
  habitsById: Map<string, Habit>,
  habitId: string,
  categoryId: string,
  from: string,
  to: string,
): LogWithHabit[] {
  return source
    .filter((log) => log.date >= from && log.date <= to)
    .filter((log) => habitId === "all" || log.habitId === habitId)
    .filter((log) => {
      if (categoryId === "all") return true;
      const habit = habitsById.get(log.habitId);
      return habit?.categoryIds.includes(categoryId) ?? false;
    });
}

function statusOnDate(logsByHabit: Map<string, Map<string, HabitStatus>>, habitId: string, date: string): HabitStatus {
  return logsByHabit.get(habitId)?.get(date) ?? "pending";
}

// Copias deliberadas de calculateCurrentStreak/calculateBestStreak
// (utils/streaks.ts), parametrizadas por un lookup de logs reales y por la
// fecha de referencia real, en vez de leer mockHabitLogs/TODAY fijo.
// utils/streaks.ts es compartido con el módulo de Hábitos ya congelado
// (HabitCard.tsx/HabitsPage.tsx lo llaman sin ninguna rama mock/Supabase) —
// modificarlo excede el alcance de esta tarea y arriesgaría ese módulo. En
// modo mock esta función sigue usando exactamente calculateCurrentStreak/
// calculateBestStreak originales, sin ningún cambio de comportamiento.
export function computeCurrentStreakReal(habit: Habit, logsByHabit: Map<string, Map<string, HabitStatus>>, today: string): number {
  let streak = 0;
  let badRun = 0;
  let date = today;

  while (date >= habit.startDate) {
    const status = statusOnDate(logsByHabit, habit.id, date);
    if (date === today && status === "pending") {
      date = addDays(date, -1);
      continue;
    }
    if (status === "not_applicable") {
      date = addDays(date, -1);
      continue;
    }
    if (status === "completed") {
      streak += 1;
      badRun = 0;
    } else {
      badRun += 1;
      if (badRun >= 2) break;
    }
    date = addDays(date, -1);
  }

  return streak;
}

export function computeBestStreakReal(habit: Habit, logsByHabit: Map<string, Map<string, HabitStatus>>, today: string): number {
  let current = 0;
  let best = 0;
  let badRun = 0;
  let date = habit.startDate;

  while (date <= today) {
    const status = statusOnDate(logsByHabit, habit.id, date);
    if (status === "not_applicable" || (date === today && status === "pending")) {
      date = addDays(date, 1);
      continue;
    }
    if (status === "completed") {
      current += 1;
      badRun = 0;
      best = Math.max(best, current);
    } else {
      badRun += 1;
      if (badRun >= 2) {
        current = 0;
        badRun = 0;
      }
    }
    date = addDays(date, 1);
  }

  return best;
}

/**
 * Estadísticas: vista de consulta pura sobre habit_logs/habits/categories ya
 * existentes. Nunca escribe nada (ni logs, ni hábitos, ni metas, ni
 * snapshots). No muestra progreso de metas: la pantalla de Estadísticas
 * (MDs/04, sección 5) nunca contempló goals — solo KPIs/gráficas basadas en
 * habit_logs — así que este hook tampoco los toca.
 *
 * Reutiliza habitLogsService.getHabitLogsHistory() (ya existente, creado
 * para Historial) — un único fetch de todo el historial propio, sin
 * duplicar consultas ni hacer N+1. Reutiliza useHabits()/useCategories() ya
 * conectados para el join visual y las listas de opciones de filtro.
 *
 * `initialPeriod` (por defecto 30, igual que antes — cambio 100%
 * retrocompatible) permite a un consumidor que compone este hook (p. ej.
 * useDashboard.ts) arrancar con un periodo distinto sin duplicar ningún
 * fetch ni recalcular nada dos veces.
 */
export function useStatistics(initialPeriod: StatisticsPeriod = 30) {
  const [period, setPeriod] = useState<StatisticsPeriod>(initialPeriod);
  const [habitId, setHabitId] = useState("all");
  const [categoryId, setCategoryId] = useState("all");

  // ---- Solo modo Supabase ----
  const { habits: allHabits, loading: habitsLoading, error: habitsErrorMessage } = useHabits();
  const { categories, loading: categoriesLoading, error: categoriesErrorMessage } = useCategories();
  const [dbLogs, setDbLogs] = useState<DbHabitLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(isSupabaseDataSource);
  const [logsError, setLogsError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseDataSource) return;
    setLogsLoading(true);
    setLogsError(null);
    try {
      const rows = await habitLogsService.getHabitLogsHistory();
      setDbLogs(rows);
    } catch (caught) {
      setLogsError(normalizeSupabaseError(caught).friendlyMessage);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  // Mismo motivo que useHistoryLogs.ts/useHabits.ts: no se llama a refresh()
  // aquí para no disparar "react-hooks/set-state-in-effect". `logsLoading`
  // ya nace en `true` cuando isSupabaseDataSource.
  useEffect(() => {
    if (!isSupabaseDataSource) return;
    let cancelled = false;

    habitLogsService
      .getHabitLogsHistory()
      .then((rows) => {
        if (!cancelled) setDbLogs(rows);
      })
      .catch((caught) => {
        if (!cancelled) setLogsError(normalizeSupabaseError(caught).friendlyMessage);
      })
      .finally(() => {
        if (!cancelled) setLogsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Conjunto único de origen: todo el historial propio, sin recortar por
  // fecha — el resto de agregaciones (periodo, consistencia, rachas) filtran
  // este mismo array, igual que ya hace el mock con mockHabitLogs.
  const allLogs = useMemo<LogWithHabit[]>(() => {
    if (!isSupabaseDataSource) {
      return mockHabitLogs.map((log) => ({ date: log.date, status: log.status, habitId: log.habitId }));
    }
    return dbLogs.map((row) => ({ date: row.date, status: row.status, habitId: row.habit_id }));
  }, [dbLogs]);

  const habitsById = useMemo<Map<string, Habit>>(() => {
    const source = isSupabaseDataSource ? allHabits : mockHabits;
    return new Map(source.map((habit) => [habit.id, habit]));
  }, [allHabits]);

  // Lookup habitId -> fecha -> status, para las rachas (evita recorrer/
  // filtrar el array completo por cada día caminado).
  const logsByHabit = useMemo(() => {
    const map = new Map<string, Map<string, HabitStatus>>();
    for (const log of allLogs) {
      let byDate = map.get(log.habitId);
      if (!byDate) {
        byDate = new Map();
        map.set(log.habitId, byDate);
      }
      byDate.set(log.date, log.status);
    }
    return map;
  }, [allLogs]);

  // Mismo criterio que el mock (statisticsHabits): todos los hábitos propios
  // salvo los eliminados — usado tanto para el <select> de hábito como para
  // "Comparación entre hábitos".
  const statisticsHabits = useMemo<Habit[]>(() => {
    if (!isSupabaseDataSource) return [...activeHabits, ...pausedHabits, ...archivedHabits];
    return allHabits.filter(isComparisonEligible);
  }, [allHabits]);

  const streakEligibleHabits = useMemo<Habit[]>(() => {
    if (!isSupabaseDataSource) return [...activeHabits, ...pausedHabits];
    return allHabits.filter(isStreakEligible);
  }, [allHabits]);

  const habitOptions = useMemo<StatisticsHabitOption[]>(
    () => statisticsHabits.map((habit) => ({ id: habit.id, name: habit.name })),
    [statisticsHabits],
  );

  const categoryOptions = useMemo<StatisticsCategoryOption[]>(() => {
    if (!isSupabaseDataSource) {
      return mockCategories.map((category) => ({ id: category.id, name: category.name }));
    }
    return categories.filter((category) => category.lifecycleStatus !== "deleted").map((category) => ({ id: category.id, name: category.name }));
  }, [categories]);

  function ratesInWindow(days: number): number {
    const since = addDays(TODAY, -(days - 1));
    const logs = filterLogsFrom(allLogs, habitsById, habitId, categoryId, since, TODAY);
    return dayRate(logs);
  }

  const periodStart = addDays(TODAY, -(period - 1));
  const periodLogs = useMemo(
    () => filterLogsFrom(allLogs, habitsById, habitId, categoryId, periodStart, TODAY),
    [allLogs, habitsById, habitId, categoryId, periodStart],
  );

  const dailyRates = useMemo(() => {
    return Array.from({ length: period }, (_, index) => {
      const date = addDays(periodStart, index);
      const logsForDay = periodLogs.filter((log) => log.date === date);
      return { date, label: formatWeekdayLabel(date), completionRate: dayRate(logsForDay) };
    });
  }, [period, periodStart, periodLogs]);

  const statusBreakdown = useMemo(() => {
    const statuses: HabitStatus[] = ["pending", "completed", "partial", "not_completed", "not_applicable"];
    return statuses.map((status) => ({
      status,
      count: periodLogs.filter((log) => log.status === status).length,
    }));
  }, [periodLogs]);

  const CONSISTENCY_WEEKS = 8;
  const consistency = useMemo(() => {
    const totalDays = CONSISTENCY_WEEKS * 7;
    const todayWeekday = (new Date(`${TODAY}T00:00:00`).getDay() + 6) % 7; // 0 = lunes
    const daysUntilWeekEnd = 6 - todayWeekday;
    const windowEnd = addDays(TODAY, daysUntilWeekEnd);

    return Array.from({ length: totalDays }, (_, index) => {
      const date = addDays(windowEnd, index - (totalDays - 1));
      const logsForDay = filterLogsFrom(allLogs, habitsById, habitId, categoryId, date, date);
      return { date, completionRate: dayRate(logsForDay), hasData: logsForDay.length > 0 && date <= TODAY };
    });
  }, [allLogs, habitsById, habitId, categoryId]);

  const trend = useMemo(() => {
    const points = 8;
    if (dailyRates.length <= points) return dailyRates.map((point) => point.completionRate);
    return Array.from({ length: points }, (_, index) => {
      const bucketStart = Math.floor((index * dailyRates.length) / points);
      const bucketEnd = Math.max(bucketStart + 1, Math.floor(((index + 1) * dailyRates.length) / points));
      const bucket = dailyRates.slice(bucketStart, bucketEnd);
      return Math.round(bucket.reduce((sum, point) => sum + point.completionRate, 0) / bucket.length);
    });
  }, [dailyRates]);

  const habitComparison = useMemo(() => {
    if (habitId !== "all") return [];
    return statisticsHabits
      .filter((habit) => categoryId === "all" || habit.categoryIds.includes(categoryId))
      .map((habit) => {
        const logs = periodLogs.filter((log) => log.habitId === habit.id);
        return {
          habitId: habit.id,
          habitName: habit.name,
          color: habit.color,
          icon: habit.icon,
          completionRate: dayRate(logs),
        };
      })
      .sort((a, b) => b.completionRate - a.completionRate);
  }, [statisticsHabits, habitId, categoryId, periodLogs]);

  const bestAndWorstWeekday = useMemo(() => {
    const totals = Array.from({ length: 7 }, () => ({ weighted: 0, count: 0 }));
    periodLogs
      .filter((log) => log.status !== "not_applicable")
      .forEach((log) => {
        const weekday = new Date(`${log.date}T00:00:00`).getDay();
        totals[weekday].count += 1;
        if (log.status === "completed") totals[weekday].weighted += 1;
        if (log.status === "partial") totals[weekday].weighted += 0.5;
      });

    const rates = totals.map((entry, index) => ({
      weekday: WEEKDAY_NAMES[index],
      rate: entry.count > 0 ? Math.round((entry.weighted / entry.count) * 100) : null,
    }));

    const withData = rates.filter((entry) => entry.rate !== null) as { weekday: string; rate: number }[];
    if (withData.length === 0) return { best: null, worst: null };

    const best = withData.reduce((max, entry) => (entry.rate > max.rate ? entry : max));
    const worst = withData.reduce((min, entry) => (entry.rate < min.rate ? entry : min));
    return { best, worst };
  }, [periodLogs]);

  const streaks = useMemo(() => {
    const pool = habitId === "all" ? streakEligibleHabits : streakEligibleHabits.filter((habit) => habit.id === habitId);
    if (pool.length === 0) return { current: 0, best: 0 };

    if (!isSupabaseDataSource) {
      return {
        current: Math.max(...pool.map((habit) => calculateCurrentStreak(habit))),
        best: Math.max(...pool.map((habit) => calculateBestStreak(habit))),
      };
    }

    return {
      current: Math.max(...pool.map((habit) => computeCurrentStreakReal(habit, logsByHabit, TODAY))),
      best: Math.max(...pool.map((habit) => computeBestStreakReal(habit, logsByHabit, TODAY))),
    };
  }, [habitId, streakEligibleHabits, logsByHabit]);

  const kpis = {
    daily: ratesInWindow(1),
    weekly: ratesInWindow(7),
    monthly: ratesInWindow(30),
    bestWeekday: bestAndWorstWeekday.best,
    worstWeekday: bestAndWorstWeekday.worst,
    currentStreak: streaks.current,
    bestStreak: streaks.best,
  };

  const selectedHabit = habitId === "all" ? undefined : (isSupabaseDataSource ? habitsById.get(habitId) : getHabitById(habitId));
  const habitLogCount = habitId === "all" ? periodLogs.length : allLogs.filter((log) => log.habitId === habitId).length;

  const loading = isSupabaseDataSource && (logsLoading || habitsLoading || categoriesLoading);
  const error = isSupabaseDataSource ? (logsError ?? habitsErrorMessage ?? categoriesErrorMessage) : null;

  return {
    period,
    habitId,
    categoryId,
    setPeriod,
    setHabitId,
    setCategoryId,
    dailyRates,
    trend,
    statusBreakdown,
    consistency,
    habitComparison,
    kpis,
    isPeriodEmpty: periodLogs.length === 0,
    hasInsufficientHistory: Boolean(selectedHabit) && habitLogCount < 5,
    habitOptions,
    categoryOptions,
    loading,
    error,
    refresh,
    // Superficie adicional, solo para composición (useDashboard.ts): ya
    // están calculados/fetcheados internamente, así que exponerlos no
    // agrega ningún fetch ni cálculo nuevo. StatisticsPage.tsx los ignora.
    allHabits: isSupabaseDataSource ? allHabits : mockHabits,
    habitsById,
    logsByHabit,
    dbLogs,
  };
}
