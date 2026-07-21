import type { DashboardSummary } from "../types/dashboard";
import { addDays, formatWeekdayLabel } from "../utils/formatDate";
import { TODAY } from "./referenceDate";

const weeklyRates = [78, 85, 62, 90, 74, 88, 96];

export const mockDashboard: DashboardSummary = {
  weeklyCompletionRate: 84,
  weeklyCompletionTrend: 6,
  currentStreak: 15,
  bestStreakThisMonth: 18,
  habitsCompletedToday: 2,
  totalHabitsToday: 4,
  monthlyGoalProgress: 74,
  monthlyGoalTarget: 80,
  monthlyGoalUnit: "%",
  weeklyProgress: weeklyRates.map((completionRate, index) => {
    const date = addDays(TODAY, index - 6);
    return {
      date,
      label: formatWeekdayLabel(date),
      completionRate,
    };
  }),
  statusBreakdown: [
    { status: "completed", count: 17 },
    { status: "partial", count: 5 },
    { status: "pending", count: 2 },
    { status: "not_completed", count: 3 },
    { status: "not_applicable", count: 1 },
  ],
  consistency: Array.from({ length: 35 }, (_, index) => {
    const date = addDays(TODAY, index - 34);
    const pattern = [95, 80, 60, 100, 40, 75, 88];
    return {
      date,
      completionRate: pattern[index % pattern.length],
    };
  }),
  strongestHabits: [
    { habitId: "habit-water", habitName: "Tomar agua", icon: "glass-water", color: "#4f6df5", completionRate: 93, streak: 15 },
    { habitId: "habit-read", habitName: "Leer 20 minutos", icon: "book-open", color: "#7c5ce7", completionRate: 90, streak: 12 },
  ],
  weakestHabits: [
    { habitId: "habit-sleep", habitName: "Dormir antes de las 11:00 p. m.", icon: "moon", color: "#4f6df5", completionRate: 58, streak: 2 },
    { habitId: "habit-train", habitName: "Entrenar", icon: "dumbbell", color: "#f08a3c", completionRate: 65, streak: 3 },
  ],
};
