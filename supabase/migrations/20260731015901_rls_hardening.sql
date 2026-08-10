-- ============================================================================
-- Migración: rls_hardening
-- Origen: MDs/09_DATABASE_AUDIT.md (H-01, H-02, H-05, H-10, H-17, H-18, H-19)
-- + MDs/10_DATABASE_DECISIONS.md (D-01, D-02, D-04, D-05, D-06 — puntos
-- pendientes de RLS ya reportados, no implementados, en cada migración de
-- corrección anterior)
--
-- Alcance: endurece las políticas RLS de profiles, categories, habits,
-- habit_categories, habit_logs y goals para que: cada usuario solo acceda
-- a sus propios datos; SELECT/INSERT/UPDATE/DELETE queden separados (sin
-- FOR ALL salvo justificación); el DELETE físico quede bloqueado para
-- authenticated en las entidades con borrado lógico (categories, habits,
-- goals); y las columnas de propiedad (user_id/habit_id) queden protegidas
-- contra reasignación mediante triggers BEFORE UPDATE independientes de
-- RLS. habit_schedules se confirma correcto y se deja sin cambios.
--
-- No modifica init_schema, harden_functions, database_integrity,
-- entity_lifecycle, habit_schedules,
-- 20260731002637_habit_log_goal_snapshots.sql,
-- 20260731004632_goal_progress_source.sql ni
-- 20260731014259_habit_log_edit_window.sql (nombres reales de archivo en
-- el repositorio, con sus correcciones ya aplicadas). No cambia lógica
-- funcional de ninguna RPC ni trigger existente.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- INVENTARIO COMPLETO (confirmado por inspección directa de las 8
-- migraciones anteriores antes de escribir este archivo, no asumido):
--
-- RLS habilitado (init_schema.sql, sin cambios posteriores):
--   profiles, categories, habits, habit_categories, habit_logs, goals.
-- RLS habilitado además en habit_schedules.sql (D-03).
-- Ninguna tabla usa FORCE ROW LEVEL SECURITY hoy; esta migración tampoco
-- la agrega (ninguna razón documentada la justifica).
--
-- Políticas EXACTAS actualmente vigentes (todas PERMISSIVE — ninguna
-- especifica RESTRICTIVE, y PERMISSIVE es el valor por defecto de
-- PostgreSQL cuando se omite):
--
--   profiles (init_schema.sql):
--     "Profiles are viewable by owner"   FOR SELECT USING (auth.uid() = id)
--     "Profiles are updatable by owner"  FOR UPDATE USING (auth.uid() = id)
--       (sin WITH CHECK explícito -> PostgreSQL reutiliza USING como WITH
--       CHECK para UPDATE cuando se omite, así que el efecto actual ya es
--       auth.uid() = id contra la fila NUEVA también — se hace explícito
--       en la política recreada, sin cambiar el comportamiento).
--     Sin política de INSERT ni de DELETE.
--
--   categories (init_schema.sql):
--     "Categories are manageable by owner"
--       FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
--
--   habits (init_schema.sql):
--     "Habits are manageable by owner"
--       FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
--
--   habit_categories (init_schema.sql) — propiedad INDIRECTA vía habits:
--     "Habit categories manageable by owner"
--       FOR ALL
--       USING (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()))
--       WITH CHECK (misma expresión)
--     Nota: la política original solo valida el hábito, no la categoría —
--     ver corrección en la sección de habit_categories más abajo.
--
--   habit_logs (init_schema.sql) — propiedad INDIRECTA vía habits:
--     "Habit logs manageable by owner"
--       FOR ALL
--       USING (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()))
--       WITH CHECK (misma expresión)
--
--   goals (init_schema.sql):
--     "Goals are manageable by owner"
--       FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
--
--   habit_schedules (20260731001044_habit_schedules.sql) — propiedad
--   INDIRECTA vía habits:
--     "Habit schedules are viewable by owner"
--       FOR SELECT
--       USING (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()))
--     Sin política de INSERT/UPDATE/DELETE — con RLS activo y sin política
--     para esas operaciones, PostgreSQL las deniega por defecto para
--     cualquier rol sujeto a RLS. Confirmado: NO existe ninguna política
--     de escritura accidental. Las únicas escrituras posibles pasan por
--     public.change_habit_schedule(...) (SECURITY DEFINER). Esta migración
--     NO toca habit_schedules en absoluto — ya cumple el modelo aprobado.
--
-- Dependencias por FK / propiedad directa vs indirecta:
--   profiles.id          -> auth.users(id)                [directa: profiles ES el usuario]
--   categories.user_id   -> auth.users(id)                [directa]
--   habits.user_id       -> auth.users(id)                [directa]
--   habit_categories.habit_id     -> habits.id            [indirecta: dueño = habits.user_id]
--   habit_categories.category_id -> categories.id         [indirecta: dueño = categories.user_id]
--   habit_logs.habit_id  -> habits.id                     [indirecta: dueño = habits.user_id]
--   habit_schedules.habit_id -> habits.id                 [indirecta: dueño = habits.user_id]
--   goals.user_id         -> auth.users(id)                [directa]
--   goals.habit_id (nullable) -> habits.id                [indirecta, solo si no es null]
--
-- Grafo de dependencias para políticas EXISTS (confirmado ACÍCLICO — sin
-- recursión posible entre políticas): habit_categories y habit_logs y
-- habit_schedules y goals.habit_id apuntan hacia habits (y
-- habit_categories también hacia categories); NINGUNA política de habits,
-- categories o profiles hace referencia de vuelta hacia esas tablas hijas.
-- No hay ciclos.
--
-- Triggers de integridad relacional existentes que se CONSERVAN sin
-- cambios (no se duplican):
--   validate_habit_category_ownership_trg  (BEFORE INSERT OR UPDATE ON
--     habit_categories, database_integrity.sql, H-01) — valida que
--     category_id pertenezca al mismo user_id que habit_id.
--   validate_goal_habit_ownership_trg      (BEFORE INSERT OR UPDATE ON
--     goals, database_integrity.sql, H-02) — valida que, si habit_id no es
--     null, su dueño coincida con goals.user_id.
--
-- Columnas de propiedad/inmutables inspeccionadas y su estado ANTES de
-- esta migración:
--   habits.user_id       -> SIN protección dedicada. RLS actual (FOR ALL
--     con WITH CHECK auth.uid()=user_id) YA impide que `authenticated`
--     reasigne user_id a un valor distinto de su propio auth.uid() (el
--     WITH CHECK fallaría), pero NO protege frente a service_role/postgres
--     (bypass de RLS) escribiendo un UPDATE directo. Se agrega trigger.
--   goals.user_id         -> mismo caso que habits.user_id. Además,
--     validate_goal_habit_ownership_trg SOLO valida coherencia cuando
--     habit_id no es null — una meta con habit_id NULL podría hoy cambiar
--     user_id sin que ese trigger lo detecte. Se agrega trigger.
--   categories.user_id    -> mismo caso que habits.user_id. Se agrega
--     trigger.
--   habit_logs.habit_id  -> SIN protección de inmutabilidad (el trigger de
--     ventana de 7 días, 20260731014259_habit_log_edit_window.sql, valida
--     que la fecha sea válida en ambos extremos de una reasignación, pero
--     NO prohíbe la reasignación en sí — esa misma migración reportó
--     explícitamente esto como candidato a prohibición futura). Se agrega
--     trigger que la prohíbe por completo, tal como recomienda el encargo.
--   habit_categories.habit_id/category_id -> sin protección de
--     inmutabilidad dedicada; en esta migración se resuelve NO permitiendo
--     UPDATE en absoluto para authenticated (ver sección habit_categories),
--     que es más simple y suficiente que un trigger de inmutabilidad.
--   categories.user_id/habits.user_id/goals.user_id ya cubiertos arriba.
--   profiles.id           -> YA protegido implícitamente: la política de
--     UPDATE (USING/WITH CHECK auth.uid() = id) hace que cualquier intento
--     de poner NEW.id a un valor distinto de auth.uid() falle el WITH
--     CHECK — no se agrega un trigger adicional para profiles.id: cambiar
--     una PK que es a la vez FK a auth.users(id) es una operación
--     administrativa de altísimo riesgo estructural (rompería la relación
--     1:1 con auth.users para dos usuarios a la vez), fuera del patrón de
--     "columna que un usuario normal podría cambiar por error" que motiva
--     los demás triggers de esta migración — se deja expresamente fuera
--     de alcance, reportado en riesgos.
--   created_at (categories/habits/habit_logs/goals) -> sin protección
--     dedicada hoy. No se agrega trigger: no existe ningún hallazgo (H-XX)
--     ni decisión (D-XX) en la auditoría que documente esto como un
--     problema a resolver — agregarlo sería una regla inventada sin
--     respaldo documental. Reportado como riesgo menor, no corregido aquí.
--   snapshots de habit_logs / progress_source / current_value -> YA
--     protegidos por protect_habit_log_goal_snapshot_trg,
--     protect_goal_progress_source_trg y protect_goal_current_value_trg
--     respectivamente (migraciones 4 y 5) — NO se duplican ni se tocan.
--
-- Confirmado: el SQL de este archivo solo agrega objetos nuevos (triggers,
-- funciones, políticas) y solo elimina las 7 políticas listadas arriba —
-- no modifica ninguna tabla, columna, función ni trigger de las 8
-- migraciones anteriores. Es seguro aplicarlo después de las migraciones 1
-- a 6 (evaluado en la numeración del encargo; en el repositorio real
-- corresponde a las 8 migraciones ya listadas arriba, dado que
-- habit_log_goal_snapshots y goal_progress_source y habit_log_edit_window
-- ya están aplicadas como correcciones independientes).
-- ----------------------------------------------------------------------------


