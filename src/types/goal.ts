export type GoalStatus = "active" | "completed" | "expired";

export interface Goal {
  id: string;
  title: string;
  description?: string;
  habitId?: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate: string;
  endDate: string;
  status: GoalStatus;
}
