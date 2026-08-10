import { useCallback, useEffect, useMemo, useState } from "react";
import type { Habit, HabitLog, HabitStatus } from "../types/habit";
import type { HabitLog as DbHabitLogRow } from "../types/entities";
import { mockHabitLogs } from "../data/mockHabitLogs";
import { getHabitById, mockHabits } from "../data/mockHabits";
import { TODAY } from "../data/referenceDate";
import { addDays, daysBetween, toDateOnly } from "../utils/formatDate";
import { EDITABLE_WINDOW_DAYS, isLogEditable } from "../utils/dateRestrictions";
import { calculatePercentage, isGoalExceeded } from "../utils/calculateProgress";
import { isSupabaseDataSource } from "../lib/dataSource";
import { normalizeSupabaseError } from "../lib/errors";
import { habitLogsService } from "../services/habitLogs.service";
import { useHabits } from "./useHabits";
import { useCategories } from "./useCategories";
import type { StatusFilterValue } from "./useDailyChecklist";

// Motivo real de por qué un registro es de solo lectura (BUG-003). Un
// registro puede incumplir más de una condición a la vez (p. ej. hábito
// archivado + log con más de 7 días); getReadOnlyReason aplica una
// precedencia estable: primero el lifecycle del hábito (una decisión
// deliberada del usuario que por sí sola ya explica el bloqueo, sin
// importar la fecha), y solo si el hábito sigue activo se evalúa la
// ventana temporal. Única fuente de verdad: HistoryTable no reimplementa
// esta lógica, solo traduce el motivo ya resuelto a un mensaje.
export type HistoryReadOnlyReason = "habit_paused" | "habit_archived" | "outside_edit_window";

const READ_ONLY_REASON_MESSAGES: Record<HistoryReadOnlyReason, string> = {
  habit_paused: "Registro de solo lectura: el hábito está pausado.",
  habit_archived: "Registro de solo lectura: el hábito está archivado.",
  outside_edit_window: `Registro de solo lectura: tiene más de ${EDITABLE_WINDOW_DAYS} días de antigüedad.`,
};

export function getReadOnlyReasonMessage(reason: HistoryReadOnlyReason): string {
  return READ_ONLY_REASON_MESSAGES[reason];
}

function getReadOnlyReason(lifecycleStatus: Habit["lifecycleStatus"], isWithinEditWindow: boolean): HistoryReadOnlyReason | null {
  if (lifecycleStatus === "paused") return "habit_paused";
  if (lifecycleStatus === "archived") return "habit_archived";
  if (!isWithinEditWindow) return "outside_edit_window";
  return null;
}

export interface HistoryEntry {
  log: HabitLog;
  habit: Habit;
  isEditable: boolean;
  // Motivo exacto de solo lectura (BUG-003). `null` cuando isEditable es
  // true. No confundir con isEditable: esto es la RAZÓN, no la decisión.
  readOnlyReason: HistoryReadOnlyReason | null;
  percentage?: number;
  goalExceeded: boolean;
  // Meta objetivo a mostrar para esta fila concreta. En modo mock es
  // habit.targetValue/targetUnit (el mock nunca tuvo columnas *_snapshot).
  // En modo Supabase es SIEMPRE target_value_snapshot/target_unit_snapshot
  // del propio habit_log — nunca el valor vigente del hábito — para que un
  // cambio posterior de meta/unidad no reescriba el pasado (punto 7 de esta
  // tarea). HistoryTable/HistoryCalendar/exportHistory leen estos campos en
  // vez de entry.habit.targetValue/targetUnit.
  targetValue?: number;
  targetUnit?: string;
}

export interface HistoryRangeSummary {
  percentage: number;
  completed: number;
  partial: number;
  goalsExceeded: number;
  total: number;
}

export type HistoryView = "table" | "calendar";

export interface HistoryHabitOption {
  id: string;
  name: string;
}

export interface HistoryCategoryOption {
  id: string;
  name: string;
}

const PAGE_SIZE = 8;

/** Sin filtro por fecha: eso lo hacen por separado computeRangeSummary /
 * computeDailyTrend / el filtrado de `entries` más abajo, cada uno con su
 * propio rango. */
