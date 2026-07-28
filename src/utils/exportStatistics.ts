import type { WeeklyProgressPoint } from "../types/dashboard";

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildStatisticsCsv(dailyRates: WeeklyProgressPoint[]): string {
  const header = ["Fecha", "Día", "Cumplimiento (%)"];
  const rows = dailyRates.map((point) => [point.date, point.label, String(point.completionRate)]);
  return [header, ...rows].map((row) => row.map(escapeCsvField).join(",")).join("\n");
}

export function downloadStatisticsCsv(dailyRates: WeeklyProgressPoint[], periodDays: number): void {
  const csv = buildStatisticsCsv(dailyRates);
  const byteOrderMark = String.fromCharCode(0xfeff);
  const blob = new Blob([byteOrderMark + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `estadisticas_ultimos_${periodDays}_dias.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
