import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { normalizeSupabaseError } from "../lib/errors";

export interface SignUpResult {
  user: User | null;
  session: Session | null;
  /** true si Supabase creó el usuario pero exige confirmar el correo antes de emitir sesión. */
  requiresEmailConfirmation: boolean;
}

export interface SignInResult {
  user: User;
  session: Session;
}

/**
 * Registra un usuario nuevo. `name` se envía en `options.data` (metadata
 * del usuario en auth.users) — es lo que lee `public.handle_new_user()`
 * (trigger AFTER INSERT ON auth.users) para crear automáticamente la fila
 * en `public.profiles`. No se inserta el perfil manualmente desde aquí ni
 * se usa service_role: el trigger corre en el servidor con sus propios
 * permisos, y `profiles.id` siempre queda igual a `auth.users.id`.
 */
async function signUp(email: string, password: string, name: string): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  });

  if (error) {
    throw normalizeSupabaseError(error);
  }

  return {
    user: data.user,
    session: data.session,
    requiresEmailConfirmation: data.user !== null && data.session === null,
  };
}

async function signIn(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw normalizeSupabaseError(error);
  }

  return { user: data.user, session: data.session };
}

async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw normalizeSupabaseError(error);
  }
}

async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw normalizeSupabaseError(error);
  }

  return data.session;
}

async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw normalizeSupabaseError(error);
  }

  return data.user;
}

/**
 * Envía el correo de restablecimiento de contraseña. Funciona contra
 * Supabase Local sin configuración externa: los correos no se envían
 * realmente, quedan interceptados en Mailpit (http://127.0.0.1:54324).
 * `redirectTo` se omite deliberadamente: todavía no existe una pantalla de
 * "nueva contraseña" a la que redirigir (pendiente — ver
 * MDs/12_BACKEND_INTEGRATION_SETUP.md); Supabase usará `site_url` de
 * supabase/config.toml mientras tanto.
 */
async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    throw normalizeSupabaseError(error);
  }
}

/**
 * Suscribe un callback a cambios de sesión (login, logout, refresco de
 * token). Devuelve una función para cancelar la suscripción — quien la
 * invoque es responsable de llamarla al desmontar (ver AuthContext).
 */
function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);

  return () => subscription.unsubscribe();
}

export const authService = {
  signUp,
  signIn,
  signOut,
  getSession,
  getCurrentUser,
  resetPassword,
  onAuthStateChange,
};
