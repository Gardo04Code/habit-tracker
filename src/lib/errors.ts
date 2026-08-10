import { AuthError, PostgrestError } from "@supabase/supabase-js";

// Categoría normalizada de error, independiente de si el origen fue
// supabase-js (Auth), PostgREST (datos/RLS) o una falla de red.
export type AppErrorKind =
  | "auth"
  | "permission"
  | "validation"
  | "conflict"
  | "not_found"
  | "network"
  | "unknown";

// SQLSTATE/códigos de PostgREST relevantes para clasificar errores de datos.
// Ver https://www.postgresql.org/docs/current/errcodes-appendix.html
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const NOT_NULL_VIOLATION = "23502";
const CHECK_VIOLATION = "23514";
const INSUFFICIENT_PRIVILEGE = "42501";
const JWT_EXPIRED = "PGRST301";
// PostgREST: `.single()` sin filas (o con más de una) — incluye el caso de
// un id que no pertenece al usuario autenticado, ya que RLS lo filtra antes
// de que PostgREST pueda contarlo, así que UPDATE/SELECT devuelven 0 filas
// en vez de un 42501 explícito.
const NOT_FOUND_OR_NOT_SINGLE = "PGRST116";
// SQLSTATE genérico de PostgreSQL para `RAISE EXCEPTION` sin un código
// explícito — usado por las funciones RPC de este proyecto
// (change_habit_schedule, create_habit_schedule) y por los triggers de
// inmutabilidad (protect_*_user_id_trg) para rechazar una operación por una
// regla de negocio. Se clasifica como "validation": la mayoría de estos
// casos son coherencia de datos (fechas, campos requeridos por tipo); los
// pocos casos de propiedad (ownership) son un respaldo que nunca debería
// activarse desde un cliente bien portado, ya que RLS/la UI ya lo impiden
// antes.
const RAISED_EXCEPTION = "P0001";

/**
 * Error de aplicación normalizado. Siempre conserva el mensaje técnico
 * original (para logging en desarrollo) por separado del mensaje pensado
 * para mostrarse al usuario.
 */
export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly friendlyMessage: string;
  readonly code?: string;
  readonly cause?: unknown;

  constructor(params: {
    kind: AppErrorKind;
    technicalMessage: string;
    friendlyMessage: string;
    code?: string;
    cause?: unknown;
  }) {
    super(params.technicalMessage);
    this.name = "AppError";
    this.kind = params.kind;
    this.friendlyMessage = params.friendlyMessage;
    this.code = params.code;
    this.cause = params.cause;
  }
}

export const FRIENDLY_MESSAGES: Record<AppErrorKind, string> = {
  auth: "No pudimos verificar tu sesión. Inicia sesión nuevamente.",
  permission: "No tienes permiso para realizar esta acción.",
  validation: "Los datos enviados no son válidos. Revisa el formulario.",
  conflict: "Ya existe un registro con esos datos.",
  not_found: "No encontramos ese registro.",
  network: "No pudimos conectar con el servidor. Verifica tu conexión.",
  unknown: "Ocurrió un error inesperado. Intenta de nuevo.",
};

// supabase-js/postgrest-js solo construye una instancia real de la clase
// `PostgrestError` cuando se usa la API que lanza (`.throwOnError()`). En el
// patrón usado en todo este proyecto (`const { data, error } = await
// supabase.from(...)...`), la librería devuelve el error de PostgREST como
// objeto plano (`JSON.parse(body)` directo, ver
// node_modules/@supabase/postgrest-js/dist/index.mjs, `processResponse`) —
// nunca pasa por `new PostgrestError(...)`. Por eso `instanceof
// PostgrestError` nunca es cierto para ningún error real de este proyecto, y
// hay que reconocerlo por forma (misma forma documentada por la propia
// librería: `message`/`code` string, `details`/`hint` string o null), no por
// prototipo.
function isPostgrestErrorLike(
  error: unknown,
): error is { message: string; details: string | null; hint: string | null; code: string } {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as Record<string, unknown>;
  return typeof candidate.message === "string" && typeof candidate.code === "string";
}

function isLikelyNetworkFailure(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (error instanceof Error && /fetch|network|NetworkError/i.test(error.message))
  );
}

/**
 * Convierte cualquier error capturado en un servicio (Supabase Auth,
 * PostgREST/RLS, o de red) en un AppError con una categoría clara. No
 * expone mensajes técnicos crudos al llamador que renderiza UI — para eso
 * está `friendlyMessage`; `message`/`technicalMessage` quedan disponibles
 * solo para logging en desarrollo.
 */
export function normalizeSupabaseError(error: unknown): AppError {
  // Los servicios (auth.service.ts, profiles.service.ts) ya normalizan antes
  // de lanzar. Sin esta guarda, un AppError vuelto a pasar por aquí (por
  // ejemplo, al capturarlo de nuevo en la página que llamó al servicio)
  // perdía su clasificación real porque AppError no es instancia de
  // AuthError ni de PostgrestError, y caía siempre en "unknown".
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof AuthError) {
    const kind: AppErrorKind = error.status === 403 ? "permission" : "auth";
    return new AppError({
      kind,
      technicalMessage: error.message,
      friendlyMessage: FRIENDLY_MESSAGES[kind],
      code: error.code ?? String(error.status ?? ""),
      cause: error,
    });
  }

  if (error instanceof PostgrestError || isPostgrestErrorLike(error)) {
    let kind: AppErrorKind = "unknown";

    if (error.code === UNIQUE_VIOLATION) {
      kind = "conflict";
    } else if (
      error.code === CHECK_VIOLATION ||
      error.code === NOT_NULL_VIOLATION ||
      error.code === FOREIGN_KEY_VIOLATION
    ) {
      kind = "validation";
    } else if (error.code === INSUFFICIENT_PRIVILEGE) {
      kind = "permission";
    } else if (error.code === JWT_EXPIRED) {
      kind = "auth";
    } else if (error.code === NOT_FOUND_OR_NOT_SINGLE) {
      kind = "not_found";
    } else if (error.code === RAISED_EXCEPTION) {
      kind = "validation";
    }

    return new AppError({
      kind,
      technicalMessage: error.message,
      friendlyMessage: FRIENDLY_MESSAGES[kind],
      code: error.code,
      cause: error,
    });
  }

  if (isLikelyNetworkFailure(error)) {
    return new AppError({
      kind: "network",
      technicalMessage: error instanceof Error ? error.message : String(error),
      friendlyMessage: FRIENDLY_MESSAGES.network,
      cause: error,
    });
  }

  return new AppError({
    kind: "unknown",
    technicalMessage: error instanceof Error ? error.message : String(error),
    friendlyMessage: FRIENDLY_MESSAGES.unknown,
    cause: error,
  });
}
