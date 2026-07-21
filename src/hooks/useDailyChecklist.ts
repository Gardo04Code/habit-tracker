import { useMemo, useState } from "react";
import type { Habit, HabitStatus } from "../types/habit";
import { activeHabits } from "../data/mockHabits";
import { getLogForHabitOnDate } from "../data/mockHabitLogs";
import { TODAY } from "../data/referenceDate";
import { addDays } from "../utils/formatDate";
import { isHabitScheduledForDate } from "../utils/habitSchedule";
import { isLogEditable } from "../utils/dateRestrictions";
import { deriveStatusFromDeadline, deriveStatusFromValue } from "../utils/deriveHabitStatus";

export interface ChecklistEntry {
  habit: Habit;
  status: HabitStatus;
  value?: number;
  recordedTime?: string;
  note?: string;
  isReadOnly: boolean;
}

interface LogOverride {
  status: HabitStatus;
  value?: number;
  recordedTime?: string;
  note?: string;
}

export type StatusFilterValue = "all" | HabitStatus;

function overrideKey(habitId: string, date: string): string {
  return `${habitId}|${date}`;
}

export function useDailyChecklist(initialDate: string = TODAY) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [overrides, setOverrides] = useState<Record<string, LogOverride>>({});

  const isReadOnly = selectedDate > TODAY || !isLogEditable(selectedDate, TODAY);

  const allEntries = useMemo<ChecklistEntry[]>(() => {
    return activeHabits
      .filter((habit) => isHabitScheduledForDate(habit, selectedDate))
      .map((habit) => {
        const baseLog = getLogForHabitOnDate(habit.id, selectedDate);
        const override = overrides[overrideKey(habit.id, selectedDate)];

        return {
          habit,
          status: override?.status ?? baseLog?.status ?? "pending",
          value: override?.value ?? baseLog?.value,
          recordedTime: override?.recordedTime ?? baseLog?.recordedTime,
          note: override?.note ?? baseLog?.note,
          isReadOnly,
        };
      });
  }, [selectedDate, overrides, isReadOnly]);

  const filteredEntries = useMemo(() => {
    if (statusFilter === "all") return allEntries;
    return allEntries.filter((entry) => entry.status === statusFilter);
  }, [allEntries, statusFilter]);

  function applyOverride(habitId: string, patch: Partial<LogOverride>) {
    const key = overrideKey(habitId, selectedDate);
    setOverrides((current) => ({
      ...current,
      [key]: { ...current[key], status: current[key]?.status ?? "pending", ...patch },
    }));
  }

  function setBooleanStatus(habit: Habit, status: "completed" | "not_completed") {
    applyOverride(habit.id, { status, value: undefined });
  }

  function setValue(habit: Habit, rawValue: number) {
    const status = deriveStatusFromValue(habit.targetValue, habit.allowPartial, rawValue);
    applyOverride(habit.id, { status, value: rawValue });
  }

  function setRecordedTime(habit: Habit, recordedTime: string) {
    const status = habit.deadlineTime
      ? deriveStatusFromDeadline(habit.deadlineTime, recordedTime, habit.allowPartial)
      : "completed";
    applyOverride(habit.id, { status, recordedTime });
  }

  function markNotApplicable(habit: Habit) {
    applyOverride(habit.id, { status: "not_applicable", value: undefined });
  }

  function setNote(habit: Habit, note: string) {
    const key = overrideKey(habit.id, selectedDate);
    const current = overrides[key];
    applyOverride(habit.id, { status: current?.status ?? allEntries.find((e) => e.habit.id === habit.id)?.status ?? "pending", note });
  }

  return {
    selectedDate,
    goToPreviousDay: () => setSelectedDate((date) => addDays(date, -1)),
    goToNextDay: () => setSelectedDate((date) => addDays(date, 1)),
    goToToday: () => setSelectedDate(TODAY),
    statusFilter,
    setStatusFilter,
    allEntries,
    filteredEntries,
    isReadOnly,
    setBooleanStatus,
    setValue,
    setRecordedTime,
    markNotApplicable,
    setNote,
  };
}
