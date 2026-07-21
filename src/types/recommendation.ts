export type RecommendationType = "success" | "warning" | "suggestion" | "pattern";
export type RecommendationPriority = "low" | "medium" | "high";

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  priority: RecommendationPriority;
  habitId?: string;
}
