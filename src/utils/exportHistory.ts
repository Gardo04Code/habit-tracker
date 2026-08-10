import type { HistoryEntry } from "../hooks/useHistoryLogs";
import { getStatusLabel } from "./habitStatus";

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildHistoryCsv(entries: HistoryEntry[]): string {
  const header = ["Fecha", "Hábito", "Estado", "Valor", "Meta", "Porcentaje", "Meta superada", "Nota"];
  const rows = entries.map((entry) => [
    entry.log.date,
    entry.habit.name,
    getStatusLabel(entry.log.status),
    entry.log.value !== undefined ? String(entry.log.value) : "",
    entry.targetValue !== undefined ? String(entry.targetValue) : "",
    entry.percentage !== undefined ? `${entry.percentage}%` : "",
    entry.goalExceeded ? "Sí" : "No",
    entry.log.note ?? "",
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsvField).join(",")).join("\n");
}

/** Descarga el historial filtrado como CSV — exportación real en el
 * navegador, sin backend: genera el archivo a partir de los datos ya
 * cargados y dispara la descarga con un enlace temporal. */
export function downloadHistoryCsv(entries: HistoryEntry[], dateFrom: string, dateTo: string): void {
  const csv = buildHistoryCsv(entries);
  const byteOrderMark = String.fromCharCode(0xfeff);
  const blob = new Blob([byteOrderMark + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `historial_${dateFrom}_a_${dateTo}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
