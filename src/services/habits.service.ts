// Servicio real de hábitos. Combina tres tablas reales en un único modelo
// visual (`src/types/habit.ts`, el mismo que ya consumían HabitsPage,
// HabitCard, HabitListRow, HabitFormModal y useHabitsManager con mocks):
//   - public.habits           -> datos propios del hábito.
//   - public.habit_schedules  -> únicamente la versión vigente
//     (valid_to IS NULL) se usa aquí; el historial completo lo expone
//     habitSchedules.service.ts por separado si se necesita.
//   - public.habit_categories -> tabla puente N:M con categories.
//
// Ningún INSERT/UPDATE directo sobre habit_schedules: toda escritura pasa
// por las RPC de habitSchedules.service.ts (ver su cabecera).

import { supabase } from "../lib/supabase";
import { authService } from "./auth.service";
import { habitSchedulesService, type FrequencyInput } from "./habitSchedules.service";
import { AppError, FRIENDLY_MESSAGES, normalizeSupabaseError } from "../lib/errors";
import type { Habit, HabitLifecycleStatus } from "../types/habit";
import type { Database } from "../types/database.types";

export type { Habit };

type HabitRow = Database["public"]["Tables"]["habits"]["Row"];
type HabitScheduleRow = Database["public"]["Tables"]["habit_schedules"]["Row"];

// Mismo contrato que `HabitDraft` de `useHabitsManager.ts` (mock) — el
// formulario ya existente (`HabitFormModal`) construye exactamente este
// objeto tanto en modo mock como en modo Supabase, sin saber cuál es.
export type HabitDraft = Omit<Habit, "id" | "lifecycleStatus" | "createdAt" | "updatedAt">;

const UNIQUE_VIOLATION_CODE = "23505";

// ----------------------------------------------------------------------------
// Validación previa (defensa en profundidad — la autoridad final son los
// CHECK constraints reales: habits_name_length_chk, habits_end_date_after_start_chk,
// habits_goal_type_coherence_chk, database_integrity.sql).
// ----------------------------------------------------------------------------

const VALUE_GOAL_TYPES: Habit["goalType"][] = ["quantity", "duration", "repetitions", "accumulated_days"];

function requireValidName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 150) {
    throw new AppError({
      kind: "validation",
      technicalMessage: `habits.service: name inválido tras trim() (longitud ${trimmed.length}).`,
      friendlyMessage: "El nombre del hábito es obligatorio y admite hasta 150 caracteres.",
    });
  }
  return trimmed;
}

// Convierte el draft del formulario (campos opcionales como "" o undefined)
// en los valores que exige habits_goal_type_coherence_chk: boolean -> null;
// deadline -> deadline_time obligatorio; el resto de tipos numéricos ->
// target_value obligatorio. Nunca se envía un valor "vacío" tal cual —
// siempre se normaliza a null cuando el tipo de meta no lo requiere.
function coerceGoalFields(draft: HabitDraft): {
  target_value: number | null;
  target_unit: string | null;
  deadline_time: string | null;
} {
  if (draft.goalType === "boolean") {
    return { target_value: null, target_unit: null, deadline_time: null };
  }

  if (draft.goalType === "deadline") {
    if (!draft.deadlineTime) {
      throw new AppError({
        kind: "validation",
        technicalMessage: "habits.service: goalType=deadline requiere deadlineTime.",
        friendlyMessage: "Selecciona una hora límite para este tipo de meta.",
      });
    }
    return { target_value: null, target_unit: null, deadline_time: draft.deadlineTime };
  }

  if (VALUE_GOAL_TYPES.includes(draft.goalType)) {
    if (draft.targetValue === undefined || draft.targetValue === null || draft.targetValue <= 0) {
      throw new AppError({
        kind: "validation",
        technicalMessage: `habits.service: goalType=${draft.goalType} requiere targetValue > 0.`,
        friendlyMessage: "Ingresa una meta mayor a 0 para este hábito.",
      });
    }
    return {
      target_value: draft.targetValue,
      target_unit: draft.targetUnit?.trim() || null,
      deadline_time: null,
    };
  }

  return { target_value: null, target_unit: null, deadline_time: null };
}