-- ============================================================================
-- SECCIÓN 1 — PROTECCIÓN DE COLUMNAS DE PROPIEDAD INMUTABLES
-- ============================================================================
--
-- Cuatro triggers BEFORE UPDATE, uno por columna, cada uno con una única
-- responsabilidad (comparar OLD vs NEW de una sola columna y rechazar si
-- cambió). SECURITY INVOKER en los cuatro (sin "security definer"): cada
-- uno solo compara columnas de la propia fila que el UPDATE ya trae en
-- OLD/NEW, sin necesitar leer ninguna otra tabla — no hay razón para
-- privilegio elevado. search_path = '' en los cuatro. Sin SQL dinámico.
--
-- Motivo de existir a pesar de que RLS con WITH CHECK auth.uid()=user_id
-- YA impide que `authenticated` reasigne estas columnas a un valor
-- distinto del suyo propio (ver inventario arriba): estos triggers cubren
-- el caso que RLS estructuralmente NO puede cubrir — escrituras que
-- bypasean RLS (postgres/propietario de tabla, y service_role vía el
-- BYPASSRLS que Supabase concede por defecto a ese rol). Son una capa de
-- defensa en profundidad independiente de RLS, no un reemplazo de ella;
-- ambas capas se conservan.
-- ----------------------------------------------------------------------------

