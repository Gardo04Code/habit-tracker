-- ============================================================================
-- Migración: habit_log_goal_snapshots
-- Origen: MDs/09_DATABASE_AUDIT.md (H-24, sección 12) + MDs/10_DATABASE_DECISIONS.md
-- (D-04 — "Se utilizarán snapshots en habit_logs generados por el servidor",
-- Decisiones aprobadas)
--
-- Alcance: implementa D-04 (alternativa A del documento de decisiones).
-- Agrega a habit_logs un snapshot de la configuración de meta vigente del
-- hábito (goal_type, target_value, target_unit, deadline_time) en el
-- momento de crear cada registro, generado exclusivamente del lado del
-- servidor. No implementa minimum_target_snapshot / ideal_target_snapshot
-- (D-07 los pospuso), habit_goal_versions (alternativa B, fase posterior),
-- progress_source, current_value, ventana de edición de 7 días, ni ningún
-- cambio de RLS, frontend, habit_schedules, categories o goals lifecycle.
--
-- No modifica init_schema, harden_functions, database_integrity,
-- entity_lifecycle ni habit_schedules.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Validaciones previas (confirmadas por inspección directa antes de escribir
-- este archivo, no asumidas):
--
-- 1. Enum goal_type (init_schema.sql): 'boolean', 'quantity', 'duration',
--    'repetitions', 'deadline', 'accumulated_days'. Sin cambios en las
--    migraciones posteriores.
-- 2. Tipos exactos en public.habits (init_schema.sql), sin alterar por
--    entity_lifecycle ni habit_schedules (esa migración solo tocó las
--    columnas de frecuencia, no las de meta): target_value numeric,
--    target_unit text, deadline_time time, goal_type goal_type not null.
-- 3. Constraint de coherencia vigente en habits (database_integrity.sql):
--    habits_goal_type_coherence_chk —
--      boolean       -> target_value is null
--      deadline      -> deadline_time is not null
--      quantity/duration/repetitions/accumulated_days -> target_value is not null
--      (sin restricción sobre target_unit; sin exigir deadline_time null
--      para 'boolean'; sin exigir target_value null para 'deadline'). Este
--      archivo reutiliza exactamente esa misma lógica para los snapshots —
--      ver nota extendida más abajo, junto a la constraint de coherencia.
-- 4. Política RLS vigente de habit_logs (init_schema.sql): "Habit logs
--    manageable by owner", FOR ALL, USING/WITH CHECK vía EXISTS sobre
--    habits.user_id = auth.uid(). Esta política NO distingue columnas: un
--    cliente autenticado dueño del hábito puede hoy escribir directamente
--    cualquier columna de habit_logs, incluidas las nuevas de snapshot, en
--    INSERT y UPDATE. Ver hallazgo reportado al final de este archivo.
-- 5. No existe ninguna función server-side reutilizable para este
--    propósito. validate_habit_category_ownership()/validate_goal_habit_ownership()
--    (database_integrity.sql) son el precedente de patrón (trigger BEFORE,
--    SECURITY INVOKER, search_path vacío, EXECUTE revocado de
--    public/anon/authenticated) que se reutiliza aquí, pero no son
--    reutilizables directamente: resuelven un problema distinto.
-- 6. Este archivo solo depende de objetos creados en init_schema.sql
--    (tabla habit_logs, columnas de meta de habits) y de database_integrity.sql
--    (no depende de nada específico de ese archivo, pero se aplica después
--    por orden cronológico). No depende de entity_lifecycle.sql ni de
--    habit_schedules.sql — ninguna de las dos migraciones tocó las columnas
--    de meta ni la tabla habit_logs. Es seguro aplicar este archivo después
--    de las 4 migraciones anteriores, en cualquier posición relativa a
--    entity_lifecycle/habit_schedules.
-- 7. Ninguna de las cuatro columnas de snapshot existe hoy en habit_logs
--    (confirmado por inspección de init_schema.sql y de las cuatro
--    migraciones de corrección posteriores: ninguna agrega columnas a
--    habit_logs).
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- Columnas de snapshot en public.habit_logs.
--
-- Tipos idénticos a los de las columnas origen en habits (punto 2 arriba).
-- Todas nullable en esta sentencia: se vuelven necesarias más abajo, tras
-- el backfill y su validación, solo para goal_type_snapshot (ver nota en
-- esa sección). target_value_snapshot/target_unit_snapshot/
-- deadline_time_snapshot permanecen nullable de forma permanente, igual
-- que sus columnas origen en habits, porque su presencia depende
-- condicionalmente de goal_type_snapshot (misma relación que en habits).
-- ----------------------------------------------------------------------------
alter table public.habit_logs
  add column if not exists goal_type_snapshot public.goal_type,
  add column if not exists target_value_snapshot numeric,
  add column if not exists target_unit_snapshot text,
  add column if not exists deadline_time_snapshot time;


