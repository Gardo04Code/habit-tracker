// Servicio real de habit_logs. Columnas confirmadas en database.types.ts
// (fuente de verdad, no asumidas): id, habit_id, date, status, value, note,
// recorded_time, created_at, updated_at, goal_type_snapshot (NOT NULL),
// target_value_snapshot, target_unit_snapshot, deadline_time_snapshot.
//
// Reglas de servidor que este archivo NUNCA intenta reimplementar ni
// evadir (confirmadas por lectura directa de las migraciones):
//   - Las cuatro columnas *_snapshot las asigna
//     set_habit_log_goal_snapshot_trg (BEFORE INSERT, sobrescribe
//     incondicionalmente) y las protege protect_habit_log_goal_snapshot_trg
//     (BEFORE UPDATE, rechaza cualquier intento de cambiarlas) —
//     20260731002637_habit_log_goal_snapshots.sql. Este servicio nunca
//     envía un valor "real" para goal_type_snapshot: solo un placeholder
//     que el trigger descarta (ver createHabitLog).
//   - enforce_habit_log_edit_window_trg (BEFORE INSERT/UPDATE/DELETE,
//     20260731014259_habit_log_edit_window.sql) rechaza fechas futuras y
//     fechas con más de 7 días de antigüedad — este servicio no intenta
//     evadirlo ni duplicar esa lógica como si fuera la autoridad final;
//     solo traduce su mensaje de error a algo amigable.
//   - protect_habit_logs_habit_id_trg (rls_hardening.sql) hace habit_id
//     inmutable tras la creación — nunca se incluye en el payload de
//     updateHabitLog (ni siquiera a nivel de tipo).
//   - sync_goal_progress_from_habit_log_trg (AFTER INSERT/UPDATE/DELETE,
//     20260731004632_goal_progress_source.sql) recalcula automáticamente
//     goals.current_value de cualquier meta vinculada — este servicio no
//     escribe ni lee goals en ningún punto.

import { supabase } from "../lib/supabase";
import { AppError, normalizeSupabaseError } from "../lib/errors";
import type { HabitLog, DbHabitStatus } from "../types/entities";
import type { Database } from "../types/database.types";

export type { HabitLog };

export interface CreateHabitLogPayload {
  habitId: string;
  date: string;
  status: DbHabitStatus;
  value?: number | null;
  note?: string | null;
  recordedTime?: string | null;
}

// Sin habitId ni date: ambos son inmutables/identificadores de la fila tras
// la creación (habit_id por protect_habit_logs_habit_id_trg; date porque
// "mover" un registro a otra fecha no tiene un flujo aprobado en la UI —
// el propio D-06 documenta que el camino correcto sería DELETE + INSERT
// dentro de la ventana, no un UPDATE de date).
export interface UpdateHabitLogPayload {
  status?: DbHabitStatus;
  value?: number | null;
  note?: string | null;
  recordedTime?: string | null;
}

function requireValidValue(value: number | null | undefined): number | null {
  if (value === undefined || value === null) return null;
  if (!Number.isFinite(value) || value < 0) {
    throw new AppError({
      kind: "validation",
      technicalMessage: `habitLogs.service: value inválido tras validación previa (${value}).`,
      friendlyMessage: "El valor registrado debe ser un número válido, mayor o igual a 0.",
    });
  }
  return value;
}

function normalizeNote(note: string | null | undefined): string | null {
  if (note === undefined || note === null) return null;
  const trimmed = note.trim();
  return trimmed === "" ? null : trimmed;
}

function requireValidRecordedTime(time: string | null | undefined): string | null {
  if (time === undefined || time === null || time === "") return null;
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
    throw new AppError({
      kind: "validation",
      technicalMessage: `habitLogs.service: recordedTime con formato inválido ("${time}").`,
      friendlyMessage: "La hora registrada no tiene un formato válido.",
    });
  }
  return time;
}

/**
 * Traduce errores reales del servidor (trigger de ventana de 7 días,
 * trigger de fechas futuras, límite real de goal_progress_source para
 * ciertos goal_type) a mensajes amigables — nunca texto crudo de
 * Postgres/PostgREST. Ninguno de estos casos se intenta evitar ni
 * recalcular en el cliente: solo se traduce el mensaje que el servidor ya
 * decidió.
 */
function mapHabitLogError(error: unknown): AppError {
  const normalized = normalizeSupabaseError(error);

  if (/future dates are not allowed/i.test(normalized.message)) {
    return new AppError({
      kind: "validation",
      technicalMessage: normalized.message,
      friendlyMessage: "No puedes registrar ni editar un día futuro.",
      code: normalized.code,
      cause: normalized.cause,
    });
  }

  if (/older than the seven-day edit window/i.test(normalized.message)) {
    return new AppError({
      kind: "validation",
      technicalMessage: normalized.message,
      friendlyMessage: "Este registro ya no se puede editar: pasaron más de 7 días desde esa fecha.",
      code: normalized.code,
      cause: normalized.cause,
    });
  }

  // Límite real y documentado de D-05 (goal_progress_source.sql): una meta
  // vinculada a un hábito 'boolean'/'deadline'/'accumulated_days' (sin
  // fórmula de progreso aprobada) o con habit_logs de tipos/unidades
  // mezclados en su rango hace que CUALQUIER escritura de habit_log para
  // ese hábito sea rechazada por compute_goal_habit_logs_progress. No es
  // un caso que este servicio pueda evitar ni recalcular — se traduce el
  // mensaje, no se intenta rodear el trigger.
  if (/no approved progress formula|mixed goal_type_snapshot/i.test(normalized.message)) {
    return new AppError({
      kind: "validation",
      technicalMessage: normalized.message,
      friendlyMessage:
        "No se pudo guardar: la meta vinculada a este hábito todavía no admite calcular su progreso automáticamente para este tipo de meta.",
      code: normalized.code,
      cause: normalized.cause,
    });
  }

  if (normalized.code === "23505") {
    return new AppError({
      kind: normalized.kind,
      technicalMessage: normalized.message,
      friendlyMessage: "Ya existe un registro para este hábito en esa fecha.",
      code: normalized.code,
      cause: normalized.cause,
    });
  }

  if (normalized.kind === "not_found") {
    return new AppError({
      kind: normalized.kind,
      technicalMessage: normalized.message,
      friendlyMessage: "No encontramos ese registro.",
      code: normalized.code,
      cause: normalized.cause,
    });
  }

  return normalized;
}