create or replace function public.protect_categories_user_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception
      'categories: user_id cannot be changed after creation (category %); ownership is immutable',
      old.id;
  end if;

  return new;
end;
$$;

revoke execute on function public.protect_categories_user_id() from public, anon, authenticated;

create or replace trigger protect_categories_user_id_trg
  before update on public.categories
  for each row execute function public.protect_categories_user_id();


create or replace function public.protect_habits_user_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception
      'habits: user_id cannot be changed after creation (habit %); ownership is immutable',
      old.id;
  end if;

  return new;
end;
$$;

revoke execute on function public.protect_habits_user_id() from public, anon, authenticated;

create or replace trigger protect_habits_user_id_trg
  before update on public.habits
  for each row execute function public.protect_habits_user_id();


create or replace function public.protect_goals_user_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception
      'goals: user_id cannot be changed after creation (goal %); ownership is immutable',
      old.id;
  end if;

  return new;
end;
$$;

revoke execute on function public.protect_goals_user_id() from public, anon, authenticated;

-- Orden respecto a los otros triggers BEFORE UPDATE ya existentes en goals
-- (set_goals_updated_at, validate_goal_habit_ownership_trg,
-- protect_goal_progress_source_trg, protect_goal_current_value_trg): cada
-- uno valida una columna distinta e independiente; el orden relativo entre
-- ellos no afecta la corrección — cualquiera que rechace primero aborta
-- toda la sentencia igual. No se fuerza un nombre especial por este
-- motivo.
create or replace trigger protect_goals_user_id_trg
  before update on public.goals
  for each row execute function public.protect_goals_user_id();


create or replace function public.protect_habit_logs_habit_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.habit_id is distinct from old.habit_id then
    raise exception
      'habit_logs: habit_id cannot be changed after creation (habit_log %); move the record via DELETE + INSERT within the edit window instead',
      old.id;
  end if;

  return new;
end;
$$;

revoke execute on function public.protect_habit_logs_habit_id() from public, anon, authenticated;

-- Nombre elegido para ordenar ANTES de enforce_habit_log_edit_window_trg
-- alfabéticamente ("protect_..." > "enforce_..." — 'p' > 'e' — así que
-- enforce_habit_log_edit_window_trg de hecho se ejecuta PRIMERO). Esto es
-- aceptable y deliberado: se prioriza mantener el prefijo "protect_"
-- consistente con el resto de triggers de inmutabilidad de esta misma
-- migración (protect_categories_user_id_trg, protect_habits_user_id_trg,
-- protect_goals_user_id_trg) por sobre una micro-optimización de orden —
-- cualquiera de los dos triggers que rechace primero aborta la sentencia
-- igual; no hay ninguna diferencia de corrección entre que se ejecute uno
-- u otro primero, solo cuál mensaje de error ve el cliente primero.
create or replace trigger protect_habit_logs_habit_id_trg
  before update on public.habit_logs
  for each row execute function public.protect_habit_logs_habit_id();