-- ----------------------------------------------------------------------------
-- Función trigger: public.set_habit_log_goal_snapshot()
--
-- Se ejecuta BEFORE INSERT en habit_logs. Copia desde public.habits la
-- configuración de meta vigente del hábito propietario (NEW.habit_id) y la
-- asigna a las cuatro columnas de snapshot, sobrescribiendo
-- incondicionalmente cualquier valor que el cliente haya enviado para esas
-- columnas (punto 4 del encargo) — el cliente no tiene forma de decidir su
-- propio snapshot.
--
-- SECURITY INVOKER (por defecto, sin "security definer"), igual que
-- validate_habit_category_ownership/validate_goal_habit_ownership: la
-- consulta a public.habits queda sujeta a la política RLS existente de esa
-- tabla ("Habits are manageable by owner", auth.uid() = user_id). Efecto
-- deseado: si NEW.habit_id no pertenece al usuario autenticado que ejecuta
-- el INSERT, RLS filtra la fila y v_habit.id queda NULL — la función la
-- trata igual que un hábito inexistente. No se necesita una validación de
-- propiedad redundante en esta función: RLS ya la provee como efecto
-- colateral del propio SELECT, con el mismo principio de mínimo privilegio
-- documentado en H-01/H-02.
--
-- search_path fijo a '' (vacío): toda referencia está completamente
-- calificada por esquema (public.habits). No se usa SQL dinámico.
-- ----------------------------------------------------------------------------
create or replace function public.set_habit_log_goal_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_habit public.habits%rowtype;
begin
  select * into v_habit from public.habits where id = new.habit_id;

  if v_habit.id is null then
    raise exception 'habit_logs: habit % not found', new.habit_id;
  end if;

  new.goal_type_snapshot := v_habit.goal_type;
  new.target_value_snapshot := v_habit.target_value;
  new.target_unit_snapshot := v_habit.target_unit;
  new.deadline_time_snapshot := v_habit.deadline_time;

  return new;
end;
$$;

-- Esta función solo debe invocarse vía trigger, nunca como RPC directa
-- (mismo criterio que H-01/H-02 en database_integrity.sql). El trigger se
-- ejecuta con independencia de este GRANT/REVOKE: la ejecución de una
-- función de trigger no requiere que el rol que dispara el INSERT tenga
-- privilegio EXECUTE explícito sobre ella.
revoke execute on function public.set_habit_log_goal_snapshot() from public, anon, authenticated;

create or replace trigger set_habit_log_goal_snapshot_trg
  before insert on public.habit_logs
  for each row execute function public.set_habit_log_goal_snapshot();


