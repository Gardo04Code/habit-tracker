import type { Habit } from "../types/habit";

const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function formatFrequency(habit: Habit): string {
  switch (habit.frequencyType) {
    case "daily":
      return "Todos los días";
    case "specific_days":
      return habit.daysOfWeek?.length
        ? habit.daysOfWeek.map((day) => WEEKDAY_SHORT[day]).join(", ")
        : "Días específicos";
    case "times_per_week":
      return `${habit.frequencyTarget ?? 1} veces por semana`;
    case "times_per_month":
      return `${habit.frequencyTarget ?? 1} veces por mes`;
    case "one_time":
      return "Una vez";
    case "custom_interval":
      return `Cada ${habit.intervalDays ?? 1} días`;
    default:
      return "";
  }
}

export function formatGoal(habit: Habit): string {
  switch (habit.goalType) {
    case "boolean":
      return "Sí / No";
    case "quantity":
      return `${habit.targetValue ?? 0} ${habit.targetUnit ?? ""}`.trim();
    case "duration":
      return `${habit.targetValue ?? 0} ${habit.targetUnit ?? "min"}`.trim();
    case "repetitions":
      return `${habit.targetValue ?? 0} repeticiones`;
    case "deadline":
      return `Antes de las ${habit.deadlineTime ?? ""}`;
    case "accumulated_days":
      return `${habit.targetValue ?? 0} días acumulados`;
    default:
      return "";
  }
}
