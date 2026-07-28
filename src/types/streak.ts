export interface StreakBestHabit {
  id: string;
  name: string;
  category: string;
  icon: string;
  completionPercentage: number;
  value?: number;
  target?: number;
  unit?: string;
  goalExceeded: boolean;
}

export interface StreakTimelineItem {
  id: string;
  date: string;
  streakNumber: number;
  completionPercentage: number;
  qualifiesForStreak: boolean;
  bestHabit: StreakBestHabit;
}

export interface StreakSummary {
  currentStreak: number;
  personalRecord: number;
  remainingToRecord: number;
  items: StreakTimelineItem[];
}
