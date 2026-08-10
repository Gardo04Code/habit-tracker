-- ============================================================================
-- Migración: table_privileges
-- Origen: MDs/12_BACKEND_INTEGRATION_SETUP.md, sección 12 ("Validación de
-- autenticación") — hallazgo real detectado al probar signUp/getMyProfile
-- contra Supabase Local: `permission denied for table profiles` (SQLSTATE
-- 42501), con hint `GRANT SELECT ON public.profiles TO authenticated`.
--
-- Alcance: exclusivamente privilegios SQL de tabla (GRANT) para los roles
-- `authenticated` y `anon`. No crea, modifica ni elimina ninguna política
-- RLS, trigger, función, tabla, columna ni constraint — todo eso ya existe
-- y quedó validado en las migraciones 1-11 (MDs/11_DATABASE_VALIDATION_REPORT.md).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Causa raíz confirmada (no supuesta):
--
-- `auto_expose_new_tables` está deshabilitado en supabase/config.toml (el
-- comportamiento nuevo por defecto de Supabase: las tablas ya NO se exponen
-- automáticamente a los roles de la Data API). Ninguna de las 11
-- migraciones existentes otorgó nunca un GRANT de tabla — solo privilegios
-- EXECUTE sobre funciones (harden_functions.sql, database_integrity.sql,
-- habit_schedules.sql). RLS filtra FILAS; sin el GRANT de tabla, Postgres
-- deniega la operación antes de siquiera evaluar las políticas.
--
-- Verificado por inspección directa (solo lectura, sin modificar nada)
-- contra Postgres local antes de escribir este archivo:
--   - authenticated, anon y service_role YA tienen USAGE ON SCHEMA public
--     (heredado del bootstrap propio de Supabase, no de ninguna migración
--     de este proyecto) -> punto 6 del encargo: NO se otorga aquí, sería
--     redundante.
--   - No existe ninguna secuencia en el esquema public (las 7 tablas usan
--     `uuid primary key default gen_random_uuid()`, ninguna es
--     serial/identity) -> punto 7 del encargo: no se otorgan privilegios
--     de secuencia, no hay ninguna a la que otorgarlos.
--   - authenticated, anon y service_role solo tenían (por defecto de
--     PostgreSQL para todo objeto de tabla) REFERENCES/TRIGGER/TRUNCATE en
--     las 7 tablas — ninguno de los tres tenía SELECT/INSERT/UPDATE/DELETE.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- profiles
-- Políticas RLS vigentes (rls_hardening.sql): "Profiles are selectable by
-- owner" (SELECT), "Profiles are updatable by owner" (UPDATE). Sin política
-- de INSERT (el perfil lo crea handle_new_user(), SECURITY DEFINER, que
-- bypasea RLS/GRANT por ser el propietario — el cliente nunca inserta su
-- propio perfil) ni de DELETE (no aprobado por el producto).
-- ----------------------------------------------------------------------------
grant select, update on table public.profiles to authenticated;


-- ----------------------------------------------------------------------------
-- categories
-- Políticas: "Categories are selectable by owner" (SELECT), "...insertable
-- by owner" (INSERT), "...updatable by owner" (UPDATE). Sin DELETE físico
-- — D-01 usa lifecycle_status = 'active'/'deleted' (borrado lógico, ya
-- cubierto por UPDATE).
-- ----------------------------------------------------------------------------
grant select, insert, update on table public.categories to authenticated;


-- ----------------------------------------------------------------------------
-- habits
-- Políticas: "Habits are selectable by owner" (SELECT), "...insertable by
-- owner" (INSERT), "...updatable by owner" (UPDATE). Sin DELETE físico —
-- lifecycle_status (active/paused/archived/deleted) es el flujo aprobado.
-- ----------------------------------------------------------------------------
grant select, insert, update on table public.habits to authenticated;


-- ----------------------------------------------------------------------------
-- habit_categories
-- Políticas: "Habit categories are selectable by owner" (SELECT),
-- "...insertable by owner" (INSERT), "...deletable by owner" (DELETE). Sin
-- UPDATE — una asociación se cambia mediante DELETE + INSERT, no editando
-- la fila existente (decisión ya tomada en rls_hardening.sql).
-- ----------------------------------------------------------------------------
grant select, insert, delete on table public.habit_categories to authenticated;


-- ----------------------------------------------------------------------------
-- habit_schedules
-- Única política: "Habit schedules are viewable by owner" (SELECT). Sin
-- INSERT/UPDATE/DELETE directo — D-03 exige que todo cambio de frecuencia
-- pase por public.change_habit_schedule(...) (SECURITY DEFINER, ya con
-- GRANT EXECUTE a authenticated desde habit_schedules.sql, sin tocar aquí).
-- Otorgar aquí INSERT/UPDATE/DELETE de tabla sería innecesario para RLS
-- (no hay política que lo permitiera de todas formas) y contradiría
-- directamente ese diseño ya aprobado.
-- ----------------------------------------------------------------------------
grant select on table public.habit_schedules to authenticated;


-- ----------------------------------------------------------------------------
-- habit_logs
-- Políticas: "Habit logs are selectable by owner" (SELECT), "...insertable
-- by owner" (INSERT), "...updatable by owner" (UPDATE), "...deletable by
-- owner" (DELETE) — las cuatro operaciones están cubiertas por RLS, y la
-- ventana de 7 días la aplica enforce_habit_log_edit_window_trg de forma
-- independiente al GRANT.
-- ----------------------------------------------------------------------------
grant select, insert, update, delete on table public.habit_logs to authenticated;


-- ----------------------------------------------------------------------------
-- goals
-- Políticas: "Goals are selectable by owner" (SELECT), "...insertable by
-- owner" (INSERT), "...updatable by owner" (UPDATE). Sin DELETE físico —
-- D-02 usa goal_lifecycle_status = 'deleted' (ya cubierto por UPDATE).
-- ----------------------------------------------------------------------------
grant select, insert, update on table public.goals to authenticated;


-- ----------------------------------------------------------------------------
-- anon: sin ningún GRANT nuevo, deliberadamente.
--
-- Ninguna tabla de este proyecto tiene una política RLS que permita acceso
-- a un usuario no autenticado — las 7 tablas contienen exclusivamente
-- datos privados por usuario. Supabase Auth (GoTrue) no depende de
-- privilegios de `anon`/`authenticated` sobre el esquema `public`: opera
-- directamente sobre el esquema `auth` con su propio rol interno
-- (`supabase_auth_admin`), y `handle_new_user()` corre como SECURITY
-- DEFINER (bypasea GRANT/RLS por ser el propietario), no como `anon`. No
-- existe ningún objeto público del proyecto del que la autenticación
-- dependa. anon conserva únicamente REFERENCES/TRIGGER/TRUNCATE (los
-- mismos privilegios de PostgreSQL que ya tenía antes de esta migración,
-- irrelevantes para PostgREST, que solo emite SELECT/INSERT/UPDATE/DELETE)
-- — sigue sin poder leer ni escribir ninguna fila de ninguna tabla de
-- usuario.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- service_role: sin cambios. Bypasea RLS y privilegios de tabla por diseño
-- de Supabase (atributo BYPASSRLS + rol administrativo), documentado ya en
-- rls_hardening.sql — no requiere ni recibe ningún GRANT adicional aquí.
--
-- PUBLIC: sin ningún GRANT — ni aquí ni en ninguna migración anterior. No
-- se usa GRANT ALL en ningún punto de este archivo.
-- ----------------------------------------------------------------------------
