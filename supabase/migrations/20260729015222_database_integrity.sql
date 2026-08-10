-- ============================================================================
-- Migración: database_integrity
-- Origen: MDs/09_DATABASE_AUDIT.md (Revisión 4) + MDs/10_DATABASE_DECISIONS.md
--
-- Alcance: refuerza la integridad estructural del esquema ya existente
-- (init_schema, harden_functions). No crea tablas nuevas, no cambia RLS,
-- no implementa ninguna decisión funcional pendiente (D-01 a D-07).
-- Todas las restricciones son idempotentes: pueden volver a ejecutarse sin
-- fallar si ya fueron aplicadas.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Función auxiliar — validación de days_of_week
-- Hallazgo: H-13
-- Tabla afectada: public.habits
-- Propósito: encapsular en una función la validación de que cada elemento de
-- days_of_week esté en el rango 0-6 y no haya duplicados. Se usa como función
-- (no como subconsulta inline) porque PostgreSQL no permite subconsultas
-- dentro de una expresión CHECK.
-- ----------------------------------------------------------------------------
create or replace function public.habits_days_of_week_is_valid(days smallint[])
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_in_range boolean;
  v_total_count int;
  v_distinct_count int;
begin
  if days is null then
    return true;
  end if;

  select bool_and(d between 0 and 6) into v_in_range from unnest(days) as d;
  select count(*) into v_total_count from unnest(days) as d;
  select count(distinct d) into v_distinct_count from unnest(days) as d;

  return coalesce(v_in_range, true) and v_distinct_count = v_total_count;
end;
$$;

-- Privilegios explícitos (en vez de dejar el GRANT EXECUTE por defecto a
-- PUBLIC que Postgres concede automáticamente al crear una función):
--   - se revoca de PUBLIC (lo que también retira el acceso implícito de
--     `anon`, que no tiene ningún otro grant propio sobre esta función y por
--     lo tanto no puede invocarla directamente como RPC);
--   - se concede explícitamente a `authenticated`, que sí lo necesita: el
--     CHECK que usa esta función se evalúa con los privilegios del rol que
--     ejecuta el INSERT/UPDATE normal de un hábito, y sin este grant esas
--     operaciones fallarían por falta de permiso;
--   - se concede explícitamente a `service_role` para no bloquear flujos
--     administrativos server-side;
--   - el propietario de la función (el rol que ejecuta la migración)
--     conserva acceso de forma implícita: en PostgreSQL el dueño de un
--     objeto siempre puede operar sobre él, independientemente de los
--     GRANT/REVOKE aplicados a otros roles.
revoke execute on function public.habits_days_of_week_is_valid(smallint[]) from public;
grant execute on function public.habits_days_of_week_is_valid(smallint[]) to authenticated;
grant execute on function public.habits_days_of_week_is_valid(smallint[]) to service_role;


-- ----------------------------------------------------------------------------
-- Tabla: public.habits
-- ----------------------------------------------------------------------------

-- H-07 — habits.name: nombre obligatorio, sin espacios en blanco vacíos,
-- máximo 150 caracteres (regla de negocio #2 en 01_PRODUCT_CONTEXT.md).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'habits_name_length_chk'
      and conrelid = 'public.habits'::regclass
  ) then
    alter table public.habits
      add constraint habits_name_length_chk
      check (char_length(btrim(name)) between 1 and 150);
  end if;
end $$;

-- H-08 — habits.target_value: si está presente, debe ser positivo.
-- Nullable porque goal_type = 'boolean' no requiere valor objetivo (H-12).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'habits_target_value_positive_chk'
      and conrelid = 'public.habits'::regclass
  ) then
    alter table public.habits
      add constraint habits_target_value_positive_chk
      check (target_value is null or target_value > 0);
  end if;
end $$;