-- ----------------------------------------------------------------------------
-- Función trigger: public.protect_habit_log_goal_snapshot()
--
-- Se ejecuta BEFORE UPDATE en habit_logs. Los snapshots son historia
-- congelada al momento de creación: no se recalculan nunca, ni siquiera si
-- la meta vigente del hábito cambió después. Preferencia indicada por el
-- encargo: rechazar con un error claro (en vez de restaurar OLD
-- silenciosamente), para poder detectar intentos indebidos del cliente en
-- vez de ocultarlos.
--
-- IS DISTINCT FROM: comparación segura frente a NULL (dos columnas NULL no
-- deben considerarse "distintas" y disparar un rechazo falso).
--
-- No depende de ninguna tabla externa ni de auth.uid(): compara
-- exclusivamente OLD/NEW de la propia fila, por lo que no hereda ninguna
-- dependencia de RLS de otra tabla.
--
-- La función se define aquí, pero el trigger que la activa (
-- protect_habit_log_goal_snapshot_trg) se crea más abajo, DESPUÉS del
-- backfill y de sus validaciones — no en este punto del archivo. Orden
-- corregido: si el trigger existiera ya en este punto, el propio UPDATE
-- del backfill (que lleva las columnas snapshot de NULL a sus valores
-- históricos aproximados) sería rechazado por esta misma función, porque
-- para el backfill goal_type_snapshot cambia de NULL a un valor concreto —
-- exactamente el cambio que esta función existe para impedir una vez que
-- la protección está activa. Definir la función sin el trigger todavía no
-- protege nada: hasta que el trigger se cree, ningún UPDATE está sujeto a
-- esta lógica.
-- ----------------------------------------------------------------------------
create or replace function public.protect_habit_log_goal_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.goal_type_snapshot is distinct from old.goal_type_snapshot
     or new.target_value_snapshot is distinct from old.target_value_snapshot
     or new.target_unit_snapshot is distinct from old.target_unit_snapshot
     or new.deadline_time_snapshot is distinct from old.deadline_time_snapshot
  then
    raise exception
      'habit_logs: goal snapshot columns are read-only after creation and cannot be modified (habit_log %)',
      old.id;
  end if;

  return new;
end;
$$;

revoke execute on function public.protect_habit_log_goal_snapshot() from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- Backfill para filas de habit_logs preexistentes.
--
-- Se ejecuta antes de crear protect_habit_log_goal_snapshot_trg (ver nota
-- de orden junto a la función, arriba): en este punto del archivo todavía
-- no existe ningún trigger BEFORE UPDATE que restrinja estas columnas, por
-- lo que el UPDATE de abajo puede llevarlas de NULL a sus valores
-- históricos aproximados sin ser rechazado.
--
-- Condición WHERE goal_type_snapshot is null: hace el backfill idempotente
-- (seguro de repetir sin sobrescribir snapshots ya generados, ya sea por
-- una ejecución previa de este mismo backfill o por el trigger BEFORE
-- INSERT en filas creadas después de que las columnas ya existieran) y
-- cubre exactamente el requisito de "no sobrescribir snapshots ya
-- existentes". No se asume que habit_logs esté vacía.
--
-- Determinismo: para cada fila, copia la configuración ACTUAL (al momento
-- de ejecutar esta migración) del hábito propietario — es la única fuente
-- disponible para reconstruir un snapshot retroactivo.
--
-- Limitación histórica explícita (requerida por el encargo): este backfill
-- es una aproximación para registros preexistentes a esta migración. Si la
-- meta de un hábito fue editada en algún momento entre la creación de un
-- habit_log antiguo y la ejecución de esta migración, el snapshot
-- backfilleado reflejará la configuración MÁS RECIENTE, no la que estaba
-- vigente el día real del registro — no existe ninguna fuente en el
-- esquema actual (sin habit_goal_versions) que permita reconstruir esa
-- meta pasada distinta si ya fue sobrescrita antes de esta migración. Los
-- registros creados después de esta migración no tienen esta limitación:
-- su snapshot lo genera el trigger BEFORE INSERT en el momento exacto de
-- creación.
-- ----------------------------------------------------------------------------
update public.habit_logs hl
set
  goal_type_snapshot = h.goal_type,
  target_value_snapshot = h.target_value,
  target_unit_snapshot = h.target_unit,
  deadline_time_snapshot = h.deadline_time
