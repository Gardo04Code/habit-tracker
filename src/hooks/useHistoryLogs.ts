import { useMemo, useState } from "react";
import type { Habit, HabitLog, HabitStatus } from "../types/habit";
import { mockHabitLogs } from "../data/mockHabitLogs";
import { getHabitById, mockHabits } from "../data/mockHabits";
import { TODAY } from "../data/referenceDate";
import { addDays, daysBetween } from "../utils/formatDate";
import { isLogEditable } from "../utils/dateRestrictions";
import { calculatePercentage, isGoalExceeded } from "../utils/calculateProgress";
import type { StatusFilterValue } from "./useDailyChecklist";

export interface HistoryEntry {
  log: HabitLog;
  habit: Habit;
  isEditable: boolean;
  percentage?: number;
  goalExceeded: boolean;
}

export interface HistoryRangeSummary {
  percentage: number;
  completed: number;
  partial: number;
  goalsExceeded: number;
  total: number;
}

export type HistoryView = "table" | "calendar";

export const browsableHabits = mockHabits.filter((habit) => habit.lifecycleStatus !== "deleted");

const PAGE_SIZE = 8;

function matchesFilters(
  log: HabitLog,
  habitId: string,
  categoryId: string,
  status: StatusFilterValue,
): { habit: Habit } | null {
  const habit = getHabitById(log.habitId);
  if (!habit || habit.lifecycleStatus === "deleted") return null;
  if (habitId !== "all" && habit.id !== habitId) return null;
  if (categoryId !== "all" && !habit.categoryIds.includes(categoryId)) return null;
  if (status !== "all" && log.status !== status) return null;
  return { habit };
}

function computeRangeSummary(
  from: string,
  to: string,
  habitId: string,
  categoryId: string,
  status: StatusFilterValue,
): HistoryRangeSummary {
  const logs = mockHabitLogs.filter((log) => log.date >= from && log.date <= to);
  let completed = 0;
  let partial = 0;
  let applicableCount = 0;
  let goalsExceeded = 0;
  let total = 0;

  for (const log of logs) {
    const match = matchesFilters(log, habitId, categoryId, status);
    if (!match) continue;
    total += 1;
    if (log.status !== "not_applicable") {
      applicableCount += 1;
      if (log.status === "completed") completed += 1;
      if (log.status === "partial") partial += 1;
    }
    if (match.habit.targetValue && log.value !== undefined && isGoalExceeded(log.value, match.habit.targetValue)) {
      goalsExceeded += 1;
    }
  }

  const percentage = applicableCount > 0 ? Math.round((completed / applicableCount) * 100) : 0;
  return { percentage, completed, partial, goalsExceeded, total };
}

/** Tasa de cumplimiento diaria dentro del rango, muestreada a `points`
 * valores — para las mini-gráficas de las tarjetas KPI, respetando los
 * mismos filtros que la tabla. */
function computeDailyTrend(
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
    const dayLogs = mockHabitLogs.filter((log) => log.date === date);
    let weighted = 0;
    let applicable = 0;
    for (const log of dayLogs) {
      const match = matchesFilters(log, habitId, categoryId, status);
      if (!match || log.status === "not_applicable") continue;
      applicable += 1;
      if (log.status === "completed") weighted += 1;
      else if (log.status === "partial") weighted += 0.5;
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

export function useHistoryLogs() {
  const [dateFrom, setDateFrom] = useState(addDays(TODAY, -29));
  const [dateTo, setDateTo] = useState(TODAY);
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

  const filteredEntries = useMemo<HistoryEntry[]>(() => {
    return mockHabitLogs
      .filter((log) => log.date >= dateFrom && log.date <= dateTo)
      .map((log) => ({ log, habit: getHabitById(log.habitId) }))
      .filter((item): item is { log: HabitLog; habit: Habit } => item.habit !== undefined && item.habit.lifecycleStatus !== "deleted")
      .filter((item) => habitId === "all" || item.habit.id === habitId)
      .filter((item) => categoryId === "all" || item.habit.categoryIds.includes(categoryId))
      .filter((item) => status === "all" || item.log.status === status)
      .map(({ log, habit }) => {
        const percentage =
          habit.targetValue && log.value !== undefined ? calculatePercentage(log.value, habit.targetValue) : undefined;
        return {
          log,
          habit,
          isEditable: habit.lifecycleStatus === "active" && isLogEditable(log.date, TODAY),
          percentage,
          goalExceeded: Boolean(habit.targetValue && log.value !== undefined && isGoalExceeded(log.value, habit.targetValue)),
        };
      })
      .sort((a, b) => (a.log.date > b.log.date ? -1 : 1));
  }, [dateFrom, dateTo, habitId, categoryId, status]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const paginatedEntries = useMemo(
    () => filteredEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredEntries, page],
  );

  const summary = useMemo(
    () => computeRangeSummary(dateFrom, dateTo, habitId, categoryId, status),
    [dateFrom, dateTo, habitId, categoryId, status],
  );

  const comparison = useMemo(() => {
    const spanDays = daysBetween(dateFrom, dateTo) + 1;
    const previousTo = addDays(dateFrom, -1);
    const previousFrom = addDays(previousTo, -(spanDays - 1));
    const previous = computeRangeSummary(previousFrom, previousTo, habitId, categoryId, status);
    const trend = computeDailyTrend(dateFrom, dateTo, habitId, categoryId, status);

    return {
      trend,
      percentageDelta: delta(summary.percentage, previous.percentage),
      completedDelta: delta(summary.completed, previous.completed),
      partialDelta: delta(summary.partial, previous.partial),
      goalsExceededDelta: delta(summary.goalsExceeded, previous.goalsExceeded),
    };
  }, [dateFrom, dateTo, habitId, categoryId, status, summary]);

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
    entries: filteredEntries,
    paginatedEntries,
    summary,
    comparison,
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

export function getEntriesForDay(date: string, habitId: string, categoryId: string): HistoryEntry[] {
  return mockHabitLogs
    .filter((log) => log.date === date)
    .map((log) => ({ log, habit: getHabitById(log.habitId) }))
    .filter((item): item is { log: HabitLog; habit: Habit } => item.habit !== undefined && item.habit.lifecycleStatus !== "deleted")
    .filter((item) => habitId === "all" || item.habit.id === habitId)
    .filter((item) => categoryId === "all" || item.habit.categoryIds.includes(categoryId))
    .map(({ log, habit }) => {
      const percentage =
        habit.targetValue && log.value !== undefined ? calculatePercentage(log.value, habit.targetValue) : undefined;
      return {
        log,
        habit,
        isEditable: habit.lifecycleStatus === "active" && isLogEditable(log.date, TODAY),
        percentage,
        goalExceeded: Boolean(habit.targetValue && log.value !== undefined && isGoalExceeded(log.value, habit.targetValue)),
      };
    });
}

export function getStatusCountsForDate(date: string): Record<HabitStatus, number> {
  return mockHabitLogs
    .filter((log) => log.date === date)
    .reduce(
      (acc, log) => {
        acc[log.status] += 1;
        return acc;
      },
      { pending: 0, completed: 0, partial: 0, not_completed: 0, not_applicable: 0 } as Record<HabitStatus, number>,
    );
}