-- H-09 — habits.end_date no puede ser anterior a start_date. end_date es
-- nullable (hábito sin fecha de fin definida), por eso se permite null.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'habits_end_date_after_start_chk'
      and conrelid = 'public.habits'::regclass
  ) then
    alter table public.habits
      add constraint habits_end_date_after_start_chk
      check (end_date is null or end_date >= start_date);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- H-10 — nota de corrección de esta revisión del archivo.
--
-- H-10 (MDs/09_DATABASE_AUDIT.md, sección 14) NO trata sobre habit_logs.note
-- ni sobre ningún límite de longitud de texto. Es sobre `goals.habit_id
-- ON DELETE CASCADE` y su reclasificación:
--
--   - La parte "resuelta documentalmente" del hallazgo es que el CASCADE es
--     el mecanismo correcto para la opción "eliminar hábito y todos sus
--     registros" del modal de tres opciones — ya está bien tal como quedó
--     definido en init_schema. No requiere ningún cambio de esquema.
--
--   - La parte "abierta" del hallazgo es que la política RLS `ALL` de
--     `habits` permite hoy un DELETE físico directo sin pasar por una RPC
--     controlada (`permanently_delete_habit`, según la recomendación de la
--     auditoría). Cerrar esa parte requiere modificar esa política RLS —
--     algo explícitamente fuera de alcance en esta migración de integridad
--     (ver exclusiones). Se deja pendiente para una migración dedicada a
--     RLS, junto con H-05, H-17, H-18 y H-19.
--
-- No se agrega ninguna constraint para H-10 en este archivo.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- Nota sobre las restricciones de frecuencia de `habits` que siguen abajo
-- (habits_frequency_target_positive_chk, habits_interval_days_positive_chk,
-- habits_days_of_week_valid_chk, habits_frequency_coherence_chk):
--
-- Se conservan de forma temporal. Protegen el esquema actual mientras la
-- frecuencia siga viviendo como columnas directas de `habits` (estado
-- intermedio). Cuando D-03 (MDs/10_DATABASE_DECISIONS.md) se implemente y
-- `habit_schedules` pase a ser la fuente de verdad única de la frecuencia,
-- estas reglas deberán trasladarse a esa tabla, y estas cuatro constraints
-- serán retiradas o reemplazadas junto con las columnas de frecuencia de
-- `habits` que dejen de tener significado propio.
-- ----------------------------------------------------------------------------

-- H-14 — frequency_target e interval_days deben ser positivos cuando existen.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'habits_frequency_target_positive_chk'
      and conrelid = 'public.habits'::regclass
  ) then
    alter table public.habits
      add constraint habits_frequency_target_positive_chk
      check (frequency_target is null or frequency_target > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'habits_interval_days_positive_chk'
      and conrelid = 'public.habits'::regclass
  ) then
    alter table public.habits
      add constraint habits_interval_days_positive_chk
      check (interval_days is null or interval_days > 0);
  end if;
end $$;

-- H-13 — cada elemento de days_of_week debe estar entre 0 y 6, sin
-- duplicados. Usa la función auxiliar definida arriba (ver justificación).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'habits_days_of_week_valid_chk'
      and conrelid = 'public.habits'::regclass
  ) then
    alter table public.habits
      add constraint habits_days_of_week_valid_chk
      check (public.habits_days_of_week_is_valid(days_of_week));
  end if;
end $$;

-- H-11 — coherencia condicional entre frequency_type y sus columnas
-- dependientes: cada tipo de frecuencia exige que exista el campo del que
-- depende (p. ej. specific_days requiere days_of_week no vacío). No se
-- exige que los demás campos queden en null: solo se exige la presencia del
-- campo requerido por ese tipo, tal como lo describe H-11 en la auditoría.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'habits_frequency_coherence_chk'
      and conrelid = 'public.habits'::regclass
  ) then
    alter table public.habits
      add constraint habits_frequency_coherence_chk
      check (
        case frequency_type
          when 'specific_days' then days_of_week is not null and array_length(days_of_week, 1) > 0
          when 'times_per_week' then frequency_target is not null
          when 'times_per_month' then frequency_target is not null
          when 'custom_interval' then interval_days is not null
          else true
        end
      );
  end if;