from public.habits h
where hl.habit_id = h.id
  and hl.goal_type_snapshot is null;


-- ----------------------------------------------------------------------------
-- Verificación posterior al backfill.
--
-- goal_type_snapshot es el indicador de "fila incompleta": habits.goal_type
-- es NOT NULL y habit_logs.habit_id es NOT NULL con FK a habits, por lo que
-- toda fila de habit_logs, sin excepción, tiene un hábito propietario con
-- goal_type resoluble. Si quedara alguna fila con goal_type_snapshot NULL
-- después del UPDATE de arriba, sería un estado inesperado (no un caso
-- válido permitido) — la migración se detiene aquí con una excepción
-- explícita, sin dejar la tabla en un estado silenciosamente inconsistente.
-- ----------------------------------------------------------------------------
do $$
declare
  v_missing_count int;
begin
  select count(*) into v_missing_count
  from public.habit_logs
  where goal_type_snapshot is null;

  if v_missing_count > 0 then
    raise exception
      'habit_log_goal_snapshots: % habit_log row(s) left without goal_type_snapshot after backfill.',
      v_missing_count;
  end if;
end $$;

-- goal_type_snapshot pasa a NOT NULL: el backfill + la verificación de
-- arriba garantizan que toda fila existente ya lo tiene, y el trigger
-- BEFORE INSERT garantiza que toda fila futura también lo tendrá (o el
-- INSERT falla antes de llegar a esta constraint, si el hábito no existe).
-- target_value_snapshot/target_unit_snapshot/deadline_time_snapshot
-- permanecen nullable de forma permanente (ver nota en la sección de
-- columnas, arriba).
alter table public.habit_logs
  alter column goal_type_snapshot set not null;


-- ----------------------------------------------------------------------------
-- Constraints de coherencia sobre los snapshots.
-- ----------------------------------------------------------------------------

-- Réplica exacta de la lógica de habits_goal_type_coherence_chk
-- (database_integrity.sql, H-12), aplicada a las columnas de snapshot en
-- vez de a las columnas vigentes de habits. Deliberadamente NO se agregan
-- las restricciones adicionales sugeridas como "ejemplos conceptuales" en
-- el encargo (deadline_time_snapshot NULL para 'boolean'; target_value_snapshot
-- NULL para 'deadline'): habits_goal_type_coherence_chk no exige ninguna de
-- las dos hoy, por lo que un hábito válido bajo esa constraint podría tener,
-- por ejemplo, deadline_time no nulo junto con goal_type = 'boolean' (nunca
-- validado en contra). Agregar esa restricción extra al snapshot rechazaría
-- backfillear datos que la propia tabla habits ya permite y ya podría
-- contener — exactamente lo que el encargo pide evitar ("no agregues
-- restricciones que impidan registros válidos existentes sin
-- justificarlo"). Se documenta aquí como decisión deliberada, no como
-- omisión.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'habit_logs_goal_snapshot_coherence_chk'
      and conrelid = 'public.habit_logs'::regclass
  ) then
    alter table public.habit_logs
      add constraint habit_logs_goal_snapshot_coherence_chk
      check (
        case goal_type_snapshot
          when 'boolean' then target_value_snapshot is null
          when 'deadline' then deadline_time_snapshot is not null
          when 'quantity' then target_value_snapshot is not null
          when 'duration' then target_value_snapshot is not null
          when 'repetitions' then target_value_snapshot is not null
          when 'accumulated_days' then target_value_snapshot is not null
          else true
        end
      );
  end if;
end $$;

-- Réplica exacta de habits_target_value_positive_chk (H-08): si
-- target_value_snapshot está presente, debe ser positivo. Mismo criterio
-- ya aprobado para la columna origen.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'habit_logs_target_value_snapshot_positive_chk'
      and conrelid = 'public.habit_logs'::regclass
  ) then
    alter table public.habit_logs
      add constraint habit_logs_target_value_snapshot_positive_chk
      check (target_value_snapshot is null or target_value_snapshot > 0);
  end if;
