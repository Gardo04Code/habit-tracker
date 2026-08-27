import { isSupabaseDataSource } from "../lib/dataSource";
import { toDateOnly } from "../utils/formatDate";

/**
 * Fecha "hoy" fija que ancla todos los datos mock, para que el histórico
 * de cuatro semanas y las reglas de edición (últimos 7 días) permanezcan
 * coherentes sin depender de la fecha real del sistema.
 */
export const TODAY = "2026-07-21";

/**
 * BUG-PROD-004: formularios de creación (hábito/meta) usaban TODAY —el
 * ancla fija de los mocks— como valor por defecto de "fecha de inicio"
 * incluso en modo Supabase real, mostrando una fecha antigua en vez de la
 * fecha real del sistema. TODAY sigue siendo correcto para anclar mocks
 * (no se toca); esta función es la que deben usar los formularios de
 * creación para el valor por defecto de un campo de fecha nuevo: en modo
 * mock preserva TODAY (coherente con el resto de los datos simulados), en
 * modo Supabase usa la fecha real del sistema.
 */
export function getFormDefaultDate(): string {
  return isSupabaseDataSource ? toDateOnly(new Date()) : TODAY;
}