function requireCoherentDates(draft: HabitDraft): { start_date: string; end_date: string | null } {
  if (!draft.startDate) {
    throw new AppError({
      kind: "validation",
      technicalMessage: "habits.service: startDate vacío.",
      friendlyMessage: "La fecha de inicio es obligatoria.",
    });
  }
  if (draft.endDate && draft.endDate < draft.startDate) {
    throw new AppError({
      kind: "validation",
      technicalMessage: `habits.service: endDate (${draft.endDate}) anterior a startDate (${draft.startDate}).`,
      friendlyMessage: "La fecha de fin no puede ser anterior a la fecha de inicio.",
    });
  }
  return { start_date: draft.startDate, end_date: draft.endDate || null };
}

function toFrequencyInput(draft: HabitDraft): FrequencyInput {
  return {
    frequencyType: draft.frequencyType,
    daysOfWeek: draft.frequencyType === "specific_days" ? (draft.daysOfWeek ?? []) : null,
    frequencyTarget:
      draft.frequencyType === "times_per_week" || draft.frequencyType === "times_per_month"
        ? (draft.frequencyTarget ?? null)
        : null,
    intervalDays: draft.frequencyType === "custom_interval" ? (draft.intervalDays ?? null) : null,
  };
}

async function requireCurrentUserId(): Promise<string> {
  const user = await authService.getCurrentUser();
  if (!user) {
    throw new AppError({
      kind: "auth",
      technicalMessage: "habits.service: no hay sesión activa (auth.getUser() devolvió null).",
      friendlyMessage: FRIENDLY_MESSAGES.auth,
    });
  }
  return user.id;
}

type HabitOperation = "read" | "create" | "update" | "lifecycle" | "restore";

function mapHabitError(error: unknown, operation: HabitOperation): AppError {
  const normalized = normalizeSupabaseError(error);

  if (normalized.code === UNIQUE_VIOLATION_CODE) {
    const friendlyMessage =
      operation === "restore"
        ? "No se pudo restaurar: ya tienes otro hábito activo, pausado o archivado con ese nombre. Cambia el nombre de uno de los dos e inténtalo de nuevo."
        : "Ya tienes un hábito con ese nombre.";
    return new AppError({
      kind: normalized.kind,
      technicalMessage: normalized.message,
      friendlyMessage,
      code: normalized.code,
      cause: normalized.cause,
    });
  }

  if (normalized.kind === "not_found") {
    return new AppError({
      kind: normalized.kind,
      technicalMessage: normalized.message,
      friendlyMessage: "No encontramos ese hábito.",
      code: normalized.code,
      cause: normalized.cause,
    });
  }

  // change_habit_schedule (RPC) rechaza un cambio de frecuencia cuyo
  // effective_date no sea ESTRICTAMENTE posterior al valid_from de la
  // versión vigente — un hábito creado (o cuya frecuencia ya cambió) hoy
  // mismo no puede volver a cambiar su frecuencia hoy. Es una limitación
  // real y deliberada del diseño temporal de D-03, no un error genérico:
  // se detecta por el texto del mensaje (no tiene SQLSTATE propio, llega
  // como P0001) y se traduce a algo accionable en vez del genérico de
  // "validation".
  if (/effective_date.*must be strictly after/i.test(normalized.message)) {
    return new AppError({
      kind: normalized.kind,
      technicalMessage: normalized.message,
      friendlyMessage:
        "No puedes cambiar la periodicidad el mismo día en que se creó o se modificó por última vez. Inténtalo de nuevo mañana.",
      code: normalized.code,
      cause: normalized.cause,
    });
  }

  return normalized;
}