end $$;

-- target_unit_snapshot: sin constraint de coherencia contra
-- goal_type_snapshot. Justificación (no es una omisión): la propia
-- auditoría documenta target_unit en habits como "texto libre, sin
-- coherencia validada contra goal_type (H-12)" — no existe ninguna regla
-- aprobada en habits que replicar aquí. Inventar una excedería el mandato
-- de "no inventes valores ni reglas que no estén respaldadas por la
-- auditoría o el esquema actual".


-- ----------------------------------------------------------------------------
-- Activación de la protección de UPDATE: se crea aquí, no junto a la
-- definición de la función (arriba).
--
-- Orden corregido en esta revisión: el trigger debe crearse DESPUÉS de
-- (a) ejecutar el backfill, (b) validar que no quedaron filas con
-- goal_type_snapshot NULL, (c) fijar goal_type_snapshot NOT NULL, y
-- (d) crear las dos constraints de coherencia/valor positivo — todos
-- pasos ya completados en este punto del archivo. Antes de esta línea,
-- ningún UPDATE sobre habit_logs está restringido en cuanto a las columnas
-- snapshot; a partir de esta línea, protect_habit_log_goal_snapshot()
-- rechaza cualquier intento de modificarlas. El backfill de más arriba
-- pudo llevarlas de NULL a sus valores históricos aproximados precisamente
-- porque se ejecutó antes de que este trigger existiera.
-- ----------------------------------------------------------------------------
create or replace trigger protect_habit_log_goal_snapshot_trg
  before update on public.habit_logs
  for each row execute function public.protect_habit_log_goal_snapshot();


-- ----------------------------------------------------------------------------
-- Índices: ninguno agregado.
--
-- El encargo pide no agregar índices sobre columnas snapshot salvo que
-- exista una consulta real que los necesite. Estas columnas se leerán junto
-- con habit_id/date, ya cubiertos por la UNIQUE (habit_id, date) y los
-- índices habit_logs_habit_id_idx / habit_logs_date_idx, todos de
-- init_schema.sql — ningún índice nuevo sería más que una duplicación
-- especulativa sin una consulta real que lo justifique hoy.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- updated_at: sin cambios de semántica. Esta migración no toca el trigger
-- set_habit_logs_updated_at (init_schema.sql) ni agrega uno nuevo. El
-- trigger BEFORE INSERT de esta migración no escribe created_at/updated_at
-- en ningún punto; el BEFORE UPDATE de protección tampoco — su único efecto
-- posible es RAISE EXCEPTION, nunca una asignación de columna.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- Hallazgo de RLS a reportar (sin modificar RLS en esta migración, por
-- alcance explícito del encargo).
--
-- La política "Habit logs manageable by owner" (FOR ALL) permite hoy que un
-- cliente autenticado, dueño del hábito, envíe directamente cualquier valor
-- en goal_type_snapshot/target_value_snapshot/target_unit_snapshot/
-- deadline_time_snapshot dentro de un INSERT o UPDATE — RLS no distingue
-- columnas. La protección real contra eso queda exclusivamente en los dos
-- triggers de esta migración (sobrescritura incondicional en INSERT,
-- rechazo explícito en UPDATE), no en RLS. Se deja documentado para la
-- futura migración de RLS hardening (junto con H-05, H-10, H-17, H-18,
-- H-19 y D-06): si en ese momento se reemplaza la política FOR ALL por
-- políticas separadas de INSERT/UPDATE, esas políticas nuevas podrían
-- reforzar esta misma restricción a nivel de RLS (por ejemplo, exigiendo
-- que las columnas de snapshot lleguen NULL en el INSERT del cliente) sin
-- que eso sea indispensable ahora mismo, porque los triggers ya bastan.
-- ----------------------------------------------------------------------------
