import { AlertTriangle, Lightbulb, Sparkles, TrendingUp, X } from "lucide-react";
import type { Recommendation, RecommendationType } from "../../types/recommendation";
import { IconButton } from "../ui/IconButton";

interface RecommendationCardProps {
  recommendation: Recommendation;
  onDismiss: (id: string) => void;
}

const TYPE_META: Record<RecommendationType, { icon: typeof Lightbulb; className: string }> = {
  success: { icon: Sparkles, className: "bg-success-muted text-success" },
  warning: { icon: AlertTriangle, className: "bg-warning-muted text-warning" },
  suggestion: { icon: Lightbulb, className: "bg-primary-muted text-primary" },
  pattern: { icon: TrendingUp, className: "bg-purple-muted text-purple" },
};

export function RecommendationCard({ recommendation, onDismiss }: RecommendationCardProps) {
  const { icon: Icon, className } = TYPE_META[recommendation.type];

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${className}`}>
        <Icon size={16} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">{recommendation.title}</p>
        <p className="mt-0.5 text-sm text-text-secondary">{recommendation.description}</p>
      </div>
      <IconButton
        icon={<X size={16} />}
        label="Ocultar recomendación"
        onClick={() => onDismiss(recommendation.id)}
      />
    </div>
  );
}