// ----------------------------------------------------------------------------
// Ensamblado del modelo visual a partir de las tres tablas.
// ----------------------------------------------------------------------------

function toVisualHabit(row: HabitRow, schedule: HabitScheduleRow | undefined, categoryIds: string[]): Habit {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    categoryIds,
    icon: row.icon,
    color: row.color,
    // `schedule` puede faltar únicamente si create_habit_schedule nunca se
    // ejecutó con éxito para este hábito (ver limitación de atomicidad en
    // createHabit) — se usa "daily" como valor de lectura defensivo, nunca
    // se escribe de vuelta a la base de datos.
    frequencyType: schedule?.frequency_type ?? "daily",
    daysOfWeek: schedule?.days_of_week ?? undefined,
    frequencyTarget: schedule?.frequency_target ?? undefined,
    intervalDays: schedule?.interval_days ?? undefined,
    goalType: row.goal_type,
    targetValue: row.target_value ?? undefined,
    targetUnit: row.target_unit ?? undefined,
    deadlineTime: row.deadline_time ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    lifecycleStatus: row.lifecycle_status,
    allowPartial: row.allow_partial,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchCategoryLinks(): Promise<Map<string, string[]>> {
  const { data, error } = await supabase.from("habit_categories").select("habit_id, category_id");
  if (error) throw mapHabitError(error, "read");

  const map = new Map<string, string[]>();
  for (const link of data) {
    const list = map.get(link.habit_id) ?? [];
    list.push(link.category_id);
    map.set(link.habit_id, list);
  }
  return map;
}

async function fetchAllHabits(): Promise<Habit[]> {
  const [habitsResult, schedules, categoryLinks] = await Promise.all([
    supabase.from("habits").select("*").order("created_at", { ascending: false }),
    habitSchedulesService.getCurrentSchedules(),
    fetchCategoryLinks(),
  ]);

  if (habitsResult.error) throw mapHabitError(habitsResult.error, "read");

  const scheduleByHabitId = new Map(schedules.map((schedule) => [schedule.habit_id, schedule]));

  return habitsResult.data.map((row) =>
    toVisualHabit(row, scheduleByHabitId.get(row.id), categoryLinks.get(row.id) ?? []),
  );
}

/** Todos los hábitos propios (cualquier lifecycle_status). Sin filtro manual
 * por user_id: RLS ("Habits are selectable by owner") ya lo garantiza. */
async function getHabits(): Promise<Habit[]> {
  return fetchAllHabits();
}

async function getActiveHabits(): Promise<Habit[]> {
  return (await fetchAllHabits()).filter((habit) => habit.lifecycleStatus === "active");
}

async function getDeletedHabits(): Promise<Habit[]> {
  return (await fetchAllHabits()).filter((habit) => habit.lifecycleStatus === "deleted");
}

async function getHabitById(id: string): Promise<Habit> {
  const [habitResult, scheduleResult, linksResult] = await Promise.all([
    supabase.from("habits").select("*").eq("id", id).single(),
    supabase.from("habit_schedules").select("*").eq("habit_id", id).is("valid_to", null).maybeSingle(),
    supabase.from("habit_categories").select("category_id").eq("habit_id", id),
  ]);

  if (habitResult.error) throw mapHabitError(habitResult.error, "read");
  if (scheduleResult.error) throw mapHabitError(scheduleResult.error, "read");
  if (linksResult.error) throw mapHabitError(linksResult.error, "read");

  return toVisualHabit(
    habitResult.data,
    scheduleResult.data ?? undefined,
    linksResult.data.map((link) => link.category_id),
  );
}

async function syncHabitCategories(habitId: string, nextCategoryIds: string[], currentCategoryIds: string[]) {
  const nextSet = new Set(nextCategoryIds);
  const currentSet = new Set(currentCategoryIds);

  const toAdd = nextCategoryIds.filter((id) => !currentSet.has(id));
  const toRemove = currentCategoryIds.filter((id) => !nextSet.has(id));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("habit_categories")
      .delete()
      .eq("habit_id", habitId)
      .in("category_id", toRemove);
    if (error) throw mapHabitError(error, "update");
  }

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("habit_categories")
      .insert(toAdd.map((categoryId) => ({ habit_id: habitId, category_id: categoryId })));
    if (error) throw mapHabitError(error, "update");
  }
}

