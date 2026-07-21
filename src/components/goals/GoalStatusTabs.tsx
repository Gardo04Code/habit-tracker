import type { GoalStatus } from "../../types/goal";
import { Tabs } from "../ui/Tabs";

export type GoalStatusFilter = "all" | GoalStatus;

interface GoalStatusTabsProps {
  value: GoalStatusFilter;
  onChange: (value: GoalStatusFilter) => void;
  counts: Record<GoalStatusFilter, number>;
}

const TAB_ITEMS: { value: GoalStatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Activas" },
  { value: "completed", label: "Cumplidas" },
  { value: "expired", label: "Vencidas" },
];

export function GoalStatusTabs({ value, onChange, counts }: GoalStatusTabsProps) {
  return (
    <Tabs
      value={value}
      onChange={(next) => onChange(next as GoalStatusFilter)}
      items={TAB_ITEMS.map((item) => ({ ...item, count: counts[item.value] }))}
    />
  );
}
