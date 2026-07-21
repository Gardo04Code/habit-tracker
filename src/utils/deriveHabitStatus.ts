import type { GoalType, HabitStatus } from "../types/habit";
import { calculatePercentage } from "./calculateProgress";

const VALUE_GOAL_TYPES: GoalType[] = ["quantity", "duration", "repetitions", "accumulated_days"];

export function isValueBasedGoal(goalType: GoalType): boolean {
  return VALUE_GOAL_TYPES.includes(goalType);
}

export function deriveStatusFromValue(
  targetValue: number | undefined,
  allowPartial: boolean,
  value: number,
): HabitStatus {
  if (!value || value <= 0) return "pending";
  if (!targetValue) return "completed";

  const percentage = calculatePercentage(value, targetValue);
  if (percentage >= 100) return "completed";
  return allowPartial ? "partial" : "not_completed";
}

export function deriveStatusFromDeadline(
  deadlineTime: string,
  recordedTime: string,
  allowPartial: boolean,
): HabitStatus {
  if (!recordedTime) return "pending";
  if (recordedTime <= deadlineTime) return "completed";
  return allowPartial ? "partial" : "not_completed";
}