/**
 * Crea un hábito nuevo: INSERT en `habits`, primera versión de
 * `habit_schedules` (RPC `create_habit_schedule`) y asociaciones en
 * `habit_categories` — tres operaciones Supabase independientes, no una
 * transacción real (la arquitectura actual del cliente no ofrece una).
 *
 * Límite de atomicidad, documentado explícitamente (ver también MDs/12): si
 * el paso 2 o el paso 3 falla, esta función hace un borrado lógico del
 * hábito recién creado en el paso 1 como compensación de mejor esfuerzo
 * (nunca un DELETE físico — no está permitido). Si esa misma compensación
 * falla (por ejemplo, la conexión se cae justo después del error original),
 * el hábito puede quedar activo sin programación o sin categorías —
 * recuperable manualmente editándolo, pero no revertido automáticamente.
 */
async function createHabit(draft: HabitDraft): Promise<Habit> {
  const name = requireValidName(draft.name);
  const goalFields = coerceGoalFields(draft);
  const dates = requireCoherentDates(draft);
  const userId = await requireCurrentUserId();

  const { data: habitRow, error: insertError } = await supabase
    .from("habits")
    .insert({
      name,
      description: draft.description?.trim() || null,
      icon: draft.icon,
      color: draft.color,
      goal_type: draft.goalType,
      target_value: goalFields.target_value,
      target_unit: goalFields.target_unit,
      deadline_time: goalFields.deadline_time,
      start_date: dates.start_date,
      end_date: dates.end_date,
      allow_partial: draft.goalType === "boolean" ? false : draft.allowPartial,
      user_id: userId,
      lifecycle_status: "active",
    })
    .select()
    .single();

  if (insertError) throw mapHabitError(insertError, "create");

  const habitId = habitRow.id;

  async function compensate(cause: unknown): Promise<never> {
    await supabase.from("habits").update({ lifecycle_status: "deleted" }).eq("id", habitId);
    throw mapHabitError(cause, "create");
  }

  let schedule;
  try {
    schedule = await habitSchedulesService.createHabitSchedule(habitId, toFrequencyInput(draft));
  } catch (caught) {
    return compensate(caught);
  }

  try {
    if (draft.categoryIds.length > 0) {
      await syncHabitCategories(habitId, draft.categoryIds, []);
    }
  } catch (caught) {
    return compensate(caught);
  }

  return toVisualHabit(habitRow, schedule, draft.categoryIds);
}

/**
 * Edita un hábito propio. Solo columnas editables reales de `habits`
 * (nunca `user_id` ni `lifecycle_status` — esta función no los acepta ni a
 * nivel de tipo). Si la frecuencia cambió respecto a la vigente, se llama a
 * `change_habit_schedule` con fecha de vigencia "hoy" (ver limitación en
 * habitSchedules.service.ts). Las categorías se sincronizan por diferencia
 * (agrega solo lo nuevo, quita solo lo retirado) — nunca se duplican
 * asociaciones.
 */
