// Servicio real de goals. Columnas confirmadas en database.types.ts (fuente
// de verdad, no asumidas): id, user_id, habit_id, title, description,
// target_value, current_value, unit, start_date, end_date, status,
// goal_lifecycle_status, progress_source, created_at, updated_at.
//
// IMPORTANTE — discrepancia real frente al encargo, confirmada por lectura
// directa del esquema: `goals` NO tiene columna `goal_type` ni
// `deadline_time` propias (a diferencia de `habits`). El "tipo" relevante
// para decidir si una meta `progress_source=habit_logs` tiene fórmula de
// progreso soportada es el `goal_type` del HÁBITO VINCULADO (leído aquí vía
// `habits.goal_type`), no un campo de `goals` — no se inventa ninguna
// columna que no exista.
//
// Reglas de servidor que este archivo NUNCA reimplementa ni evade
// (confirmadas por lectura directa de las migraciones):
//   - progress_source es inmutable tras la creación
//     (protect_goal_progress_source_trg, 20260731004632_goal_progress_source.sql).
//   - current_value para progress_source='habit_logs' lo mantiene
//     exclusivamente recalculate_goal_current_value() (triggers AFTER sobre
//     habit_logs y sobre goals); para 'calculated' ningún valor persistido
//     se acepta nunca (protect_goal_current_value_trg). Este servicio nunca
//     envía current_value para esos dos orígenes.
//   - goal_lifecycle_status (D-02) es un eje independiente de status — este
//     servicio nunca los mezcla ni infiere uno a partir del otro.
//   - status nunca se escribe automáticamente aquí: no existe ningún
//     trigger que lo automatice todavía (confirmado por lectura completa de
//     goal_progress_source.sql, sección final) — se muestra tal cual está
//     persistido.
//   - validate_goal_habit_ownership_trg exige que habit_id pertenezca al
//     mismo user_id de la meta — este servicio no duplica esa validación
//     como única garantía, pero sí hace una lectura previa (ver
//     fetchOwnHabitGoalType) que la ejerce de forma temprana con un mensaje
//     claro, apoyada en RLS de habits.
//   - Sin DELETE físico: no existe política RLS de DELETE ni GRANT DELETE
//     para `authenticated` sobre goals — el borrado es siempre
//     goal_lifecycle_status = 'deleted'.

import { supabase } from "../lib/supabase";
import { authService } from "./auth.service";
import { AppError, FRIENDLY_MESSAGES, normalizeSupabaseError } from "../lib/errors";
import type { Goal, DbGoalLifecycleStatus, DbGoalProgressSource, DbGoalType } from "../types/entities";
import type { Database } from "../types/database.types";

export type { Goal };

type GoalUpdateRow = Database["public"]["Tables"]["goals"]["Update"];

// Únicos goal_type de hábito con fórmula de progreso aprobada hoy
// (compute_goal_habit_logs_progress, 20260731004632_goal_progress_source.sql).
// boolean/deadline/accumulated_days quedan fuera hasta que exista una
// fórmula aprobada — no se inventa una aquí.
const SUPPORTED_HABIT_LOGS_GOAL_TYPES: DbGoalType[] = ["quantity", "duration", "repetitions"];

// progress_source ofrecido por este servicio: 'calculated' no se expone —
// D-05 no tiene una fórmula aprobada para metas agregadas, así que no se
// construye ningún camino de creación para ese origen (ni siquiera a nivel
// de tipo), en vez de aceptarlo y no saber qué hacer con él.
export type CreatableGoalProgressSource = Extract<DbGoalProgressSource, "habit_logs" | "manual">;

export interface CreateGoalPayload {
  title: string;
  description?: string | null;
  targetValue: number;
  unit: string;
  startDate: string;
  endDate: string;
  progressSource: CreatableGoalProgressSource;
  // Requerido cuando progressSource = "habit_logs"; ignorado (forzado a
  // null) para "manual".
  habitId?: string | null;
  // Solo tiene efecto para progressSource = "manual" — para "habit_logs" se
  // omite siempre del INSERT (el DEFAULT de la columna, 0, es el punto de
  // partida correcto hasta que el primer habit_log calificado dispare el
  // recálculo real).
  currentValue?: number;
}

// Sin user_id, progress_source, current_value (salvo la función dedicada),
// created_at, goal_lifecycle_status ni status — ninguno de los dos es
// aceptado aquí ni siquiera a nivel de tipo.
export interface UpdateGoalPayload {
  title?: string;
  description?: string | null;
  targetValue?: number;
  unit?: string;
  startDate?: string;
  endDate?: string;
  // Solo válido si la meta ya es progress_source = "habit_logs" (se
  // valida contra el valor vigente antes de aplicar).
  habitId?: string | null;
}

function requireNonEmptyTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new AppError({
      kind: "validation",
      technicalMessage: "goals.service: title vacío o solo espacios tras trim().",
      friendlyMessage: "El título de la meta es obligatorio.",
    });
  }
  return trimmed;
}

function requireNonEmptyUnit(unit: string): string {
  const trimmed = unit.trim();
  if (!trimmed) {
    throw new AppError({
      kind: "validation",
      technicalMessage: "goals.service: unit vacío tras trim().",
      friendlyMessage: "Indica una unidad para esta meta (por ejemplo, días, %, litros).",
    });
  }
  return trimmed;
}

function requirePositiveTargetValue(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new AppError({
      kind: "validation",
      technicalMessage: `goals.service: target_value inválido (${value}).`,
      friendlyMessage: "Ingresa un objetivo mayor a 0.",
    });
  }
  return value;
}

function requireNonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new AppError({
      kind: "validation",
      technicalMessage: `goals.service: ${label} inválido (${value}).`,
      friendlyMessage: "El valor no puede ser negativo.",
    });
  }
  return value;
}

function requireCoherentDates(startDate: string, endDate: string): { startDate: string; endDate: string } {
  if (!startDate) {
    throw new AppError({
      kind: "validation",
      technicalMessage: "goals.service: startDate vacío.",
      friendlyMessage: "La fecha de inicio es obligatoria.",
    });
  }
  if (!endDate) {
    throw new AppError({
      kind: "validation",
      technicalMessage: "goals.service: endDate vacío.",
      friendlyMessage: "La fecha límite es obligatoria.",
    });
  }
  if (endDate < startDate) {
    throw new AppError({
      kind: "validation",
      technicalMessage: `goals.service: endDate (${endDate}) anterior a startDate (${startDate}).`,
      friendlyMessage: "La fecha límite no puede ser anterior a la fecha de inicio.",
    });
  }
  return { startDate, endDate };
}

function normalizeDescription(description: string | null | undefined): string | null {
  if (description === undefined || description === null) return null;
  const trimmed = description.trim();
  return trimmed === "" ? null : trimmed;
}

async function requireCurrentUserId(): Promise<string> {
  const user = await authService.getCurrentUser();
  if (!user) {
    throw new AppError({
      kind: "auth",
      technicalMessage: "goals.service: no hay sesión activa (auth.getUser() devolvió null).",
      friendlyMessage: FRIENDLY_MESSAGES.auth,
    });
  }
  return user.id;
}

/**
 * Lee `goal_type` del hábito indicado, acotado por RLS a hábitos propios
 * (la política "Habits are selectable by owner" hace que un id ajeno o
 * inexistente devuelva 0 filas, nunca la fila de otro usuario) — sirve a la
 * vez como validación temprana de propiedad y como fuente del dato real
 * necesario para decidir si progress_source=habit_logs es viable.
 */
async function fetchOwnHabitGoalType(habitId: string): Promise<DbGoalType> {
  const { data, error } = await supabase.from("habits").select("goal_type").eq("id", habitId).single();
  if (error) throw mapGoalError(error);
  return data.goal_type;
}

function mapGoalError(error: unknown): AppError {
  const normalized = normalizeSupabaseError(error);

  if (/does not belong to the same user as the goal/i.test(normalized.message)) {
    return new AppError({
      kind: "validation",
      technicalMessage: normalized.message,
      friendlyMessage: "Ese hábito no te pertenece — solo puedes vincular metas a tus propios hábitos.",
      code: normalized.code,
      cause: normalized.cause,
    });
  }

  if (/progress_source is read-only after creation/i.test(normalized.message)) {
    return new AppError({
      kind: "validation",
      technicalMessage: normalized.message,
      friendlyMessage: "El origen del progreso de una meta no se puede cambiar después de crearla.",
      code: normalized.code,
      cause: normalized.cause,
    });
  }

  if (/cannot be persisted for progress_source = calculated/i.test(normalized.message)) {
    return new AppError({
      kind: "validation",
      technicalMessage: normalized.message,
      friendlyMessage: "Este tipo de meta todavía no admite progreso automático.",
      code: normalized.code,
      cause: normalized.cause,
    });
  }

  if (/does not match the value recalculated from habit_logs/i.test(normalized.message)) {
    return new AppError({
      kind: "validation",
      technicalMessage: normalized.message,
      friendlyMessage: "El progreso de esta meta se calcula automáticamente desde tus hábitos; no se puede escribir directamente.",
      code: normalized.code,
      cause: normalized.cause,
    });
  }

  if (/no approved progress formula|mixed goal_type_snapshot/i.test(normalized.message)) {
    return new AppError({
      kind: "validation",
      technicalMessage: normalized.message,
      friendlyMessage: "Este hábito todavía no admite progreso automático para este tipo de meta.",
      code: normalized.code,
      cause: normalized.cause,
    });
  }

  if (normalized.kind === "not_found") {
    return new AppError({
      kind: normalized.kind,
      technicalMessage: normalized.message,
      friendlyMessage: "No encontramos esa meta o ese hábito.",
      code: normalized.code,
      cause: normalized.cause,
    });
  }

  return normalized;
}

