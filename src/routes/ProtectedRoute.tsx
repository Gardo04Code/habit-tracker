import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { isSupabaseDataSource } from "../lib/dataSource";

/**
 * Envuelve rutas internas que requieren sesión. Deliberadamente NO exige
 * login cuando VITE_DATA_SOURCE sigue en "mock" (el valor por defecto hoy)
 * — la navegación actual, construida sobre datos simulados, no tiene un
 * flujo de autenticación y no debe romperse por esta tarea. La protección
 * real se activa únicamente cuando VITE_DATA_SOURCE=supabase, que es
 * cuando además la app empieza a depender de auth.uid() para leer datos
 * reales (ver src/lib/dataSource.ts).
 */
export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (!isSupabaseDataSource) {
    return <Outlet />;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-text-secondary">
        Cargando sesión…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
