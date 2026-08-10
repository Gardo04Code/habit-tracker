import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { authService } from "../services/auth.service";
import { profilesService } from "../services/profiles.service";
import type { Profile } from "../types/entities";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Descarta respuestas de perfil desactualizadas (de una sesión anterior)
  // si llegan después de un cambio de sesión más reciente.
  const profileRequestId = useRef(0);

  const loadProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    const requestId = ++profileRequestId.current;

    try {
      const nextProfile = await profilesService.getMyProfile();
      if (requestId === profileRequestId.current) {
        setProfile(nextProfile);
      }
    } catch {
      // No bloquear la UI si falla la carga del perfil (por ejemplo, la
      // fila todavía no existe si handle_new_user no terminó, o Supabase
      // Local no está accesible) — la sesión sigue siendo válida sin perfil.
      if (requestId === profileRequestId.current) {
        setProfile(null);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    authService
      .getSession()
      .then((initialSession) => {
        if (!isMounted) return undefined;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        return loadProfile(initialSession?.user ?? null);
      })
      .catch(() => {
        // Sesión inicial no disponible (por ejemplo, Supabase Local
        // inalcanzable) — se continúa sin sesión en vez de bloquear la app.
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // Un único listener para toda la app — se da de baja al desmontar para
    // evitar suscripciones duplicadas si el Provider se remonta.
    const unsubscribe = authService.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        void loadProfile(nextSession.user);
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    await authService.signIn(email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const result = await authService.signUp(email, password, name);
    return { requiresEmailConfirmation: result.requiresEmailConfirmation };
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(() => loadProfile(user), [loadProfile, user]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, session, profile, loading, signIn, signUp, signOut, refreshProfile }),
    [user, session, profile, loading, signIn, signUp, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- colocar el provider junto a su hook de consumo sigue el mismo patrón ya usado en src/hooks/useTheme.tsx.
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return context;
}