async function getGoals(): Promise<Goal[]> {
  const { data, error } = await supabase.from("goals").select("*").order("created_at", { ascending: false });
  if (error) throw mapGoalError(error);
  return data;
}

async function getActiveGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("goal_lifecycle_status", "active")
    .order("created_at", { ascending: false });
  if (error) throw mapGoalError(error);
  return data;
}

async function getPausedGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("goal_lifecycle_status", "paused")
    .order("created_at", { ascending: false });
  if (error) throw mapGoalError(error);
  return data;
}

async function getDeletedGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("goal_lifecycle_status", "deleted")
    .order("created_at", { ascending: false });
  if (error) throw mapGoalError(error);
  return data;
}

async function getGoalById(id: string): Promise<Goal> {
  const { data, error } = await supabase.from("goals").select("*").eq("id", id).single();
  if (error) throw mapGoalError(error);
  return data;
}

/**
 * Crea una meta. `progress_source` se decide una única vez aquí (es
 * inmutable después). Para "habit_logs": exige habitId propio con
 * goal_type soportado y nunca envía current_value (el DEFAULT de la
 * columna, 0, es el punto de partida hasta el primer recálculo real). Para
 * "manual": habit_id siempre null; current_value es opcional y, si se
 * envía, debe ser >= 0.
 */
async function createGoal(payload: CreateGoalPayload): Promise<Goal> {
  const title = requireNonEmptyTitle(payload.title);
  const unit = requireNonEmptyUnit(payload.unit);
  const targetValue = requirePositiveTargetValue(payload.targetValue);
  const dates = requireCoherentDates(payload.startDate, payload.endDate);
  const userId = await requireCurrentUserId();

  const insert: Database["public"]["Tables"]["goals"]["Insert"] = {
    title,
    description: normalizeDescription(payload.description),
    target_value: targetValue,
    unit,
    start_date: dates.startDate,
    end_date: dates.endDate,
    progress_source: payload.progressSource,
    user_id: userId,
    // Explícitos aunque coincidan con el DEFAULT de la columna: es el
    // único estado inicial aprobado (D-02), no un valor inventado.
    status: "active",
    goal_lifecycle_status: "active",
  };

  if (payload.progressSource === "habit_logs") {
    if (!payload.habitId) {
      throw new AppError({
        kind: "validation",
        technicalMessage: "goals.service: progress_source=habit_logs requiere habitId.",
        friendlyMessage: "Selecciona el hábito al que se vinculará esta meta.",
      });
    }

    const goalType = await fetchOwnHabitGoalType(payload.habitId);
    if (!SUPPORTED_HABIT_LOGS_GOAL_TYPES.includes(goalType)) {
      throw new AppError({
        kind: "validation",
        technicalMessage: `goals.service: goal_type "${goalType}" del hábito no tiene fórmula de progreso aprobada para progress_source=habit_logs.`,
        friendlyMessage:
          "Este hábito todavía no admite progreso automático (solo cantidad, duración o repeticiones lo admiten hoy). Elige otro hábito o crea una meta manual.",
      });
    }

    insert.habit_id = payload.habitId;
  } else {
    insert.habit_id = null;
    if (payload.currentValue !== undefined) {
      insert.current_value = requireNonNegative(payload.currentValue, "current_value");
    }
  }

  const { data, error } = await supabase.from("goals").insert(insert).select().single();
  if (error) throw mapGoalError(error);
  return data;
}

/**
 * Edita solo los campos realmente editables. Nunca toca user_id,
 * progress_source, current_value, status ni goal_lifecycle_status — ni
 * siquiera a nivel de tipo. `habitId` solo se permite cuando la meta ya es
 * progress_source="habit_logs" (revalidando propiedad + goal_type
 * soportado del hábito nuevo); para "manual"/"calculated" se rechaza antes
 * de llamar a Supabase, ya que no hay ningún camino de UI aprobado para
 * revincularlas.
 */
