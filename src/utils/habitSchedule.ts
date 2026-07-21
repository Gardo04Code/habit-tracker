import type { Habit } from "../types/habit";
import { daysBetween } from "./formatDate";

export function isHabitScheduledForDate(habit: Habit, date: string): boolean {
  if (date < habit.startDate) return false;
  if (habit.endDate && date > habit.endDate) return false;

  switch (habit.frequencyType) {
    case "specific_days": {
      const weekday = new Date(`${date}T00:00:00`).getDay();
      return habit.daysOfWeek?.includes(weekday) ?? false;
    }
    case "custom_interval": {
      const interval = habit.intervalDays ?? 1;
      return daysBetween(habit.startDate, date) % interval === 0;
    }
    case "daily":
    case "times_per_week":
    case "times_per_month":
    case "one_time":
    default:
      return true;
  }
}