-- ============================================================================
-- SECCIÓN 2 — POLÍTICAS RLS: profiles
-- ============================================================================
--
-- Flujo real de creación de perfiles (inspeccionado antes de decidir):
-- public.handle_new_user() (init_schema.sql/harden_functions.sql) es
-- SECURITY DEFINER, disparada por el trigger on_auth_user_created AFTER
-- INSERT ON auth.users, y hace `insert into public.profiles (...)`. Al
-- ejecutar como el propietario de la función (dueño también de la tabla
-- profiles), esa inserción NO está sujeta a RLS (el propietario de una
-- tabla bypasea RLS por defecto salvo FORCE ROW LEVEL SECURITY, que
-- profiles no tiene). El cliente NUNCA necesita insertar su propio
-- perfil directamente — por eso NO se crea una política de INSERT aquí
-- ("no abras INSERT al cliente innecesariamente").
--
-- DELETE de perfil: no aprobado explícitamente en ningún documento del
-- proyecto (ni 01_PRODUCT_CONTEXT.md ni 07_ACCEPTANCE_CRITERIA.md
-- describen un flujo de "borrar mi cuenta" a nivel de tabla profiles). Un
-- eventual flujo de eliminación de cuenta operaría sobre auth.users (vía
-- API de administración), lo que ya haría CASCADE sobre profiles por la
-- FK existente — no sobre esta tabla directamente. No se crea política de
-- DELETE.
-- ----------------------------------------------------------------------------

drop policy if exists "Profiles are viewable by owner" on public.profiles;
drop policy if exists "Profiles are updatable by owner" on public.profiles;

create policy "Profiles are selectable by owner"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Profiles are updatable by owner"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- ============================================================================
-- SECCIÓN 3 — POLÍTICAS RLS: categories
-- ============================================================================
--
-- SELECT sin filtrar por lifecycle_status: el dueño puede leer TODAS sus
-- categorías (active y deleted) — la papelera (D-01) es una vista/consulta
-- del frontend sobre datos ya visibles, no una restricción de RLS. Ningún
-- usuario puede ver categorías de otro, en ningún estado.
--
-- Sin política DELETE (ver Sección "DELETE físico bloqueado" más abajo):
-- D-01 usa borrado lógico (lifecycle_status = 'deleted'), que es un
-- UPDATE normal, ya cubierto por la política de UPDATE de abajo.
-- ----------------------------------------------------------------------------

drop policy if exists "Categories are manageable by owner" on public.categories;

create policy "Categories are selectable by owner"
  on public.categories
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Categories are insertable by owner"
  on public.categories
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Categories are updatable by owner"
  on public.categories
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================================
-- SECCIÓN 4 — POLÍTICAS RLS: habits
-- ============================================================================
--
-- Sin política DELETE: el flujo aprobado (04_SCREEN_SPECIFICATIONS.md,
-- modal de tres opciones) usa lifecycle_status
-- (active/paused/archived/deleted) para el borrado lógico, y CASCADE
-- físico solo para la opción explícita "eliminar hábito y registros" —
-- esa opción de borrado físico no está expuesta hoy a `authenticated` vía
-- RLS (consistente con H-10, ya documentado en database_integrity.sql
-- como parte "abierta" pendiente de una RPC controlada, no de una política
-- DELETE genérica).
--
-- No se reintroduce ninguna columna de frecuencia retirada en D-03
-- (frequency_type/days_of_week/frequency_target/interval_days) — esta
-- migración no toca la estructura de la tabla en absoluto, solo RLS y un
-- trigger de inmutabilidad de user_id.
-- ----------------------------------------------------------------------------

drop policy if exists "Habits are manageable by owner" on public.habits;

create policy "Habits are selectable by owner"
  on public.habits
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Habits are insertable by owner"
  on public.habits
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Habits are updatable by owner"
  on public.habits
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================================
-- SECCIÓN 5 — POLÍTICAS RLS: habit_categories
-- ============================================================================
--
-- Propiedad indirecta DOBLE: tanto el hábito como la categoría deben
-- pertenecer al usuario. La política original (init_schema.sql) solo
-- validaba el hábito — funcionalmente equivalente hoy porque
-- validate_habit_category_ownership_trg (H-01) ya garantiza en cada
-- INSERT/UPDATE que habit_id y category_id comparten dueño, pero esta
-- migración hace la verificación explícita también en RLS (defensa en
-- profundidad independiente de ese trigger, tal como pide el encargo:
-- "SELECT: permitido solo si el hábito y la categoría pertenecen al
-- usuario").
--
-- UPDATE: sin política (bloqueado para `authenticated`). Preferencia
-- explícita del encargo: una relación se cambia mediante DELETE + INSERT,
-- no editando habit_id/category_id de una fila existente — más simple y
-- suficiente que un trigger de inmutabilidad dedicado, y evita tener que
-- razonar sobre qué combinación de cambios parciales sería válida.
--
-- DELETE: permitido sobre asociaciones propias (mismo doble EXISTS).
--
-- validate_habit_category_ownership_trg (H-01) se conserva sin cambios —
-- sigue disparándose en INSERT/UPDATE (UPDATE solo alcanzable hoy por
-- service_role/postgres, dado que RLS ya no lo permite a authenticated;
-- el trigger sigue siendo la protección real para ese camino
-- administrativo).
-- ----------------------------------------------------------------------------

drop policy if exists "Habit categories manageable by owner" on public.habit_categories;

create policy "Habit categories are selectable by owner"
  on public.habit_categories
  for select
  to authenticated
  using (
    exists (
      select 1 from public.habits h
      where h.id = habit_categories.habit_id and h.user_id = auth.uid()
    )
    and exists (
      select 1 from public.categories c
      where c.id = habit_categories.category_id and c.user_id = auth.uid()
    )
  );

create policy "Habit categories are insertable by owner"
  on public.habit_categories
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.habits h
      where h.id = habit_categories.habit_id and h.user_id = auth.uid()
    )
    and exists (
      select 1 from public.categories c
      where c.id = habit_categories.category_id and c.user_id = auth.uid()
    )
  );