async function updateHabit(id: string, draft: HabitDraft): Promise<Habit> {
  const name = requireValidName(draft.name);
  const goalFields = coerceGoalFields(draft);
  const dates = requireCoherentDates(draft);

  const [{ data: habitRow, error: updateError }, currentScheduleResult, currentLinksResult] = await Promise.all([
    supabase
      .from("habits")
      .update({
        name,
        description: draft.description?.trim() || null,
        icon: draft.icon,
        color: draft.color,
        goal_type: draft.goalType,
        target_value: goalFields.target_value,
        target_unit: goalFields.target_unit,
        deadline_time: goalFields.deadline_time,
        start_date: dates.start_date,
        end_date: dates.end_date,
        allow_partial: draft.goalType === "boolean" ? false : draft.allowPartial,
      })
      .eq("id", id)
      .select()
      .single(),
    supabase.from("habit_schedules").select("*").eq("habit_id", id).is("valid_to", null).maybeSingle(),
    supabase.from("habit_categories").select("category_id").eq("habit_id", id),
  ]);

  if (updateError) throw mapHabitError(updateError, "update");
  if (currentScheduleResult.error) throw mapHabitError(currentScheduleResult.error, "update");
  if (currentLinksResult.error) throw mapHabitError(currentLinksResult.error, "update");

  const currentSchedule = currentScheduleResult.data;
  const nextFrequency = toFrequencyInput(draft);
  const frequencyChanged =
    !currentSchedule ||
    currentSchedule.frequency_type !== nextFrequency.frequencyType ||
    JSON.stringify(currentSchedule.days_of_week ?? null) !== JSON.stringify(nextFrequency.daysOfWeek) ||
    (currentSchedule.frequency_target ?? null) !== nextFrequency.frequencyTarget ||
    (currentSchedule.interval_days ?? null) !== nextFrequency.intervalDays;

  let schedule = currentSchedule ?? undefined;
  if (frequencyChanged) {
    const today = new Date().toISOString().slice(0, 10);
    try {
      schedule = currentSchedule
        ? await habitSchedulesService.changeHabitSchedule(id, nextFrequency, today)
        : await habitSchedulesService.createHabitSchedule(id, nextFrequency);
    } catch (caught) {
      throw mapHabitError(caught, "update");
    }
  }

  const currentCategoryIds = currentLinksResult.data.map((link) => link.category_id);
  await syncHabitCategories(id, draft.categoryIds, currentCategoryIds);

  return toVisualHabit(habitRow, schedule, draft.categoryIds);
}

async function setHabitLifecycleStatus(id: string, lifecycleStatus: HabitLifecycleStatus): Promise<Habit> {
  const operation: HabitOperation = lifecycleStatus === "active" ? "restore" : "lifecycle";

  const [{ data: habitRow, error }, scheduleResult, linksResult] = await Promise.all([
    supabase.from("habits").update({ lifecycle_status: lifecycleStatus }).eq("id", id).select().single(),
    supabase.from("habit_schedules").select("*").eq("habit_id", id).is("valid_to", null).maybeSingle(),
    supabase.from("habit_categories").select("category_id").eq("habit_id", id),
  ]);

  if (error) throw mapHabitError(error, operation);
  if (scheduleResult.error) throw mapHabitError(scheduleResult.error, operation);
  if (linksResult.error) throw mapHabitError(linksResult.error, operation);

  return toVisualHabit(habitRow, scheduleResult.data ?? undefined, linksResult.data.map((link) => link.category_id));
}

/** Borrado lógico — UPDATE de lifecycle_status únicamente. Programación y
 * categorías se conservan intactas (no son un UPDATE sobre esas tablas). */
async function softDeleteHabit(id: string): Promise<Habit> {
  return setHabitLifecycleStatus(id, "deleted");
}

/** Restaura un hábito de la papelera. Si ya existe otro hábito propio
 * activo/pausado/archivado con el mismo nombre normalizado (índice
 * `habits_active_name_normalized_idx`, WHERE lifecycle_status <> 'deleted'),
 * el UPDATE falla con 23505 — traducido a un mensaje amigable pidiendo
 * renombrar, igual que en categories.service.ts. */
async function restoreHabit(id: string): Promise<Habit> {
  return setHabitLifecycleStatus(id, "active");
}

export const habitsService = {
  getHabits,
  getActiveHabits,
  getDeletedHabits,
  getHabitById,
  createHabit,
  updateHabit,
  softDeleteHabit,
  restoreHabit,
  setHabitLifecycleStatus,
};
