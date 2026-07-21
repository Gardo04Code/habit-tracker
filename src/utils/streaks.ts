import type { Habit, HabitStatus } from "../types/habit";
import { getLogForHabitOnDate } from "../data/mockHabitLogs";
import { TODAY } from "../data/referenceDate";
import { addDays } from "./formatDate";

function statusOnDate(habitId: string, date: string): HabitStatus {
  return getLogForHabitOnDate(habitId, date)?.status ?? "pending";
}

/**
 * Camina hacia atrás desde hoy. Un solo día no completado consecutivo se
 * tolera sin romper la racha; dos días no completados seguidos la rompen.
 * "No aplicable" ni suma ni rompe. Editar registros antiguos no recupera
 * una racha ya perdida, porque el conteo se detiene en el primer quiebre.
 */
export function calculateCurrentStreak(habit: Habit): number {
  let streak = 0;
  let badRun = 0;
  let date = TODAY;

  while (date >= habit.startDate) {
    const status = statusOnDate(habit.id, date);

    if (date === TODAY && status === "pending") {
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

export function calculateBestStreak(habit: Habit): number {
  let current = 0;
  let best = 0;
  let badRun = 0;
  let date = habit.startDate;

  while (date <= TODAY) {
    const status = statusOnDate(habit.id, date);

    if (status === "not_applicable" || (date === TODAY && status === "pending")) {
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
