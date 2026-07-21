import { useMemo, useState } from "react";
import type { Habit, HabitLog, HabitStatus } from "../types/habit";
import { mockHabitLogs } from "../data/mockHabitLogs";
import { getHabitById, mockHabits } from "../data/mockHabits";
import { TODAY } from "../data/referenceDate";
import { addDays } from "../utils/formatDate";
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

export type HistoryView = "table" | "calendar";

export const browsableHabits = mockHabits.filter((habit) => habit.lifecycleStatus !== "deleted");

export function useHistoryLogs() {
  const [dateFrom, setDateFrom] = useState(addDays(TODAY, -29));
  const [dateTo, setDateTo] = useState(TODAY);
  const [habitId, setHabitId] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [status, setStatus] = useState<StatusFilterValue>("all");
  const [view, setView] = useState<HistoryView>("table");

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

  const summary = useMemo(() => {
    const applicable = filteredEntries.filter((entry) => entry.log.status !== "not_applicable");
    const completed = applicable.filter((entry) => entry.log.status === "completed").length;
    const partial = applicable.filter((entry) => entry.log.status === "partial").length;
    const goalsExceeded = filteredEntries.filter((entry) => entry.goalExceeded).length;
    const percentage = applicable.length > 0 ? Math.round((completed / applicable.length) * 100) : 0;

    return { percentage, completed, partial, goalsExceeded, total: filteredEntries.length };
  }, [filteredEntries]);

  return {
    dateFrom,
    dateTo,
    habitId,
    categoryId,
    status,
    view,
    setDateFrom,
    setDateTo,
    setHabitId,
    setCategoryId,
    setStatus,
    setView,
    entries: filteredEntries,
    summary,
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
