export type HabitStatus =
  | "pending"
  | "completed"
  | "partial"
  | "not_completed"
  | "not_applicable";

export type HabitLifecycleStatus =
  | "active"
  | "paused"
  | "archived"
  | "deleted";

export type GoalType =
  | "boolean"
  | "quantity"
  | "duration"
  | "repetitions"
  | "deadline"
  | "accumulated_days";

export type FrequencyType =
  | "daily"
  | "specific_days"
  | "times_per_week"
  | "times_per_month"
  | "one_time"
  | "custom_interval";

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  categoryIds: string[];
  icon: string;
  color: string;
  frequencyType: FrequencyType;
  daysOfWeek?: number[];
  frequencyTarget?: number;
  intervalDays?: number;
  goalType: GoalType;
  targetValue?: number;
  targetUnit?: string;
  deadlineTime?: string;
  startDate: string;
  endDate?: string;
  lifecycleStatus: HabitLifecycleStatus;
  allowPartial: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  status: HabitStatus;
  value?: number;
  note?: string;
  recordedTime?: string;
  createdAt: string;
  updatedAt: string;
}
