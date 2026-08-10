// `habit_schedules` no tiene ninguna política RLS de INSERT/UPDATE/DELETE
// para `authenticated` (solo SELECT, rls_hardening.sql + table_privileges.sql)
// — todo cambio de frecuencia pasa exclusivamente por las funciones RPC
// `create_habit_schedule` (primera versión de un hábito nuevo,
// 20260804221046_create_habit_schedule.sql) y `change_habit_schedule`
// (versiones posteriores, 20260731001044_habit_schedules.sql). Este
// servicio nunca hace `.from("habit_schedules").insert/update(...)`.

import { supabase } from "../lib/supabase";
import { normalizeSupabaseError } from "../lib/errors";
import type { HabitSchedule } from "../types/entities";
import type { Database } from "../types/database.types";

export type { HabitSchedule };

type FrequencyType = Database["public"]["Enums"]["frequency_type"];

export interface FrequencyInput {
  frequencyType: FrequencyType;
  daysOfWeek: number[] | null;
  frequencyTarget: number | null;
  intervalDays: number | null;
}

/**
 * Historial completo de programaciones de un hábito (incluye versiones
 * cerradas, `valid_to` no nulo) — permitido por la política de solo
 * lectura. Ordenado por `valid_from` para reconstruir la línea de tiempo.
 */
async function getHabitScheduleHistory(habitId: string): Promise<HabitSchedule[]> {
  const { data, error } = await supabase
    .from("habit_schedules")
    .select("*")
    .eq("habit_id", habitId)
    .order("valid_from", { ascending: true });

  if (error) throw normalizeSupabaseError(error);
  return data;
}

/**
 * Solo las versiones vigentes (`valid_to IS NULL`) de TODOS los hábitos
 * propios en una sola consulta — usado por `habits.service.ts` para armar
 * el listado sin una petición por hábito (evita N+1). RLS ya acota el
 * resultado a hábitos del usuario autenticado (la política solo permite
 * leer filas de `habit_schedules` cuyo `habit_id` pertenezca a un hábito
 * propio).
 */
async function getCurrentSchedules(): Promise<HabitSchedule[]> {
  const { data, error } = await supabase.from("habit_schedules").select("*").is("valid_to", null);

  if (error) throw normalizeSupabaseError(error);
  return data;
}

/**
 * Historial COMPLETO (todas las versiones, incluidas las cerradas) de
 * VARIOS hábitos en una sola consulta — corrección de BUG-004: a diferencia
 * de `getCurrentSchedules()`, esta función es la que permite resolver qué
 * versión regía en una fecha pasada, no solo la vigente hoy. Pensada para
 * `useDailyChecklist.ts`/`useDashboard.ts`, que necesitan el historial de
 * varios hábitos activos a la vez sin una petición por hábito (mismo motivo
 * que `getCurrentSchedules()`). RLS acota el resultado a hábitos propios,
 * igual que el resto de las consultas de este servicio.
 *
 * Ordenado de forma estable por `habit_id` y luego `valid_from` ascendente
 * — cómodo para agrupar por hábito en el consumidor, aunque la función pura
 * `getScheduleForDate()` (utils/habitSchedule.ts) no depende de ese orden.
 */
async function getHabitScheduleHistories(habitIds: string[]): Promise<HabitSchedule[]> {
  if (habitIds.length === 0) return [];

  const { data, error } = await supabase
    .from("habit_schedules")
    .select("*")
    .in("habit_id", habitIds)
    .order("habit_id", { ascending: true })
    .order("valid_from", { ascending: true });

  if (error) throw normalizeSupabaseError(error);
  return data;
}

/**
 * Crea la PRIMERA versión de programación de un hábito recién creado, vía
 * `create_habit_schedule` (RPC dedicada — ver comentario de cabecera). No
 * acepta `valid_from`: la función la deriva de `habits.start_date` en el
 * servidor.
 */
async function createHabitSchedule(habitId: string, input: FrequencyInput): Promise<HabitSchedule> {
  const { data, error } = await supabase.rpc("create_habit_schedule", {
    p_habit_id: habitId,
    p_frequency_type: input.frequencyType,
    p_days_of_week: input.daysOfWeek as number[],
    p_frequency_target: input.frequencyTarget as number,
    p_interval_days: input.intervalDays as number,
  });

  if (error) throw normalizeSupabaseError(error);
  return data;
}

/**
 * Cambia la programación vigente de un hábito ya existente, vía
 * `change_habit_schedule`. `effectiveDate` por defecto es "hoy" (zona del
 * navegador, formato `YYYY-MM-DD`) — la UI actual no tiene un campo para
 * elegir otra fecha de vigencia; queda documentado como limitación conocida
 * en MDs/12.
 */
async function changeHabitSchedule(
  habitId: string,
  input: FrequencyInput,
  effectiveDate: string,
): Promise<HabitSchedule> {
  const { data, error } = await supabase.rpc("change_habit_schedule", {
    p_habit_id: habitId,
    p_frequency_type: input.frequencyType,
    p_days_of_week: input.daysOfWeek as number[],
    p_frequency_target: input.frequencyTarget as number,
    p_interval_days: input.intervalDays as number,
    p_effective_date: effectiveDate,
  });

  if (error) throw normalizeSupabaseError(error);
  return data;
}

export const habitSchedulesService = {
  getHabitScheduleHistory,
  getHabitScheduleHistories,
  getCurrentSchedules,
  createHabitSchedule,
  changeHabitSchedule,
};
