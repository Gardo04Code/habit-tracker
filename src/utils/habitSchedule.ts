import type { Habit } from "../types/habit";
import type { HabitSchedule } from "../types/entities";
import { daysBetween } from "./formatDate";

/** Forma mínima de frecuencia que necesita `isFrequencyApplicableOnDate` —
 * satisfecha tanto por `Habit` (frequencyType/daysOfWeek/...) como por una
 * fila real de `habit_schedules` (frequency_type/days_of_week/...), de ahí
 * que `isHabitScheduledForDate` y la resolución histórica (BUG-004) puedan
 * compartir exactamente la misma implementación del switch de frecuencia. */
interface FrequencyLike {
  frequencyType: Habit["frequencyType"];
  daysOfWeek: number[] | null | undefined;
  intervalDays: number | null | undefined;
}

/**
 * Único lugar que interpreta un `frequency_type` + sus campos asociados
 * contra una fecha concreta. `intervalAnchorDate` es la fecha desde la que
 * se cuenta `custom_interval` — deliberadamente siempre `habit.startDate`
 * (nunca `valid_from` de la versión de schedule que aplique), para no
 * alterar la semántica ya aprobada de "cada N días desde que existe el
 * hábito".
 */
function isFrequencyApplicableOnDate(frequency: FrequencyLike, intervalAnchorDate: string, date: string): boolean {
  switch (frequency.frequencyType) {
    case "specific_days": {
      const weekday = new Date(`${date}T00:00:00`).getDay();
      return frequency.daysOfWeek?.includes(weekday) ?? false;
    }
    case "custom_interval": {
      const interval = frequency.intervalDays ?? 1;
      return daysBetween(intervalAnchorDate, date) % interval === 0;
    }
    case "daily":
    case "times_per_week":
    case "times_per_month":
    case "one_time":
    default:
      return true;
  }
}

export function isHabitScheduledForDate(habit: Habit, date: string): boolean {
  if (date < habit.startDate) return false;
  if (habit.endDate && date > habit.endDate) return false;

  return isFrequencyApplicableOnDate(
    { frequencyType: habit.frequencyType, daysOfWeek: habit.daysOfWeek, intervalDays: habit.intervalDays },
    habit.startDate,
    date,
  );
}

// ----------------------------------------------------------------------------
// Corrección de BUG-004 — resolución histórica de schedule (Checklist y
// racha del Dashboard evaluando fechas pasadas deben usar la versión de
// `habit_schedules` vigente EN ESA FECHA, no la vigente hoy).
// ----------------------------------------------------------------------------

/**
 * Devuelve la versión de `scheduleHistory` vigente en `date`
 * (`valid_from <= date` y (`valid_to` es null o `date <= valid_to`)), o
 * `null` si ninguna versión aplica. Pura, no depende de React ni de
 * Supabase, no muta `scheduleHistory`, y no asume ningún orden previo del
 * arreglo (recorre todas las versiones y compara rangos explícitamente) —
 * válida incluso si el historial llega desordenado. Nunca cae de vuelta a
 * "la versión actual": la ausencia de una versión aplicable se traduce en
 * `null`, y es responsabilidad del consumidor decidir qué hacer con eso
 * (en `isHabitScheduledUsingHistory`, más abajo: tratarlo como "no
 * programado").
 */
export function getScheduleForDate(scheduleHistory: HabitSchedule[], date: string): HabitSchedule | null {
  for (const schedule of scheduleHistory) {
    const startsOnOrBefore = schedule.valid_from <= date;
    const endsOnOrAfter = schedule.valid_to === null || date <= schedule.valid_to;
    if (startsOnOrBefore && endsOnOrAfter) return schedule;
  }
  return null;
}

/**
 * Igual que `isHabitScheduledForDate`, pero resolviendo primero la versión
 * de `habit_schedules` que realmente regía en `date` a partir de
 * `scheduleHistory` (todas las versiones del hábito, obtenidas vía
 * `habitSchedulesService.getHabitScheduleHistories()`), en vez de asumir
 * la configuración de frecuencia vigente hoy. Si `date` está fuera del
 * rango del hábito (antes de `startDate`, o después de `endDate` si
 * existe) devuelve `false` sin siquiera consultar el historial, igual que
 * la función original. Si no hay ninguna versión de schedule aplicable a
 * `date` (hueco en el historial, caso estructuralmente imposible en la
 * práctica dado que toda alta de hábito crea una primera versión, pero se
 * maneja explícitamente igualmente), devuelve `false` — nunca se inventa
 * un fallback a la versión vigente.
 */
export function isHabitScheduledUsingHistory(
  habit: Pick<Habit, "startDate" | "endDate">,
  scheduleHistory: HabitSchedule[],
  date: string,
): boolean {
  if (date < habit.startDate) return false;
  if (habit.endDate && date > habit.endDate) return false;

  const schedule = getScheduleForDate(scheduleHistory, date);
  if (!schedule) return false;

  return isFrequencyApplicableOnDate(
    { frequencyType: schedule.frequency_type, daysOfWeek: schedule.days_of_week, intervalDays: schedule.interval_days },
    habit.startDate,
    date,
  );
}
