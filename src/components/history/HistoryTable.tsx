import { Lock, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import type { HistoryEntry } from "../../hooks/useHistoryLogs";
import { formatShortDate } from "../../utils/formatDate";
import { StatusBadge } from "../ui/StatusBadge";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { Table2 } from "lucide-react";

interface HistoryTableProps {
  entries: HistoryEntry[];
}

function EditionCell({ entry }: { entry: HistoryEntry }) {
  if (entry.isEditable) {
    return (
      <Link
        to={`/checklist?date=${entry.log.date}`}
        className="inline-flex items-center gap-1 text-primary hover:underline"
        aria-label={`Editar registro de ${entry.habit.name} del ${entry.log.date}`}
      >
        <Pencil size={14} aria-hidden="true" />
        Editar
      </Link>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-text-disabled"
      title="Registro de solo lectura: tiene más de 7 días de antigüedad"
    >
      <Lock size={14} aria-hidden="true" />
      Bloqueado
    </span>
  );
}

export function HistoryTable({ entries }: HistoryTableProps) {
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
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface md:block">
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
            {entries.map((entry) => (
              <tr key={entry.log.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-text-primary">{formatShortDate(entry.log.date)}</td>
                <td className="px-4 py-3 text-text-primary">{entry.habit.name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={entry.log.status} />
                </td>
                <td className="px-4 py-3 text-text-secondary">{entry.log.value ?? "—"}</td>
                <td className="px-4 py-3 text-text-secondary">{entry.habit.targetValue ?? "—"}</td>
                <td className="px-4 py-3">
                  {entry.percentage !== undefined ? (
                    <span className={entry.goalExceeded ? "font-medium text-purple" : "text-text-primary"}>
                      {entry.percentage}%
                    </span>
                  ) : (
                    <span className="text-text-disabled">—</span>
                  )}
                  {entry.goalExceeded && <Badge tone="purple" className="ml-2">Meta superada</Badge>}
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-text-secondary" title={entry.log.note}>
                  {entry.log.note ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <EditionCell entry={entry} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {entries.map((entry) => (
          <div key={entry.log.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">{entry.habit.name}</p>
                <p className="text-xs text-text-secondary">{formatShortDate(entry.log.date)}</p>
              </div>
              <StatusBadge status={entry.log.status} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
              <span>Valor: {entry.log.value ?? "—"}</span>
              <span>Meta: {entry.habit.targetValue ?? "—"}</span>
              {entry.percentage !== undefined && (
                <span className={entry.goalExceeded ? "font-medium text-purple" : ""}>{entry.percentage}%</span>
              )}
            </div>
            {entry.log.note && <p className="mt-2 text-xs text-text-secondary">"{entry.log.note}"</p>}
            <div className="mt-3 text-xs">
              <EditionCell entry={entry} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