create policy "Habit categories are deletable by owner"
  on public.habit_categories
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.habits h
      where h.id = habit_categories.habit_id and h.user_id = auth.uid()
    )
    and exists (
      select 1 from public.categories c
      where c.id = habit_categories.category_id and c.user_id = auth.uid()
    )
  );


-- ============================================================================
-- SECCIÓN 6 — habit_schedules: SIN CAMBIOS (confirmado correcto)
-- ============================================================================
--
-- "Habit schedules are viewable by owner" (FOR SELECT, D-03) se deja
-- exactamente como está. Confirmado que no existe ninguna política de
-- INSERT/UPDATE/DELETE — con RLS activo, eso deniega esas operaciones por
-- defecto a cualquier rol sujeto a RLS. Los únicos cambios de frecuencia
-- pasan por public.change_habit_schedule(...) (SECURITY DEFINER, GRANT a
-- authenticated, database_integrity/habit_schedules.sql) — no se modifica
-- esa función ni sus permisos en esta migración. No se detectó ningún
-- bloqueo real que justificara tocar esta tabla.
-- ----------------------------------------------------------------------------


-- ============================================================================
-- SECCIÓN 7 — POLÍTICAS RLS: habit_logs
-- ============================================================================
--
-- UPDATE: se corrige explícitamente el riesgo señalado por el encargo
-- ("no permitas que una política USING valide OLD pero WITH CHECK permita
-- NEW.habit_id ajeno"). USING se evalúa contra la fila ANTES del cambio
-- (¿puedo tocar esta fila? -> el hábito actual debe ser mío) y WITH CHECK
-- se evalúa contra la fila DESPUÉS del cambio (¿es aceptable el
-- resultado? -> el hábito resultante también debe ser mío) — ambos usan
-- la misma expresión EXISTS, pero cada uno la evalúa contra una versión
-- distinta de la fila (comportamiento estándar de PostgreSQL para
-- políticas UPDATE), así que un intento de reasignar habit_id a un hábito
-- ajeno falla en WITH CHECK sin importar que USING haya pasado.
--
-- En la práctica, protect_habit_logs_habit_id_trg (Sección 1) ya prohíbe
-- CUALQUIER cambio de habit_id — propio o ajeno — así que este caso queda
-- cerrado dos veces (RLS + trigger); se documenta la doble protección de
-- forma explícita porque el encargo la pide expresamente a nivel de RLS,
-- no solo a nivel de trigger.
--
-- INSERT/UPDATE dentro de la ventana de 7 días: no se duplica aquí — esa
-- garantía vive en enforce_habit_log_edit_window_trg
-- (20260731014259_habit_log_edit_window.sql), que sigue aplicándose sin
-- cambios, en conjunto con estas políticas RLS (dos capas independientes,
-- ninguna sustituye a la otra).
--
-- DELETE: permitido sobre logs propios; la restricción de que solo se
-- pueda eliminar DENTRO de la ventana de 7 días la sigue aplicando
-- exclusivamente el trigger de ventana (BEFORE DELETE), no esta política.
-- ----------------------------------------------------------------------------

drop policy if exists "Habit logs manageable by owner" on public.habit_logs;

create policy "Habit logs are selectable by owner"
  on public.habit_logs
  for select
  to authenticated
  using (
    exists (
      select 1 from public.habits h
      where h.id = habit_logs.habit_id and h.user_id = auth.uid()
    )
  );

create policy "Habit logs are insertable by owner"
  on public.habit_logs
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.habits h
      where h.id = habit_logs.habit_id and h.user_id = auth.uid()
    )
  );

create policy "Habit logs are updatable by owner"
  on public.habit_logs
  for update
  to authenticated
  using (
    exists (
      select 1 from public.habits h
      where h.id = habit_logs.habit_id and h.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.habits h
      where h.id = habit_logs.habit_id and h.user_id = auth.uid()
    )
  );

