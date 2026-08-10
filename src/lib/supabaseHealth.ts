import { authService } from "../services/auth.service";
import { profilesService } from "../services/profiles.service";
import { normalizeSupabaseError } from "./errors";

export interface SupabaseHealthCheckResult {
  ok: boolean;
  /** true si la API de Supabase Local respondió (URL + publishable key correctas). */
  apiReachable: boolean;
  /** true si hay una sesión activa en el momento de la comprobación. */
  hasActiveSession: boolean;
  /** Solo se comprueba si hay sesión activa — no requiere login para que el resto pase. */
  profileCheck: "ok" | "failed" | "skipped_no_session";
  message: string;
}

/**
 * Comprobación de conexión no destructiva: no inserta ni modifica datos,
 * no imprime la URL ni la publishable key. Confirma que el cliente tipado
 * puede hablar con la API local de Supabase (getSession siempre responde,
 * haya o no sesión) y, si hay una sesión activa, confirma además que un
 * SELECT real contra `profiles` funciona de extremo a extremo (RLS
 * incluida).
 */
export async function checkSupabaseConnection(): Promise<SupabaseHealthCheckResult> {
  let session;

  try {
    session = await authService.getSession();
  } catch (error) {
    const appError = normalizeSupabaseError(error);
    return {
      ok: false,
      apiReachable: false,
      hasActiveSession: false,
      profileCheck: "skipped_no_session",
      message: `No se pudo contactar a Supabase Local: ${appError.friendlyMessage}`,
    };
  }

  if (!session) {
    return {
      ok: true,
      apiReachable: true,
      hasActiveSession: false,
      profileCheck: "skipped_no_session",
      message: "Supabase Local responde correctamente (sin sesión activa; el SELECT a profiles no se probó).",
    };
  }

  try {
    await profilesService.getMyProfile();
    return {
      ok: true,
      apiReachable: true,
      hasActiveSession: true,
      profileCheck: "ok",
      message: "Supabase Local responde correctamente y el SELECT a profiles (con RLS) funcionó.",
    };
  } catch {
    return {
      ok: false,
      apiReachable: true,
      hasActiveSession: true,
      profileCheck: "failed",
      message: "La API respondió y hay sesión activa, pero el SELECT a profiles falló.",
    };
  }
}
