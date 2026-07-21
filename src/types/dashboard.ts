import type { HabitStatus } from "./habit";

export interface WeeklyProgressPoint {
  date: string;
  label: string;
  completionRate: number;
}

export interface StatusBreakdownPoint {
  status: HabitStatus;
  count: number;
}

export interface ConsistencyDay {
  date: string;
  completionRate: number;
}

export interface HabitStrengthEntry {
  habitId: string;
  habitName: string;
  icon: string;
  color: string;
  completionRate: number;
  streak: number;
}

export interface DashboardSummary {
  weeklyCompletionRate: number;
  weeklyCompletionTrend: number;
  currentStreak: number;
  bestStreakThisMonth: number;
  habitsCompletedToday: number;
  totalHabitsToday: number;
  monthlyGoalProgress: number;
  monthlyGoalTarget: number;
  monthlyGoalUnit: string;
  weeklyProgress: WeeklyProgressPoint[];
  statusBreakdown: StatusBreakdownPoint[];
  consistency: ConsistencyDay[];
  strongestHabits: HabitStrengthEntry[];
  weakestHabits: HabitStrengthEntry[];
}