create policy "Habit logs are deletable by owner"
  on public.habit_logs
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.habits h
      where h.id = habit_logs.habit_id and h.user_id = auth.uid()
    )
  );


-- ============================================================================
-- SECCIÓN 8 — POLÍTICAS RLS: goals
-- ============================================================================
--
-- INSERT/UPDATE refuerzan en RLS (además de
-- validate_goal_habit_ownership_trg, H-02, que se conserva sin cambios) la
-- regla "si habit_id no es NULL, debe pertenecer al mismo usuario" — pedido
-- explícitamente por el encargo ("RLS debe reforzarlo cuando sea
-- razonable"). habit_id NULL (metas manuales/calculadas sin hábito
-- vinculado) no requiere esta comprobación adicional.
--
-- Sin política DELETE: D-02 usa goal_lifecycle_status = 'deleted' como
-- borrado lógico (entity_lifecycle.sql) — ya cubierto por la política de
-- UPDATE.
--
-- Protecciones ya implementadas en migraciones anteriores que esta
-- migración CONSERVA sin ningún cambio: progress_source inmutable
-- (protect_goal_progress_source_trg), current_value protegido según
-- progress_source (protect_goal_current_value_trg,
-- compute_goal_habit_logs_progress), validate_goal_habit_ownership_trg
-- (H-02), goal_lifecycle_status separado de status (D-02,
-- entity_lifecycle.sql — ninguna columna se toca aquí).
-- ----------------------------------------------------------------------------

drop policy if exists "Goals are manageable by owner" on public.goals;

create policy "Goals are selectable by owner"
  on public.goals
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Goals are insertable by owner"
  on public.goals
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (
      goals.habit_id is null
      or exists (
        select 1 from public.habits h
        where h.id = goals.habit_id and h.user_id = auth.uid()
      )
    )
  );

create policy "Goals are updatable by owner"
  on public.goals
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      goals.habit_id is null
      or exists (
        select 1 from public.habits h
        where h.id = goals.habit_id and h.user_id = auth.uid()
      )
    )
  );


-- ============================================================================
-- SECCIÓN 9 — DELETE FÍSICO: confirmación explícita
-- ============================================================================
--
-- Tablas SIN política DELETE tras esta migración (borrado lógico es el
-- flujo normal, ya cubierto por sus respectivas políticas de UPDATE):
--   categories -> lifecycle_status ('active'/'deleted', D-01)
--   habits     -> lifecycle_status ('active'/'paused'/'archived'/'deleted')
--   goals      -> goal_lifecycle_status ('active'/'paused'/'deleted', D-02)
--
-- Tablas operativas CON política DELETE (sin borrado lógico propio):
--   habit_categories -> eliminable directamente (una relación se retira
--     borrando la fila; no tiene lifecycle_status).
--   habit_logs        -> eliminable directamente, pero solo dentro de la
--     ventana de 7 días (enforce_habit_log_edit_window_trg, capa aparte
--     de RLS).
--   habit_schedules    -> sin política DELETE (ni de ninguna escritura
--     directa) — solo mediante change_habit_schedule(...), sin cambios.
--
-- Ausencia de FORCE ROW LEVEL SECURITY en las 3 tablas con DELETE
-- bloqueado (ni en ninguna otra): el propietario de la tabla (el rol que
-- aplica las migraciones) y cualquier superusuario siguen bypaseando RLS
-- por completo por diseño de PostgreSQL, sin necesidad de FORCE. Se asume
-- (comportamiento estándar y documentado de la plataforma Supabase, no
-- verificado en vivo en este contexto de solo lectura) que `service_role`
-- también bypasea RLS mediante el atributo BYPASSRLS que Supabase concede
-- por defecto a ese rol — de ser así, service_role conserva capacidad de
-- borrado físico administrativo sin ningún cambio adicional. Si en un
-- proyecto concreto `service_role` NO tuviera BYPASSRLS (configuración no
-- estándar), estas políticas también lo bloquearían a él, salvo que se
-- verifique y ajuste explícitamente — se reporta como supuesto declarado,
-- no confirmado en vivo.
-- ----------------------------------------------------------------------------