/**
 * Todos los habit_logs propios de una fecha concreta. Sin filtro manual por
 * usuario: la política RLS "Habit logs are selectable by owner" (EXISTS
 * sobre habits.user_id = auth.uid()) ya garantiza que solo se reciban
 * registros de hábitos propios. Si un hábito activo no tiene fila aquí para
 * esta fecha, la ausencia ES el estado "Pendiente" — esta función nunca
 * crea una fila vacía para rellenar ese hueco.
 */
async function getHabitLogsForDate(date: string): Promise<HabitLog[]> {
  const { data, error } = await supabase.from("habit_logs").select("*").eq("date", date);
  if (error) throw mapHabitLogError(error);
  return data;
}

/**
 * Crea el primer registro del día para un hábito. Nunca duplica: quien
 * llama (useDailyChecklist) ya consultó getHabitLogsForDate() y decide
 * crear solo cuando no existe fila — el UNIQUE (habit_id, date) es el
 * respaldo final de base de datos si dos llamadas coincidieran (por
 * ejemplo, dos pestañas), traducido arriba a un mensaje amigable.
 */
async function createHabitLog(payload: CreateHabitLogPayload): Promise<HabitLog> {
  const value = requireValidValue(payload.value);
  const note = normalizeNote(payload.note);
  const recordedTime = requireValidRecordedTime(payload.recordedTime);

  const { data, error } = await supabase
    .from("habit_logs")
    .insert({
      habit_id: payload.habitId,
      date: payload.date,
      status: payload.status,
      value,
      note,
      recorded_time: recordedTime,
      // goal_type_snapshot es NOT NULL sin DEFAULT en la tabla (columna
      // requerida en el tipo Insert generado), pero
      // set_habit_log_goal_snapshot_trg (BEFORE INSERT) SOBRESCRIBE
      // incondicionalmente cualquier valor enviado aquí con el goal_type
      // vigente real del hábito — este placeholder nunca llega a
      // persistirse tal cual. El frontend nunca decide un snapshot real.
      goal_type_snapshot: "boolean",
    })
    .select()
    .single();

  if (error) throw mapHabitLogError(error);
  return data;
}

/**
 * Actualiza un habit_log existente. Jamás INSERT — quien llama ya confirmó
 * que la fila existe. Nunca incluye habit_id, date ni ninguna columna
 * *_snapshot en el payload (ni siquiera a nivel de tipo): protect_habit_
 * logs_habit_id_trg y protect_habit_log_goal_snapshot_trg las rechazarían
 * de todas formas, pero esta función no depende de esa protección como
 * primera línea de defensa.
 */
async function updateHabitLog(id: string, payload: UpdateHabitLogPayload): Promise<HabitLog> {
  const update: Database["public"]["Tables"]["habit_logs"]["Update"] = {};

  if (payload.status !== undefined) update.status = payload.status;
  if (payload.value !== undefined) update.value = requireValidValue(payload.value);
  if (payload.note !== undefined) update.note = normalizeNote(payload.note);
  if (payload.recordedTime !== undefined) update.recorded_time = requireValidRecordedTime(payload.recordedTime);

  const { data, error } = await supabase.from("habit_logs").update(update).eq("id", id).select().single();

  if (error) throw mapHabitLogError(error);
  return data;
}

/**
 * Elimina un habit_log (usado por la acción "Reiniciar" de la UI existente
 * para volver al estado "Pendiente", que es la ausencia de fila). Sujeto a
 * la misma ventana de 7 días que INSERT/UPDATE (enforce_habit_log_edit_
 * window_trg cubre también DELETE).
 */
async function deleteHabitLog(id: string): Promise<void> {
  const { error } = await supabase.from("habit_logs").delete().eq("id", id);
  if (error) throw mapHabitLogError(error);
}

/**
 * Todo el historial propio de habit_logs (cualquier fecha), orden
 * descendente por fecha. Sin filtro manual por usuario: la misma política
 * RLS que getHabitLogsForDate ya lo garantiza. Único punto de lectura para
 * Historial (useHistoryLogs.ts) — la vista de tabla, el resumen y el
 * calendario filtran/agrupan este mismo conjunto en el cliente (igual que
 * ya hacen useHabits/useCategories/useGoals con sus propias tablas), en vez
 * de multiplicar consultas por rango/hábito que no aportan nada distinto
 * bajo RLS.
 */
async function getHabitLogsHistory(): Promise<HabitLog[]> {
  const { data, error } = await supabase.from("habit_logs").select("*").order("date", { ascending: false });
  if (error) throw mapHabitLogError(error);
  return data;
}

export const habitLogsService = {
  getHabitLogsForDate,
  getHabitLogsHistory,
  createHabitLog,
  updateHabitLog,
  deleteHabitLog,
};
