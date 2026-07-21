const WEEKDAY_LABELS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTH_LABELS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatFullDate(value: string): string {
  const date = parseDateOnly(value);
  const weekday = WEEKDAY_LABELS[date.getDay()];
  const month = MONTH_LABELS[date.getMonth()];
  return `${weekday}, ${date.getDate()} de ${month}`;
}

export function formatShortDate(value: string): string {
  const date = parseDateOnly(value);
  const month = MONTH_LABELS[date.getMonth()].slice(0, 3);
  return `${date.getDate()} ${month}`;
}

export function formatWeekdayLabel(value: string): string {
  const date = parseDateOnly(value);
  return WEEKDAY_LABELS[date.getDay()];
}

export function addDays(value: string, amount: number): string {
  const date = parseDateOnly(value);
  date.setDate(date.getDate() + amount);
  return toDateOnly(date);
}

export function isToday(value: string): boolean {
  return value === toDateOnly(new Date());
}

export function daysBetween(from: string, to: string): number {
  const fromDate = parseDateOnly(from);
  const toDate = parseDateOnly(to);
  const diff = toDate.getTime() - fromDate.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function startOfMonth(value: string): string {
  const date = parseDateOnly(value);
  return toDateOnly(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function addMonths(value: string, amount: number): string {
  const date = parseDateOnly(value);
  return toDateOnly(new Date(date.getFullYear(), date.getMonth() + amount, 1));
}

export function getDaysInMonth(value: string): number {
  const date = parseDateOnly(value);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function formatMonthLabel(value: string): string {
  const date = parseDateOnly(value);
  const label = MONTH_LABELS[date.getMonth()];
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${date.getFullYear()}`;
}

/** Lunes=0 … domingo=6, para alinear la primera celda de una grilla de calendario. */
export function getMondayFirstWeekday(value: string): number {
  const jsWeekday = parseDateOnly(value).getDay();
  return (jsWeekday + 6) % 7;
}
