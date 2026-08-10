import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Faltan variables de entorno de Supabase. Define VITE_SUPABASE_URL y " +
      "VITE_SUPABASE_PUBLISHABLE_KEY en .env.local (copia .env.example como " +
      "punto de partida). Ver MDs/12_BACKEND_INTEGRATION_SETUP.md."
  );
}

// Instancia única del cliente Supabase para toda la aplicación. No crear
// clientes adicionales en otros módulos — todos los servicios deben
// importar esta misma instancia.
export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    // Persiste la sesión en el almacenamiento del navegador y la renueva
    // automáticamente antes de expirar — comportamiento estándar para una
    // SPA con Supabase Auth, sin opciones adicionales no necesarias hoy.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
