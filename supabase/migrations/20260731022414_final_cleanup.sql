-- ============================================================================
-- Migración: final_cleanup
-- Origen: MDs/09_DATABASE_AUDIT.md + MDs/10_DATABASE_DECISIONS.md — revisión
-- final de coherencia tras las 9 migraciones de corrección anteriores.
--
-- Alcance: solo tres cambios reales, cada uno demostrado seguro y sin
-- alternativa de negocio (ver reporte externo para el inventario completo
-- que los respalda). No agrega funcionalidad, no cambia reglas de negocio,
-- no modifica RLS aprobada en la Migración 7 más allá de un permiso
-- residual puntual.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Índice redundante: public.habit_logs_habit_id_idx (init_schema.sql).
--
-- Confirmado antes de eliminarlo: no es parcial, no tiene INCLUDE, no
-- respalda ninguna constraint (la UNIQUE(habit_id, date) de habit_logs,
-- que sigue existiendo sin cambios, genera su propio índice independiente
-- con habit_id como columna líder). Ninguna FK requiere específicamente
-- este índice — solo se recomienda un índice sobre la columna referenciada
-- para rendimiento, y el índice del UNIQUE(habit_id, date) ya cumple ese
-- papel por prefijo izquierdo. Ninguna consulta interna de trigger/función
-- (validate_habit_category_ownership, validate_goal_habit_ownership,
-- change_habit_schedule, set_habit_log_goal_snapshot,
-- protect_habit_log_goal_snapshot, sync_goal_progress_from_habit_log,
-- compute_goal_habit_logs_progress, recalculate_goal_current_value,
-- sync_goal_progress_from_goal_change, get_habit_local_date,
-- enforce_habit_log_edit_window) filtra habit_logs únicamente por habit_id
-- sin también acotar por date — todas quedan cubiertas por el índice del
-- UNIQUE. Ya reportado como candidato en
-- 20260731021200_performance_indexes.sql; se ejecuta aquí.
-- ----------------------------------------------------------------------------
drop index if exists public.habit_logs_habit_id_idx;


-- ----------------------------------------------------------------------------
-- 2. search_path inseguro: public.handle_new_user() (harden_functions.sql)
-- sigue declarada con `set search_path = public` en vez de `''`, pese a que
-- su cuerpo ya está completamente calificado por esquema
-- (`public.profiles`; `new.id`/`new.raw_user_meta_data` son campos del
-- registro del trigger, no identificadores resueltos por search_path). El
-- cambio no altera su comportamiento observable — solo elimina la
-- resolución implícita de nombres. Se corrige sin reescribir el cuerpo,
-- tal como exige el encargo.
-- ----------------------------------------------------------------------------
alter function public.handle_new_user() set search_path = '';


-- ----------------------------------------------------------------------------
-- 3. Permiso residual: la política "Habit schedules are viewable by owner"
-- (habit_schedules.sql, D-03) se creó antes de la Migración 7
-- (rls_hardening.sql) y nunca recibió la cláusula TO authenticated que esa
-- migración aplicó a las otras 18 políticas — hoy sigue aplicándose
-- implícitamente a PUBLIC. No representa una fuga de datos real (USING
-- exige auth.uid() = habits.user_id, y auth.uid() es NULL para anon, así
-- que anon ya obtiene cero filas), pero es una inconsistencia de alcance
-- frente al resto del esquema ya endurecido — se corrige por coherencia,
-- sin cambiar el nombre de la política ni su condición USING.
-- ----------------------------------------------------------------------------
drop policy if exists "Habit schedules are viewable by owner" on public.habit_schedules;

create policy "Habit schedules are viewable by owner"
  on public.habit_schedules
  for select
  to authenticated
  using (
    exists (
      select 1 from public.habits h
      where h.id = habit_id and h.user_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------------------
-- Objetos ya resueltos, sin acción en esta migración (confirmado por
-- inspección, no asumido):
--
-- public.habits_days_of_week_is_valid(smallint[]) — ya eliminada en
-- 20260731001044_habit_schedules.sql junto con la constraint que la usaba.
-- No existe ninguna referencia residual. No se emite un DROP innecesario.
--
-- public.rls_auto_enable() — 20260728183502_harden_functions.sql contiene
-- `revoke execute on function public.rls_auto_enable() from public, anon,
-- authenticated;`, pero esa función nunca se creó en ninguna migración
-- versionada de este repositorio. No se toca en esta migración: no hay
-- evidencia suficiente para determinar con certeza si es un objeto
-- provisto por la plataforma Supabase, un remanente fuera de control de
-- versiones, o una referencia inerte — "si existe duda, conserva el
-- objeto y repórtalo" (ver reporte de entrega).
--
-- Ninguna otra política FOR ALL sobrevive: las 7 políticas FOR ALL
-- originales de init_schema.sql (categories/habits/habit_categories/
-- habit_logs/goals) fueron eliminadas por nombre exacto en
-- 20260731015901_rls_hardening.sql y reemplazadas por 18 políticas
-- separadas por operación, todas con TO authenticated. No se repite ese
-- trabajo aquí.
-- ----------------------------------------------------------------------------
