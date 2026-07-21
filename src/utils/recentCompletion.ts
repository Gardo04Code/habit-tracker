import { getLogsForHabit } from "../data/mockHabitLogs";
import { TODAY } from "../data/referenceDate";
import { addDays, daysBetween } from "./formatDate";

export function calculateRecentCompletionRate(habitId: string, days = 14): number {
  const since = addDays(TODAY, -(days - 1));
  const logs = getLogsForHabit(habitId).filter(
    (log) => log.date >= since && log.date <= TODAY && log.status !== "not_applicable",
  );

  if (logs.length === 0) return 0;

  const weighted = logs.reduce((sum, log) => {
    if (log.status === "completed") return sum + 1;
    if (log.status === "partial") return sum + 0.5;
    return sum;
  }, 0);

  return Math.round((weighted / logs.length) * 100);
}

export function calculateHabitAgeDays(startDate: string): number {
  return Math.max(0, daysBetween(startDate, TODAY));
}