async function updateGoal(id: string, payload: UpdateGoalPayload): Promise<Goal> {
  const current = await getGoalById(id);

  const update: GoalUpdateRow = {};

  if (payload.title !== undefined) update.title = requireNonEmptyTitle(payload.title);
  if (payload.description !== undefined) update.description = normalizeDescription(payload.description);
  if (payload.unit !== undefined) update.unit = requireNonEmptyUnit(payload.unit);
  if (payload.targetValue !== undefined) update.target_value = requirePositiveTargetValue(payload.targetValue);

  if (payload.startDate !== undefined || payload.endDate !== undefined) {
    const dates = requireCoherentDates(payload.startDate ?? current.start_date, payload.endDate ?? current.end_date);
    update.start_date = dates.startDate;
    update.end_date = dates.endDate;
  }

  if (payload.habitId !== undefined) {
    if (current.progress_source !== "habit_logs") {
      throw new AppError({
        kind: "validation",
        technicalMessage: `goals.service: intento de cambiar habitId en una meta progress_source=${current.progress_source}.`,
        friendlyMessage: "Solo las metas vinculadas a un hábito con progreso automático pueden cambiar de hábito.",
      });
    }
    if (!payload.habitId) {
      throw new AppError({
        kind: "validation",
        technicalMessage: "goals.service: intento de dejar habitId vacío en una meta progress_source=habit_logs.",
        friendlyMessage: "Esta meta necesita un hábito vinculado — no puede quedar sin uno.",
      });
    }

    const goalType = await fetchOwnHabitGoalType(payload.habitId);
    if (!SUPPORTED_HABIT_LOGS_GOAL_TYPES.includes(goalType)) {
      throw new AppError({
        kind: "validation",
        technicalMessage: `goals.service: goal_type "${goalType}" del nuevo hábito no tiene fórmula de progreso aprobada.`,
        friendlyMessage: "Este hábito todavía no admite progreso automático (solo cantidad, duración o repeticiones lo admiten hoy).",
      });
    }
    update.habit_id = payload.habitId;
  }

  const { data, error } = await supabase.from("goals").update(update).eq("id", id).select().single();
  if (error) throw mapGoalError(error);
  return data;
}

/**
 * Única función autorizada para escribir current_value directamente, y
 * solo para metas progress_source="manual" — para "habit_logs"/"calculated"
 * el propio protect_goal_current_value_trg lo rechazaría de todas formas,
 * pero esta función ni siquiera lo intenta: valida el origen antes de
 * llamar a Supabase.
 */
async function updateManualGoalProgress(id: string, currentValue: number): Promise<Goal> {
  const value = requireNonNegative(currentValue, "current_value");
  const current = await getGoalById(id);

  if (current.progress_source !== "manual") {
    throw new AppError({
      kind: "validation",
      technicalMessage: `goals.service: updateManualGoalProgress llamada sobre una meta progress_source=${current.progress_source}.`,
      friendlyMessage: "El progreso de esta meta se calcula automáticamente; no puedes editarlo directamente.",
    });
  }

  const { data, error } = await supabase
    .from("goals")
    .update({ current_value: value })
    .eq("id", id)
    .select()
    .single();

  if (error) throw mapGoalError(error);
  return data;
}

/** UPDATE de goal_lifecycle_status únicamente — nunca DELETE físico (no hay
 * política RLS ni GRANT que lo permitan). Conserva current_value, status,
 * habit_id, fechas y toda relación intactos: no se listan en el SET. */
async function setGoalLifecycleStatus(id: string, lifecycleStatus: DbGoalLifecycleStatus): Promise<Goal> {
  const { data, error } = await supabase
    .from("goals")
    .update({ goal_lifecycle_status: lifecycleStatus })
    .eq("id", id)
    .select()
    .single();

  if (error) throw mapGoalError(error);
  return data;
}

const pauseGoal = (id: string) => setGoalLifecycleStatus(id, "paused");
const reactivateGoal = (id: string) => setGoalLifecycleStatus(id, "active");
const softDeleteGoal = (id: string) => setGoalLifecycleStatus(id, "deleted");
const restoreGoal = (id: string) => setGoalLifecycleStatus(id, "active");

export const goalsService = {
  getGoals,
  getActiveGoals,
  getPausedGoals,
  getDeletedGoals,
  getGoalById,
  createGoal,
  updateGoal,
  updateManualGoalProgress,
  pauseGoal,
  reactivateGoal,
  softDeleteGoal,
  restoreGoal,
};