end $$;

-- H-12 — coherencia condicional entre goal_type y sus columnas dependientes:
-- 'deadline' exige deadline_time; los tipos numéricos (quantity, duration,
-- repetitions, accumulated_days) exigen target_value; 'boolean' no debe
-- llevar target_value (ejemplo explícito documentado en H-12).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'habits_goal_type_coherence_chk'
      and conrelid = 'public.habits'::regclass
  ) then
    alter table public.habits
      add constraint habits_goal_type_coherence_chk
      check (
        case goal_type
          when 'boolean' then target_value is null
          when 'deadline' then deadline_time is not null
          when 'quantity' then target_value is not null
          when 'duration' then target_value is not null
          when 'repetitions' then target_value is not null
          when 'accumulated_days' then target_value is not null
          else true
        end
      );
  end if;
end $$;

-- H-06 — unicidad normalizada de nombre por usuario entre hábitos activos:
-- "Tomar agua", "tomar agua" y " Tomar agua " colisionan como el mismo
-- nombre. Índice único parcial: los hábitos en papelera (lifecycle_status =
-- 'deleted') no ocupan el nombre, permitiendo reutilizarlo.
create unique index if not exists habits_active_name_normalized_idx
  on public.habits (user_id, lower(btrim(name)))
  where lifecycle_status <> 'deleted';


-- ----------------------------------------------------------------------------
-- Tabla: public.categories
-- ----------------------------------------------------------------------------

-- H-07 — categories.name: no vacío. No se aplica un máximo de 150 caracteres
-- aquí porque esa cota (regla de negocio #2) está documentada específicamente
-- para nombres de hábito, no de categoría.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'categories_name_not_empty_chk'
      and conrelid = 'public.categories'::regclass
  ) then
    alter table public.categories
      add constraint categories_name_not_empty_chk
      check (char_length(btrim(name)) >= 1);
  end if;
end $$;

-- H-06 — unicidad normalizada de nombre por usuario. Sin cláusula WHERE:
-- categories no tiene todavía columna de estado (borrado lógico pospuesto,
-- decisión D-01 en MDs/10_DATABASE_DECISIONS.md). Esta migración NO
-- implementa D-01; cuando se agregue el estado active/deleted de categories,
-- este índice deberá reemplazarse por una versión con WHERE, tal como ya
-- queda anticipado en la sección 13 de la auditoría.
create unique index if not exists categories_active_name_normalized_idx
  on public.categories (user_id, lower(btrim(name)));


-- ----------------------------------------------------------------------------
-- Tabla: public.habit_logs
-- ----------------------------------------------------------------------------

-- H-15 — habit_logs.value no puede ser negativo. No tiene tope superior a
-- propósito: la regla de negocio permite superar la meta (value > target).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'habit_logs_value_non_negative_chk'
      and conrelid = 'public.habit_logs'::regclass
  ) then
    alter table public.habit_logs
      add constraint habit_logs_value_non_negative_chk
      check (value is null or value >= 0);
  end if;
end $$;

-- Nota: "una sola fila diaria por habit_id y date" ya está garantizado por
-- la restricción UNIQUE (habit_id, date) definida en init_schema. No se
-- duplica aquí ningún índice ni constraint equivalente.


-- ----------------------------------------------------------------------------
-- Tabla: public.goals
-- ----------------------------------------------------------------------------

-- H-08 — goals.target_value debe ser positivo. Ya es NOT NULL en el esquema
-- base, por lo que el CHECK no necesita contemplar el caso null.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'goals_target_value_positive_chk'
      and conrelid = 'public.goals'::regclass
  ) then
    alter table public.goals
      add constraint goals_target_value_positive_chk
      check (target_value > 0);
  end if;
end $$;