-- ============================================================================
-- SECCIÓN 10 — REVISIÓN DE FUNCIONES Y RPC (sin cambios, solo confirmación)
-- ============================================================================
--
-- public.change_habit_schedule(...) — confirmado: conserva su GRANT a
-- authenticated (habit_schedules.sql, corregido); no se le concede ni se
-- le revoca nada en esta migración; su lógica funcional no se toca.
--
-- Funciones internas de trigger (todas confirmadas SIN GRANT a
-- authenticated/anon en las migraciones donde se crearon, y esta
-- migración no les agrega ninguno):
--   set_updated_at, handle_new_user, rls_auto_enable (harden_functions.sql)
--   validate_habit_category_ownership, validate_goal_habit_ownership (database_integrity.sql)
--   days_of_week_is_valid (habit_schedules.sql — SÍ tiene GRANT a
--     authenticated y service_role, pero por una razón distinta y ya
--     documentada: es invocada por un CHECK constraint durante escrituras
--     normales de habit_schedules, no es "trigger-only" — se conserva sin
--     cambios)
--   set_habit_log_goal_snapshot, protect_habit_log_goal_snapshot (habit_log_goal_snapshots.sql)
--   compute_goal_habit_logs_progress, recalculate_goal_current_value,
--   sync_goal_progress_from_habit_log, protect_goal_current_value,
--   sync_goal_progress_from_goal_change, protect_goal_progress_source (goal_progress_source.sql)
--   get_habit_local_date, enforce_habit_log_edit_window (habit_log_edit_window.sql)
--   protect_categories_user_id, protect_habits_user_id, protect_goals_user_id,
--   protect_habit_logs_habit_id (esta migración — mismo criterio: revocadas
--     de public/anon/authenticated, sin GRANT a nadie)
--
-- Ninguna función queda con EXECUTE para `anon` en ningún punto del
-- proyecto (confirmado por inspección; esta migración tampoco lo agrega).
-- No se concede ningún EXECUTE nuevo a `authenticated` en esta migración:
-- las cuatro funciones nuevas son trigger-only.
-- ----------------------------------------------------------------------------


-- ============================================================================
-- SECCIÓN 11 — ÍNDICES: ninguno necesario
-- ============================================================================
--
-- Todas las condiciones EXISTS agregadas o recreadas en esta migración
-- filtran por columnas ya indexadas: habits.id (PK), categories.id (PK),
-- habit_categories.habit_id (columna líder de su PK compuesta
-- (habit_id, category_id)) y habit_categories.category_id
-- (habit_categories_category_id_idx, H-20, database_integrity.sql). Las
-- políticas de user_id directo (profiles/categories/habits/goals) ya
-- estaban cubiertas por sus índices de user_id existentes
-- (categories_user_id_idx, habits_user_id_idx, goals_user_id_idx,
-- init_schema.sql) o por su propia PK (profiles.id). No se detectó
-- ninguna condición EXISTS nueva sin soporte de índice — no se agrega
-- ningún índice en esta migración. La optimización general de
-- rendimiento corresponde, según el encargo, a una migración 8 separada.
-- ----------------------------------------------------------------------------


