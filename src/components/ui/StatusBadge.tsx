import { CheckCircle2, CircleDashed, MinusCircle, TrendingUp, XCircle } from "lucide-react";
import type { HabitStatus } from "../../types/habit";
import { getStatusLabel } from "../../utils/habitStatus";
import { Badge, type BadgeTone } from "./Badge";

interface StatusBadgeProps {
  status: HabitStatus;
}

const STATUS_TONE: Record<HabitStatus, BadgeTone> = {
  pending: "neutral",
  completed: "success",
  partial: "warning",
  not_completed: "danger",
  not_applicable: "neutral",
};

const STATUS_ICON: Record<HabitStatus, typeof CheckCircle2> = {
  pending: CircleDashed,
  completed: CheckCircle2,
  partial: TrendingUp,
  not_completed: XCircle,
  not_applicable: MinusCircle,
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const Icon = STATUS_ICON[status];
  return (
    <Badge tone={STATUS_TONE[status]}>
      <Icon size={14} aria-hidden="true" />
      {getStatusLabel(status)}
    </Badge>
  );
}
