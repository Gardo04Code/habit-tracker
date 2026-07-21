import type { HabitLifecycleStatus } from "../../types/habit";
import { Tabs } from "../ui/Tabs";

interface HabitStatusTabsProps {
  value: HabitLifecycleStatus;
  onChange: (value: HabitLifecycleStatus) => void;
  counts: Record<HabitLifecycleStatus, number>;
}

const TAB_ITEMS: { value: HabitLifecycleStatus; label: string }[] = [
  { value: "active", label: "Activos" },
  { value: "paused", label: "Pausados" },
  { value: "archived", label: "Archivados" },
  { value: "deleted", label: "Papelera" },
];

export function HabitStatusTabs({ value, onChange, counts }: HabitStatusTabsProps) {
  return (
    <Tabs
      value={value}
      onChange={(next) => onChange(next as HabitLifecycleStatus)}
      items={TAB_ITEMS.map((item) => ({ ...item, count: counts[item.value] }))}
    />
  );
}
