export function calculatePercentage(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((value / target) * 100);
}

export function clampDisplayPercentage(percentage: number, max = 999): number {
  return Math.min(percentage, max);
}

export function isGoalExceeded(value: number, target: number): boolean {
  return target > 0 && value > target;
}
