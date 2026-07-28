import { AlertTriangle, Bell, CalendarClock, Flame } from "lucide-react";
import type { NotificationPreferences } from "../../hooks/useSettingsForm";
import { Card } from "../ui/Card";
import { SectionHeader } from "../ui/SectionHeader";
import { Toggle } from "../ui/Toggle";

interface NotificationsSectionProps {
  notifications: NotificationPreferences;
  onToggle: (key: keyof NotificationPreferences, value: boolean) => void;
}

export function NotificationsSection({ notifications, onToggle }: NotificationsSectionProps) {
  return (
    <Card className="flex h-full flex-col gap-1">
      <SectionHeader icon={<Bell size={18} aria-hidden="true" />} title="Notificaciones" description="Elige qué avisos quieres recibir sobre tus hábitos." />
      <div className="mt-2 flex flex-col divide-y divide-border">
        <Toggle
          icon={<Flame size={16} />}
          tone="warning"
          label="Racha en riesgo"
          hint="Te avisamos cuando estés por perder una racha activa."
          checked={notifications.streakAtRisk}
          onChange={(checked) => onToggle("streakAtRisk", checked)}
        />
        <Toggle
          icon={<AlertTriangle size={16} />}
          tone="warning"
          label="Hábito abandonado"
          hint="Aviso cuando un hábito lleve varios días sin registrarse."
          checked={notifications.abandonedHabit}
          onChange={(checked) => onToggle("abandonedHabit", checked)}
        />
        <Toggle
          icon={<CalendarClock size={16} />}
          tone="primary"
          label="Resumen semanal"
          hint="Recibe un resumen de tu cumplimiento cada semana."
          checked={notifications.weeklySummary}
          onChange={(checked) => onToggle("weeklySummary", checked)}
        />
        <Toggle
          icon={<Bell size={16} />}
          tone="info"
          label="Recordatorios"
          hint="Recordatorios diarios para completar tus hábitos pendientes."
          checked={notifications.reminders}
          onChange={(checked) => onToggle("reminders", checked)}
        />
      </div>
    </Card>
  );
}
