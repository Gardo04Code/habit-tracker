export type InsightType =
  | "achievement"
  | "risk"
  | "trend"
  | "prediction"
  | "correlation"
  | "recommendation"
  | "motivation"
  | "celebration"
  | "reminder"
  | "curiosity"
  | "related_habits"
  | "next_goal";

export type InsightPriority = "critical" | "high" | "medium" | "low" | "informational";

export interface InsightEvidencePoint {
  label: string;
  value: string;
}

export type InsightActionKind = "register" | "start" | "postpone" | "view_details" | "go_to_habit" | "view_stats";

export interface InsightAction {
  label: string;
  kind: InsightActionKind;
  href?: string;
}

export interface InsightImpact {
  label: string;
  value: number;
  direction: "up" | "down";
  unit: "%" | "días" | "pts";
}

export interface Insight {
  id: string;
  type: InsightType;
  category: string;
  priority: InsightPriority;
  confidence: number;
  title: string;
  analysis: string;
  evidence: InsightEvidencePoint[];
  impact?: InsightImpact;
  expectedBenefit?: string;
  trendData?: number[];
  action: InsightAction;
  secondaryActions?: InsightAction[];
  analyzedAt: string;
  habitId?: string;
  relatedHabitIds?: string[];
}
