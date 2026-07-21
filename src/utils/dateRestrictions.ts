import { daysBetween } from "./formatDate";

export const EDITABLE_WINDOW_DAYS = 7;

export function isLogEditable(logDate: string, referenceDate: string): boolean {
  return daysBetween(logDate, referenceDate) <= EDITABLE_WINDOW_DAYS;
}
