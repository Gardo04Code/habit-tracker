import type { HabitStatus } from "../types/habit";

interface StatusMeta {
  label: string;
  colorVar: string;
  mutedVar: string;
}

const STATUS_META: Record<HabitStatus, StatusMeta> = {
  pending: { label: "Pendiente", colorVar: "var(--color-neutral)", mutedVar: "var(--color-neutral-muted)" },
  completed: { label: "Completado", colorVar: "var(--color-success)", mutedVar: "var(--color-success-muted)" },
  partial: { label: "Parcial", colorVar: "var(--color-warning)", mutedVar: "var(--color-warning-muted)" },
  not_completed: { label: "No realizado", colorVar: "var(--color-danger)", mutedVar: "var(--color-danger-muted)" },
  not_applicable: { label: "No aplicable", colorVar: "var(--color-neutral)", mutedVar: "var(--color-neutral-muted)" },
};

export function getStatusLabel(status: HabitStatus): string {
  return STATUS_META[status].label;
}

export function getStatusColorVar(status: HabitStatus): string {
  return STATUS_META[status].colorVar;
}

export function getStatusMutedVar(status: HabitStatus): string {
  return STATUS_META[status].mutedVar;
}
