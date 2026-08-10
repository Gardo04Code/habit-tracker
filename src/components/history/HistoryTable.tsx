import { Lock, Pencil, Table2 } from "lucide-react";
import { Link } from "react-router-dom";
import { getReadOnlyReasonMessage, type HistoryEntry } from "../../hooks/useHistoryLogs";
import { formatShortDate, formatWeekdayLabel } from "../../utils/formatDate";
import { getHabitIcon } from "../../utils/habitIcons";
import { StatusBadge } from "../ui/StatusBadge";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { Pagination } from "../ui/Pagination";

interface HistoryTableProps {
  entries: HistoryEntry[];
  totalEntries: number;
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function EditionCell({ entry }: { entry: HistoryEntry }) {
  if (entry.isEditable) {
    return (
      <Link
        to={`/checklist?date=${entry.log.date}`}
        aria-label={`Editar registro de ${entry.habit.name} del ${entry.log.date}`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary/30 bg-primary-muted text-primary transition-colors hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Pencil size={15} aria-hidden="true" />
      </Link>
    );
  }
  const title = entry.readOnlyReason
    ? getReadOnlyReasonMessage(entry.readOnlyReason)
    : "Registro de solo lectura";
  return (
    <span
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-disabled"
      title={title}
      aria-label={title}
    >
      <Lock size={14} aria-hidden="true" />
    </span>
  );
}

export function HistoryTable({ entries, totalEntries, page, totalPages, pageSize, onPageChange }: HistoryTableProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Table2 size={22} aria-hidden="true" />}
        title="No hay registros para este filtro"
        description="Ajusta el rango de fechas o los filtros para ver más resultados."
      />
    );
  }

  return (
    <>
      <div className="shadow-elevation-2 hidden overflow-x-auto rounded-2xl border border-border bg-surface md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-text-secondary">
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Hábito</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Meta</th>
              <th className="px-4 py-3 font-medium">Porcentaje</th>
              <th className="px-4 py-3 font-medium">Nota</th>
              <th className="px-4 py-3 font-medium">Edición</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const HabitIcon = getHabitIcon(entry.habit.icon);
              return (
                <tr key={entry.log.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-text-primary">
                    <p>{formatShortDate(entry.log.date)}</p>
                    <p className="text-xs capitalize text-text-disabled">{formatWeekdayLabel(entry.log.date)}</p>
                  </td>
                  <td className="px-4 py-3 text-text-primary">
                    <span className="flex items-center gap-2">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: entry.habit.color }}
                        aria-hidden="true"
                      >
                        <HabitIcon size={13} />
                      </span>
                      {entry.habit.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={entry.log.status} />
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{entry.log.value ?? "—"}</td>
                  <td className="px-4 py-3 text-text-secondary">{entry.targetValue ?? "—"}</td>
                  <td className="px-4 py-3">
                    {entry.percentage !== undefined ? (
                      <div className="flex items-center gap-2">
                        <span className={entry.goalExceeded ? "font-medium text-primary" : "text-text-primary"}>
                          {entry.percentage}%
                        </span>
                        <span className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-muted">
                          <span
                            className={entry.goalExceeded ? "block h-full bg-primary" : "block h-full bg-success"}
                            style={{ width: `${Math.min(100, entry.percentage)}%` }}
                          />
                        </span>
                        {entry.goalExceeded && <Badge tone="primary">Meta superada</Badge>}
                      </div>
                    ) : (
                      <span className="text-text-disabled">—</span>
                    )}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-text-secondary" title={entry.log.note}>
                    {entry.log.note ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <EditionCell entry={entry} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="border-t border-border px-2">
          <Pagination page={page} totalPages={totalPages} totalItems={totalEntries} pageSize={pageSize} onPageChange={onPageChange} />
        </div>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {entries.map((entry) => (
          <Card key={entry.log.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">{entry.habit.name}</p>
                <p className="text-xs capitalize text-text-secondary">
                  {formatShortDate(entry.log.date)} · {formatWeekdayLabel(entry.log.date)}
                </p>
              </div>
              <StatusBadge status={entry.log.status} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
              <span>Valor: {entry.log.value ?? "—"}</span>
              <span>Meta: {entry.targetValue ?? "—"}</span>
              {entry.percentage !== undefined && (
                <span className={entry.goalExceeded ? "font-medium text-primary" : ""}>{entry.percentage}%</span>
              )}
            </div>
            {entry.log.note && <p className="mt-2 text-xs text-text-secondary">"{entry.log.note}"</p>}
            <div className="mt-3 text-xs">
              <EditionCell entry={entry} />
            </div>
          </Card>
        ))}
        <Pagination page={page} totalPages={totalPages} totalItems={totalEntries} pageSize={pageSize} onPageChange={onPageChange} />
      </div>
    </>
  );
}
