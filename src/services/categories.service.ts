import { supabase } from "../lib/supabase";
import { authService } from "./auth.service";
import { AppError, FRIENDLY_MESSAGES, normalizeSupabaseError } from "../lib/errors";
import type { Category } from "../types/entities";

export type { Category };

// Payload de creación: únicamente los campos editables reales de
// `public.categories` (database.types.ts) que tiene sentido que decida el
// cliente. `color`/`icon` son NOT NULL sin DEFAULT en la tabla — a
// diferencia de `lifecycle_status` (DEFAULT 'active'), si no se envían aquí
// el INSERT fallaría, así que sí forman parte del payload de creación. `id`,
// `user_id`, `created_at` y `lifecycle_status` los decide el servidor/esta
// función, nunca el llamador.
export interface CreateCategoryPayload {
  name: string;
  color: string;
  icon: string;
}

// Payload de actualización: únicamente `name` (regla explícita de esta
// tarea). `color`/`icon` no son editables desde updateCategory(); el
// borrado lógico/restauración tienen sus propias funciones dedicadas más
// abajo, que tampoco pasan por aquí.
export interface UpdateCategoryPayload {
  name: string;
}

const UNIQUE_VIOLATION_CODE = "23505";

function normalizeName(name: string): string {
  return name.trim();
}

function requireNonEmptyName(name: string): string {
  const trimmed = normalizeName(name);
  if (!trimmed) {
    throw new AppError({
      kind: "validation",
      technicalMessage: "categories.service: name vacío o solo espacios tras trim().",
      friendlyMessage: "El nombre de la categoría no puede estar vacío.",
    });
  }
  return trimmed;
}

async function requireCurrentUserId(): Promise<string> {
  const user = await authService.getCurrentUser();
  if (!user) {
    throw new AppError({
      kind: "auth",
      technicalMessage: "categories.service: no hay sesión activa (auth.getUser() devolvió null).",
      friendlyMessage: FRIENDLY_MESSAGES.auth,
    });
  }
  return user.id;
}

type CategoryOperation = "read" | "create" | "update" | "softDelete" | "restore";

/**
 * Envuelve `normalizeSupabaseError` con mensajes específicos de categorías
 * donde el mensaje genérico por `kind` no basta para que el usuario sepa qué
 * hacer — en particular, el mismo código `23505` (unicidad normalizada,
 * D-01/H-06) significa algo distinto al crear que al restaurar.
 */
function mapCategoryError(error: unknown, operation: CategoryOperation): AppError {
  const normalized = normalizeSupabaseError(error);

  if (normalized.code === UNIQUE_VIOLATION_CODE) {
    const friendlyMessage =
      operation === "restore"
        ? "No se pudo restaurar: ya tienes otra categoría activa con ese nombre. Cambia el nombre de una de las dos e inténtalo de nuevo."
        : "Ya tienes una categoría activa con ese nombre.";

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
      friendlyMessage: "No encontramos esa categoría.",
      code: normalized.code,
      cause: normalized.cause,
    });
  }

  return normalized;
}

/**
 * Todas las categorías propias (activas y en papelera), ordenadas
 * alfabéticamente. Sin filtro manual por `user_id`: la política RLS
 * "Categories are selectable by owner" (`auth.uid() = user_id`) ya garantiza
 * que nunca se reciban filas de otro usuario.
 */
async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select("*").order("name", { ascending: true });

  if (error) throw mapCategoryError(error, "read");
  return data;
}

async function getActiveCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("lifecycle_status", "active")
    .order("name", { ascending: true });

  if (error) throw mapCategoryError(error, "read");
  return data;
}

async function getDeletedCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("lifecycle_status", "deleted")
    .order("name", { ascending: true });

  if (error) throw mapCategoryError(error, "read");
  return data;
}

/**
 * Crea una categoría `active` para el usuario autenticado. No convierte
 * automáticamente una `deleted` homónima en `active` (decisión D-01, punto
 * 4 del encargo): si ya existe una `deleted` con el mismo nombre
 * normalizado, esta operación de todas formas tiene éxito — el índice único
 * parcial (`WHERE lifecycle_status = 'active'`) solo compara contra otras
 * filas `active`.
 */
async function createCategory(payload: CreateCategoryPayload): Promise<Category> {
  const name = requireNonEmptyName(payload.name);
  const userId = await requireCurrentUserId();

  const { data, error } = await supabase
    .from("categories")
    .insert({
      name,
      color: payload.color,
      icon: payload.icon,
      user_id: userId,
      lifecycle_status: "active",
    })
    .select()
    .single();

  if (error) throw mapCategoryError(error, "create");
  return data;
}

/**
 * Renombra una categoría propia. Solo puede cambiar `name` — el tipo de
 * `payload` no admite `user_id` ni `lifecycle_status`, y la política RLS
 * "Categories are updatable by owner" (`USING`/`WITH CHECK auth.uid() =
 * user_id`) más el trigger `protect_categories_user_id_trg` son la garantía
 * final e ineludible. Sin filtro manual por `user_id`: si `id` pertenece a
 * otro usuario, RLS hace que el `UPDATE` afecte 0 filas y `.single()`
 * produce un error "no encontrado" (PGRST116) en vez de filtrar o exponer
 * la fila ajena.
 */
async function updateCategory(id: string, payload: UpdateCategoryPayload): Promise<Category> {
  const name = requireNonEmptyName(payload.name);

  const { data, error } = await supabase
    .from("categories")
    .update({ name })
    .eq("id", id)
    .select()
    .single();

  if (error) throw mapCategoryError(error, "update");
  return data;
}

/**
 * Borrado lógico (D-01): UPDATE de `lifecycle_status` a `deleted`, nunca un
 * DELETE físico — no existe política RLS de DELETE para `authenticated`
 * (rls_hardening.sql) ni GRANT de DELETE sobre `categories`
 * (table_privileges.sql), así que un DELETE físico sería rechazado por el
 * servidor de todas formas. Las filas de `habit_categories` que referencian
 * esta categoría no se tocan: al ser un UPDATE, no hay ningún ON DELETE
 * CASCADE que se dispare.
 */
async function softDeleteCategory(id: string): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .update({ lifecycle_status: "deleted" })
    .eq("id", id)
    .select()
    .single();

  if (error) throw mapCategoryError(error, "softDelete");
  return data;
}

/**
 * Restaura una categoría de la papelera. Si ya existe otra categoría
 * `active` propia con el mismo nombre normalizado, el índice único parcial
 * `categories_active_name_normalized_idx` (`lower(btrim(name))`) rechaza el
 * UPDATE con `23505` — se traduce a un mensaje amigable pidiendo renombrar,
 * sin modificar ningún nombre automáticamente (regla explícita de esta
 * tarea).
 */
async function restoreCategory(id: string): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .update({ lifecycle_status: "active" })
    .eq("id", id)
    .select()
    .single();

  if (error) throw mapCategoryError(error, "restore");
  return data;
}

export const categoriesService = {
  getCategories,
  getActiveCategories,
  getDeletedCategories,
  createCategory,
  updateCategory,
  softDeleteCategory,
  restoreCategory,
};