-- H-09 — goals.end_date no puede ser anterior a start_date. Ambas columnas
-- son NOT NULL en goals.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'goals_end_date_after_start_chk'
      and conrelid = 'public.goals'::regclass
  ) then
    alter table public.goals
      add constraint goals_end_date_after_start_chk
      check (end_date >= start_date);
  end if;
end $$;

-- H-16 — goals.current_value no puede ser negativo.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'goals_current_value_non_negative_chk'
      and conrelid = 'public.goals'::regclass
  ) then
    alter table public.goals
      add constraint goals_current_value_non_negative_chk
      check (current_value >= 0);
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- Índices de apoyo para claves foráneas
-- Hallazgo: H-20
-- Tabla afectada: public.habit_categories
-- Propósito: habit_id ya está cubierto por la PK compuesta (habit_id,
-- category_id); category_id no tenía ningún índice propio, lo que penaliza
-- la búsqueda inversa "hábitos de una categoría" (confirmado por el advisor
-- de rendimiento de Supabase en la auditoría).
-- ----------------------------------------------------------------------------
create index if not exists habit_categories_category_id_idx
  on public.habit_categories (category_id);


-- ----------------------------------------------------------------------------
-- H-01 — integridad relacional: habit_categories.category_id debe
-- pertenecer al mismo usuario que habit_categories.habit_id.
-- Tabla afectada: public.habit_categories
-- Propósito: este trigger se conserva en esta migración porque garantiza
-- integridad relacional a nivel de base de datos y NO sustituye ni modifica
-- ninguna política RLS existente — es un mecanismo independiente y
-- complementario.
-- SECURITY INVOKER (por defecto, sin "security definer"): las consultas
-- internas ya quedan sujetas a las políticas RLS existentes de habits y
-- categories, lo cual es suficiente y más seguro (principio de mínimo
-- privilegio) — si la fila referenciada no es visible para el usuario
-- actual por RLS, la comparación falla igualmente y la operación se
-- rechaza.
-- Se revoca EXECUTE público: esta función solo debe invocarse vía trigger,
-- nunca como llamada directa (RPC).
-- ----------------------------------------------------------------------------
create or replace function public.validate_habit_category_ownership()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_habit_owner uuid;
  v_category_owner uuid;
begin
  select user_id into v_habit_owner from public.habits where id = new.habit_id;
  select user_id into v_category_owner from public.categories where id = new.category_id;

  if v_habit_owner is distinct from v_category_owner then
    raise exception 'habit_categories: category % does not belong to the same user as habit %',
      new.category_id, new.habit_id;
  end if;

  return new;
end;
$$;

revoke execute on function public.validate_habit_category_ownership() from public, anon, authenticated;

create or replace trigger validate_habit_category_ownership_trg
  before insert or update on public.habit_categories
  for each row execute function public.validate_habit_category_ownership();


-- ----------------------------------------------------------------------------
-- H-02 — integridad relacional: goals.habit_id debe pertenecer al mismo
-- usuario que goals.user_id.
-- Tabla afectada: public.goals
-- Propósito: mismo enfoque que H-01 — este trigger se conserva porque
-- garantiza integridad relacional sin sustituir ni modificar la política
-- RLS de goals (excluida del alcance de esta migración). habit_id es
-- nullable (meta general sin hábito asociado), por lo que la validación
-- solo se ejecuta cuando hay un hábito vinculado.
-- ----------------------------------------------------------------------------
create or replace function public.validate_goal_habit_ownership()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_habit_owner uuid;
begin
  if new.habit_id is not null then
    select user_id into v_habit_owner from public.habits where id = new.habit_id;

    if v_habit_owner is distinct from new.user_id then
      raise exception 'goals: habit % does not belong to the same user as the goal (user %)',
        new.habit_id, new.user_id;
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.validate_goal_habit_ownership() from public, anon, authenticated;

create or replace trigger validate_goal_habit_ownership_trg
  before insert or update on public.goals
  for each row execute function public.validate_goal_habit_ownership();
