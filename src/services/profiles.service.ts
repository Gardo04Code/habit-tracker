import { supabase } from "../lib/supabase";
import { AppError, FRIENDLY_MESSAGES, normalizeSupabaseError } from "../lib/errors";
import { authService } from "./auth.service";
import type { Profile } from "../types/entities";

// Columnas reales y editables de `public.profiles` (init_schema.sql),
// confirmadas antes de definir este payload. Se excluyen deliberadamente:
//   - id: inmutable — además de no listarse aquí, RLS ("Profiles are
//     updatable by owner", USING/WITH CHECK auth.uid() = id) rechazaría
//     igualmente cualquier intento de cambiarlo.
//   - created_at / updated_at: updated_at lo mantiene el trigger
//     set_profiles_updated_at; ninguna de las dos es editable por el cliente.
export type ProfileUpdatePayload = Partial<{
  name: string;
  avatar_url: string | null;
  timezone: string;
  week_starts_on: number;
  time_format: Profile["time_format"];
  language: string;
  notify_streak_at_risk: boolean;
  notify_abandoned_habit: boolean;
  notify_weekly_summary: boolean;
  notify_reminders: boolean;
}>;

function requireCurrentUserId(user: { id: string } | null): string {
  if (!user) {
    throw new AppError({
      kind: "auth",
      technicalMessage: "profiles.service: no hay sesión activa (auth.getUser() devolvió null).",
      friendlyMessage: FRIENDLY_MESSAGES.auth,
    });
  }
  return user.id;
}

/**
 * Obtiene el perfil del usuario autenticado actual. El id se obtiene de la
 * sesión (`auth.uid()` del lado del servidor, `getCurrentUser()` aquí) —
 * nunca se acepta un id como parámetro. RLS ("Profiles are selectable by
 * owner") es la garantía final: aunque el filtro `.eq("id", ...)` ya acota
 * la consulta, una fila ajena tampoco pasaría la política.
 */
async function getMyProfile(): Promise<Profile> {
  const user = await authService.getCurrentUser();
  const userId = requireCurrentUserId(user);

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    throw normalizeSupabaseError(error);
  }

  return data;
}

/**
 * Actualiza el perfil del usuario autenticado actual. `payload` solo puede
 * contener columnas editables reales (ver ProfileUpdatePayload) — no acepta
 * `id` a nivel de tipo, y el UPDATE siempre se acota a `id = auth.uid()`.
 * RLS ("Profiles are updatable by owner") es la garantía final.
 */
async function updateMyProfile(payload: ProfileUpdatePayload): Promise<Profile> {
  const user = await authService.getCurrentUser();
  const userId = requireCurrentUserId(user);

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    throw normalizeSupabaseError(error);
  }

  return data;
}

export const profilesService = {
  getMyProfile,
  updateMyProfile,
};
