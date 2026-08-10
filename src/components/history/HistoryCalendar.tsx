import { useState } from "react";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import clsx from "clsx";
import { getEntriesForDay, statusToDayRate, type HistoryEntry } from "../../hooks/useHistoryLogs";
import {
  addDays,
  addMonths,
  formatFullDate,
  formatMonthLabel,
  getDaysInMonth,
  getMondayFirstWeekday,
  startOfMonth,
  toDateOnly,
} from "../../utils/formatDate";
import { TODAY as MOCK_TODAY } from "../../data/referenceDate";
import { isSupabaseDataSource } from "../../lib/dataSource";
import { Card } from "../ui/Card";
import { IconButton } from "../ui/IconButton";
import { StatusBadge } from "../ui/StatusBadge";
import { EmptyState } from "../ui/EmptyState";
import { CalendarRange } from "lucide-react";

interface HistoryCalendarProps {
  entries: HistoryEntry[];
  habitId: string;
  categoryId: string;
}

const WEEKDAY_HEADERS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// MOCK_TODAY (src/data/referenceDate.ts) es una fecha fija de la era mock.
// En modo Supabase el mes/día por defecto y el resaltado "hoy" deben partir
// de la fecha real — mismo motivo que useHistoryLogs.ts (DEFAULT_REFERENCE_DATE).
const TODAY = isSupabaseDataSource ? toDateOnly(new Date()) : MOCK_TODAY;

function levelForRate(rate: number): number {
  if (rate === 0) return 0;
  if (rate < 50) return 1;
  if (rate < 80) return 2;
  if (rate < 100) return 3;
  return 4;
}

const LEVEL_CLASSES = ["bg-surface-muted", "bg-danger/30", "bg-warning/40", "bg-success/50", "bg-success"];

export function HistoryCalendar({ entries, habitId, categoryId }: HistoryCalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(TODAY));
  const [selectedDay, setSelectedDay] = useState(TODAY);

  const daysInMonth = getDaysInMonth(month);
  const leadingBlanks = getMondayFirstWeekday(month);
  const cells: (string | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => addDays(month, index)),
  ];

  const dayEntries = getEntriesForDay(entries, selectedDay, habitId, categoryId);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <Card className="flex-1">
        <div className="flex items-center justify-between">
          <IconButton
            icon={<ChevronLeft size={18} />}
            label="Mes anterior"
            variant="secondary"
            onClick={() => setMonth((current) => addMonths(current, -1))}
          />
          <p className="text-sm font-semibold capitalize text-text-primary">{formatMonthLabel(month)}</p>
          <IconButton
            icon={<ChevronRight size={18} />}
            label="Mes siguiente"
            variant="secondary"
            onClick={() => setMonth((current) => addMonths(current, 1))}
          />
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-xs text-text-secondary">
          {WEEKDAY_HEADERS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-7 gap-1.5">
          {cells.map((date, index) => {
            if (!date) return <span key={`blank-${index}`} />;

            const dayCellEntries = getEntriesForDay(entries, date, habitId, categoryId);
            const rate = statusToDayRate(dayCellEntries.map((entry) => entry.log));
            const hasGoalExceeded = dayCellEntries.some((entry) => entry.goalExceeded);
            const isSelected = date === selectedDay;
            const isToday = date === TODAY;

            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDay(date)}
                className={clsx(
                  "relative flex aspect-square flex-col items-center justify-center rounded-lg text-xs font-medium transition-colors",
                  LEVEL_CLASSES[levelForRate(rate)],
                  isSelected ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-border",
                  isToday && "font-bold text-text-primary",
                )}
                aria-label={`${formatFullDate(date)}: ${rate}% de cumplimiento`}
                aria-pressed={isSelected}
              >
                {date.slice(-2)}
                {hasGoalExceeded && (
                  <Trophy size={10} className="absolute right-1 top-1 text-primary" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-end gap-1.5 text-xs text-text-secondary">
          <span>Menos</span>
          {LEVEL_CLASSES.map((className) => (
            <span key={className} className={`h-2.5 w-2.5 rounded-sm ${className}`} aria-hidden="true" />
          ))}
          <span>Más</span>
          <span className="ml-3 flex items-center gap-1">
            <Trophy size={12} className="text-primary" aria-hidden="true" /> Meta superada
          </span>
        </div>
      </Card>

      <Card className="flex-1 lg:max-w-sm">
        <p className="text-sm font-semibold capitalize text-text-primary">{formatFullDate(selectedDay)}</p>
        {dayEntries.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={<CalendarRange size={20} aria-hidden="true" />}
              title="Sin registros"
              description="No hay hábitos registrados este día con los filtros actuales."
            />
          </div>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {dayEntries.map((entry) => (
              <li key={entry.log.id} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{entry.habit.name}</p>
                  {entry.log.value !== undefined && (
                    <p className="text-xs text-text-secondary">
                      {entry.log.value} {entry.targetUnit ?? ""}
                      {entry.goalExceeded && " · meta superada"}
                    </p>
                  )}
                </div>
                <StatusBadge status={entry.log.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
