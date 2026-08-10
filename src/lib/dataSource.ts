// Estrategia mínima para alternar entre datos simulados y Supabase real,
// pantalla por pantalla, sin que los componentes necesiten saber de dónde
// vienen los datos. Ningún componente existente depende todavía de esto —
// se prepara aquí para que, cuando se conecte la primera pantalla, ya
// exista un único lugar que decida la fuente.
//
// Por defecto es "mock": omitir VITE_DATA_SOURCE (o dejarlo vacío)
// preserva exactamente el comportamiento actual de la aplicación.

export type DataSource = "mock" | "supabase";

export const dataSource: DataSource =
  import.meta.env.VITE_DATA_SOURCE === "supabase" ? "supabase" : "mock";

export const isSupabaseDataSource = dataSource === "supabase";