function matchesFilters(entry: HistoryEntry, habitId: string, categoryId: string, status: StatusFilterValue): boolean {
  if (habitId !== "all" && entry.habit.id !== habitId) return false;
  if (categoryId !== "all" && !entry.habit.categoryIds.includes(categoryId)) return false;
  if (status !== "all" && entry.log.status !== status) return false;
  return true;
}

function computeRangeSummary(
  source: HistoryEntry[],
  from: string,
  to: string,
  habitId: string,
  categoryId: string,
  status: StatusFilterValue,
): HistoryRangeSummary {
  let completed = 0;
  let partial = 0;
  let applicableCount = 0;
  let goalsExceeded = 0;
  let total = 0;

  for (const entry of source) {
    if (entry.log.date < from || entry.log.date > to) continue;
    if (!matchesFilters(entry, habitId, categoryId, status)) continue;
    total += 1;
    if (entry.log.status !== "not_applicable") {
      applicableCount += 1;
      if (entry.log.status === "completed") completed += 1;
      if (entry.log.status === "partial") partial += 1;
    }
    if (entry.goalExceeded) goalsExceeded += 1;
  }

  const percentage = applicableCount > 0 ? Math.round((completed / applicableCount) * 100) : 0;
  return { percentage, completed, partial, goalsExceeded, total };
}

/** Tasa de cumplimiento diaria dentro del rango, muestreada a `points`
 * valores — para las mini-gráficas de las tarjetas KPI, respetando los
 * mismos filtros que la tabla. */
function computeDailyTrend(
  source: HistoryEntry[],
  from: string,
  to: string,
  habitId: string,
  categoryId: string,
  status: StatusFilterValue,
  points = 8,
): number[] {
  const spanDays = Math.max(1, daysBetween(from, to) + 1);
  const dailyRates: number[] = [];

  for (let offset = 0; offset < spanDays; offset += 1) {
    const date = addDays(from, offset);
    let weighted = 0;
    let applicable = 0;
    for (const entry of source) {
      if (entry.log.date !== date) continue;
      if (!matchesFilters(entry, habitId, categoryId, status) || entry.log.status === "not_applicable") continue;
      applicable += 1;
      if (entry.log.status === "completed") weighted += 1;
      else if (entry.log.status === "partial") weighted += 0.5;
    }
    dailyRates.push(applicable > 0 ? Math.round((weighted / applicable) * 100) : 0);
  }

  if (dailyRates.length <= points) return dailyRates;

  return Array.from({ length: points }, (_, index) => {
    const bucketStart = Math.floor((index * dailyRates.length) / points);
    const bucketEnd = Math.max(bucketStart + 1, Math.floor(((index + 1) * dailyRates.length) / points));
    const bucket = dailyRates.slice(bucketStart, bucketEnd);
    return Math.round(bucket.reduce((sum, value) => sum + value, 0) / bucket.length);
  });
}

function delta(current: number, previous: number): { value: number; direction: "up" | "down" } {
  return { value: current - previous, direction: current >= previous ? "up" : "down" };
}

function buildMockEntry(log: HabitLog, habit: Habit): HistoryEntry {
  const percentage =
    habit.targetValue && log.value !== undefined ? calculatePercentage(log.value, habit.targetValue) : undefined;
  const readOnlyReason = getReadOnlyReason(habit.lifecycleStatus, isLogEditable(log.date, TODAY));
  return {
    log,
    habit,
    isEditable: readOnlyReason === null,
    readOnlyReason,
    percentage,
    goalExceeded: Boolean(habit.targetValue && log.value !== undefined && isGoalExceeded(log.value, habit.targetValue)),
    targetValue: habit.targetValue,
    targetUnit: habit.targetUnit,
  };
}

// Misma ventana real de 7 días que enforce_habit_log_edit_window_trg (D-06):
// hoy y los 6 días naturales anteriores, ambos inclusive. Copia deliberada
// de isWithinRealEditWindow (useDailyChecklist.ts) — esa función no está
// exportada y esta tarea prohíbe modificar useDailyChecklist.ts.
function isWithinRealEditWindow(date: string, today: string): boolean {
  if (date > today) return false;
  return date >= addDays(today, -6);
}