-- ============================================================================
-- SECCIÓN 12 — MATRIZ DE PRUEBAS DE DOS USUARIOS (plan verificable, NO
-- ejecutado en esta migración: no hay entorno local disponible en este
-- contexto de solo lectura/sin ejecución)
-- ============================================================================
--
-- Escenario: Usuario A y Usuario B, cada uno con su propio profile,
-- categorías, hábitos, habit_logs y goals creados independientemente.
-- Todas las pruebas se ejecutarían autenticados como A (rol
-- `authenticated`, auth.uid() = A), salvo el caso 13.
--
--  1. A hace SELECT sobre una fila (profiles/categories/habits/
--     habit_logs/goals) cuyo dueño es B -> 0 filas devueltas (USING
--     filtra la fila antes de que A pueda verla).
--  2. A intenta INSERT en categories/habits/goals con user_id = B ->
--     rechazado por WITH CHECK (auth.uid() = user_id, y auth.uid() = A).
--  3. A intenta UPDATE de una fila de B (por ejemplo, un habit de B) ->
--     0 filas afectadas (USING no la deja alcanzar; el UPDATE completa
--     sin error pero sin efecto, comportamiento estándar de RLS).
--  4. A intenta UPDATE de una fila PROPIA cambiando user_id a B ->
--     rechazado dos veces: WITH CHECK de la política (auth.uid() = NEW.
--     user_id, y B <> A) Y protect_<tabla>_user_id_trg (Sección 1),
--     independientemente de cuál se evalúe primero.
--  5. A intenta INSERT en habit_categories vinculando un habit propio con
--     una categoría de B -> rechazado por WITH CHECK (el segundo EXISTS,
--     sobre categories, falla) y también por
--     validate_habit_category_ownership_trg (H-01).
--  6. A intenta INSERT en habit_logs con habit_id de un hábito de B ->
--     rechazado por WITH CHECK de "Habit logs are insertable by owner"
--     (el EXISTS sobre habits falla para auth.uid() = A).
--  7. A intenta INSERT en goals con habit_id de un hábito de B -> rechazado
--     por WITH CHECK de "Goals are insertable by owner" (rama EXISTS) y
--     también por validate_goal_habit_ownership_trg (H-02).
--  8. A intenta INSERT/UPDATE/DELETE directo sobre habit_schedules (para
--     un hábito propio o de B, da igual) -> rechazado siempre: no existe
--     ninguna política para esas operaciones (Sección 6), denegado por
--     defecto.
--  9. A invoca public.change_habit_schedule(p_habit_id => <hábito propio>,
--     ...) -> permitido (GRANT a authenticated conservado); la función
--     valida internamente auth.uid() = habits.user_id.
-- 10. A intenta DELETE físico sobre una fila propia de categories/habits/
--     goals -> rechazado siempre: ninguna política DELETE existe para
--     esas tablas (Sección 9), denegado por defecto para `authenticated`,
--     sin importar de quién sea la fila.
-- 11. A hace UPDATE de una categoría/hábito/meta propia cambiando
--     únicamente lifecycle_status/goal_lifecycle_status (sin tocar
--     user_id/habit_id) -> permitido: pasa USING+WITH CHECK de la
--     política de UPDATE correspondiente y no dispara ningún trigger de
--     inmutabilidad (esas columnas no se tocan).
-- 12. A hace SELECT filtrando explícitamente
--     lifecycle_status='deleted'/'paused' sobre sus propias categorías/
--     hábitos/metas -> permitido: las políticas SELECT no filtran por
--     lifecycle_status/goal_lifecycle_status, solo por propiedad.
-- 13. Usando `service_role` (o el rol propietario, como durante una
--     migración): SELECT/INSERT/UPDATE/DELETE sobre cualquier fila de
--     cualquier tabla -> permitido sin restricción de RLS (bypass por
--     BYPASSRLS/ownership, ver Sección 9) — SALVO los cuatro triggers de
--     inmutabilidad de la Sección 1 y enforce_habit_log_edit_window_trg,
--     que sí se aplican a cualquier rol (los triggers no distinguen rol,
--     por diseño — ver Sección 1 y la migración de ventana de edición).
--     Esto es intencional: service_role conserva sus capacidades
--     administrativas NORMALES (lectura/escritura general, lifecycle,
--     etc.), pero no queda exento de las garantías de integridad
--     estructural (no reasignar propiedad, no violar la ventana temporal)
--     que se consideraron aplicables a cualquier escritor, según ya quedó
--     decidido en 20260731014259_habit_log_edit_window.sql.
-- ----------------------------------------------------------------------------


-- ============================================================================
-- EXCLUSIONES CONFIRMADAS
-- ============================================================================
-- No se implementan índices generales de rendimiento, limpieza final,
-- estadísticas, fórmulas nuevas, cambios en snapshots, cambios en
-- progress_source, cambios en la ventana temporal, nuevos lifecycle,
-- frontend, preferred_time, minimum_target, ideal_target, ni funciones
-- administrativas expuestas al cliente. No se modifica la semántica
-- funcional ya aprobada de ninguna RPC ni trigger existente.
-- ----------------------------------------------------------------------------


-- ============================================================================
-- RIESGOS Y AMBIGÜEDADES
-- ============================================================================
--
-- 1. profiles.id sin trigger de inmutabilidad dedicado (solo protegido
--    por RLS) — decisión deliberada, justificada en la Sección 2, no una
--    omisión.
-- 2. created_at (categories/habits/habit_logs/goals) sin protección de
--    inmutabilidad — no hay hallazgo ni decisión documental que lo exija;
--    se reporta como mejora futura razonable, no se inventa aquí.
-- 3. El bypass de RLS de `service_role` vía BYPASSRLS es un supuesto
--    declarado sobre el comportamiento estándar de Supabase, no verificado
--    en vivo contra este proyecto concreto en este contexto de solo
--    lectura — si la configuración real difiere, service_role quedaría
--    también sujeto a las nuevas políticas (fail-safe, no fail-open: el
--    peor caso de este supuesto siendo incorrecto es MÁS restricción, no
--    menos).
-- 4. habit_categories ya no permite UPDATE para `authenticated` bajo
--    ningún caso (antes sí, vía la política FOR ALL original) — cambio de
--    comportamiento deliberado y explícitamente pedido por el encargo; si
--    algún flujo no documentado dependiera de un UPDATE directo sobre esa
--    tabla, quedaría bloqueado (no se encontró evidencia de que exista tal
--    flujo en los documentos de producto).
-- 5. Los cuatro triggers de inmutabilidad de la Sección 1 aplican también
--    a `service_role`/propietario (a diferencia de RLS, que ese rol
--    bypasea) — es la garantía "defensa en profundidad" buscada
--    deliberadamente, pero implica que ni siquiera una corrección
--    administrativa vía service_role podría reasignar estas columnas sin
--    antes deshabilitar el trigger manualmente (mismo patrón de escape ya
--    documentado en 20260731014259_habit_log_edit_window.sql para la
--    ventana de edición).
-- ----------------------------------------------------------------------------