function buildSupabaseEntry(row: DbHabitLogRow, habit: Habit, todayReference: string): HistoryEntry {
  const value = row.value ?? undefined;
  const targetValue = row.target_value_snapshot ?? undefined;
  const targetUnit = row.target_unit_snapshot ?? undefined;
  const percentage = targetValue && value !== undefined ? calculatePercentage(value, targetValue) : undefined;
  const readOnlyReason = getReadOnlyReason(habit.lifecycleStatus, isWithinRealEditWindow(row.date, todayReference));

  return {
    log: {
      id: row.id,
      habitId: row.habit_id,
      date: row.date,
      status: row.status,
      value,
      note: row.note ?? undefined,
      recordedTime: row.recorded_time ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    habit,
    isEditable: readOnlyReason === null,
    readOnlyReason,
    percentage,
    goalExceeded: Boolean(targetValue && value !== undefined && isGoalExceeded(value, targetValue)),
    targetValue,
    targetUnit,
  };
}

/**
 * Historial: vista de consulta pura sobre habit_logs ya existentes. Nunca
 * crea/edita/borra (eso lo sigue haciendo exclusivamente Checklist, vía
 * updateHabitLog/deleteHabitLog — HistoryTable ya enlaza a
 * /checklist?date=... para editar, sin ningún formulario propio). Nunca
 * genera días vacíos ni recalcula si un hábito "debía" existir en una fecha:
 * solo agrupa/filtra las filas que ya están en la base de datos. Nunca toca
 * `goals`.
 *
 * Alterna mock/Supabase según VITE_DATA_SOURCE, igual que el resto de los
 * hooks del proyecto. En modo Supabase reutiliza useHabits()/useCategories()
 * (ya conectados) para el join visual y las listas de opciones de filtro —
 * nunca importa mocks de hábitos/categorías directamente.
 */
// TODAY (src/data/referenceDate.ts) es una fecha fija de la era mock, usada
// para que el histórico simulado sea coherente. En modo Supabase el rango
// por defecto debe partir de la fecha real de hoy — igual que
// DailyChecklistPage ya hace para su propio "defaultDate" — o el filtro
// inicial excluiría cualquier habit_log real recién creado.
const DEFAULT_REFERENCE_DATE = isSupabaseDataSource ? toDateOnly(new Date()) : TODAY;

export function useHistoryLogs() {
  const [dateFrom, setDateFrom] = useState(addDays(DEFAULT_REFERENCE_DATE, -29));
  const [dateTo, setDateTo] = useState(DEFAULT_REFERENCE_DATE);
  const [habitId, setHabitId] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [status, setStatus] = useState<StatusFilterValue>("all");
  const [view, setView] = useState<HistoryView>("table");
  const [page, setPage] = useState(1);

  const filterKey = `${dateFrom}|${dateTo}|${habitId}|${categoryId}|${status}`;
  const [previousFilterKey, setPreviousFilterKey] = useState(filterKey);
  if (filterKey !== previousFilterKey) {
    setPreviousFilterKey(filterKey);
    setPage(1);
  }

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

  // Mismo motivo que useHabits.ts/useCategories.ts: no se llama a refresh()
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

  const todayReference = isSupabaseDataSource ? toDateOnly(new Date()) : TODAY;

  // Conjunto completo (todas las fechas, sin recorte por dateFrom/dateTo):
  // fuente única tanto para la tabla (filtrada más abajo) como para el
  // calendario, que navega libremente por mes sin depender del rango de la
  // tabla — igual que el diseño original en modo mock (mockHabitLogs es un
  // único arreglo global usado por ambas vistas).
  const sourceEntries = useMemo<HistoryEntry[]>(() => {
    if (!isSupabaseDataSource) {
      return mockHabitLogs
        .map((log) => ({ log, habit: getHabitById(log.habitId) }))
        .filter((item): item is { log: HabitLog; habit: Habit } => item.habit !== undefined && item.habit.lifecycleStatus !== "deleted")
        .map(({ log, habit }) => buildMockEntry(log, habit));
    }

    const habitById = new Map(allHabits.map((habit) => [habit.id, habit]));
    return dbLogs
      .map((row) => ({ row, habit: habitById.get(row.habit_id) }))
      .filter((item): item is { row: DbHabitLogRow; habit: Habit } => item.habit !== undefined && item.habit.lifecycleStatus !== "deleted")
      .map(({ row, habit }) => buildSupabaseEntry(row, habit, todayReference));
  }, [allHabits, dbLogs, todayReference]);

  const habitOptions = useMemo<HistoryHabitOption[]>(() => {
    const source = isSupabaseDataSource ? allHabits : mockHabits;
    return source
      .filter((habit) => habit.lifecycleStatus !== "deleted")
      .map((habit) => ({ id: habit.id, name: habit.name }));
  }, [allHabits]);

  const categoryOptions = useMemo<HistoryCategoryOption[]>(
    () => categories.filter((category) => category.lifecycleStatus !== "deleted").map((category) => ({ id: category.id, name: category.name })),
    [categories],
  );

  // Orden por defecto: fecha descendente y, dentro del mismo día, nombre de
  // hábito ascendente — comparador total (nunca hay empate real, salvo dos
  // hábitos con el mismo nombre exacto, lo que ya está prohibido a nivel de
  // base de datos por hábito activo), así el resultado es estable.
  const entries = useMemo<HistoryEntry[]>(() => {
    return sourceEntries
      .filter((entry) => entry.log.date >= dateFrom && entry.log.date <= dateTo)
      .filter((entry) => matchesFilters(entry, habitId, categoryId, status))
      .sort((a, b) => {
        if (a.log.date !== b.log.date) return a.log.date > b.log.date ? -1 : 1;
        return a.habit.name.localeCompare(b.habit.name, "es");
      });
  }, [sourceEntries, dateFrom, dateTo, habitId, categoryId, status]);

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const paginatedEntries = useMemo(() => entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [entries, page]);

  const summary = useMemo(
    () => computeRangeSummary(sourceEntries, dateFrom, dateTo, habitId, categoryId, status),
    [sourceEntries, dateFrom, dateTo, habitId, categoryId, status],
  );

  const comparison = useMemo(() => {
    const spanDays = daysBetween(dateFrom, dateTo) + 1;
    const previousTo = addDays(dateFrom, -1);
    const previousFrom = addDays(previousTo, -(spanDays - 1));
    const previous = computeRangeSummary(sourceEntries, previousFrom, previousTo, habitId, categoryId, status);
    const trend = computeDailyTrend(sourceEntries, dateFrom, dateTo, habitId, categoryId, status);

    return {
      trend,
      percentageDelta: delta(summary.percentage, previous.percentage),
      completedDelta: delta(summary.completed, previous.completed),
      partialDelta: delta(summary.partial, previous.partial),
      goalsExceededDelta: delta(summary.goalsExceeded, previous.goalsExceeded),
    };
  }, [sourceEntries, dateFrom, dateTo, habitId, categoryId, status, summary]);

  const loading = isSupabaseDataSource && (logsLoading || habitsLoading || categoriesLoading);
  const error = isSupabaseDataSource ? (logsError ?? habitsErrorMessage ?? categoriesErrorMessage) : null;

  return {
    dateFrom,
    dateTo,
    habitId,
    categoryId,
    status,
    view,
    page,
    totalPages,
    pageSize: PAGE_SIZE,
    setDateFrom,
    setDateTo,
    setHabitId,
    setCategoryId,
    setStatus,
    setView,
    setPage,
    entries,
    paginatedEntries,
    // Conjunto completo (todas las fechas), para HistoryCalendar — que
    // navega mes a mes independientemente del rango dateFrom/dateTo.
    allEntries: sourceEntries,
    summary,
    comparison,
    habitOptions,
    categoryOptions,
    loading,
    error,
    refresh,
  };
}

export function statusToDayRate(logs: HabitLog[]): number {
  const applicable = logs.filter((log) => log.status !== "not_applicable");
  if (applicable.length === 0) return 0;
  const weighted = applicable.reduce((sum, log) => {
    if (log.status === "completed") return sum + 1;
    if (log.status === "partial") return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((weighted / applicable.length) * 100);
}

export function getEntriesForDay(source: HistoryEntry[], date: string, habitId: string, categoryId: string): HistoryEntry[] {
  return source.filter((entry) => entry.log.date === date && matchesFilters(entry, habitId, categoryId, "all"));
}

export function getStatusCountsForDate(source: HistoryEntry[], date: string): Record<HabitStatus, number> {
  return source
    .filter((entry) => entry.log.date === date)
    .reduce(
      (acc, entry) => {
        acc[entry.log.status] += 1;
        return acc;
      },
      { pending: 0, completed: 0, partial: 0, not_completed: 0, not_applicable: 0 } as Record<HabitStatus, number>,
    );
}
