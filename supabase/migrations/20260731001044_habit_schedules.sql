-- ============================================================================
-- Migración: habit_schedules
-- Origen: MDs/09_DATABASE_AUDIT.md (Revisión 4) + MDs/10_DATABASE_DECISIONS.md
--
-- Alcance: implementa D-03 — habit_schedules pasa a ser la fuente de verdad
-- única de la frecuencia de un hábito, con historial por rangos de
-- vigencia. Retira de `habits` las cuatro columnas de frecuencia y sus
-- cuatro constraints temporales (creadas en database_integrity.sql como
-- protección de estado intermedio, tal como quedó documentado ahí mismo).
--
-- No modifica init_schema, harden_functions, database_integrity ni
-- entity_lifecycle. No toca categories, goals ni habit_logs. No implementa
-- snapshots, progress_source, ventana de 7 días, preferred_time,
-- minimum_target, ideal_target, ni ningún cambio de frontend.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Extensión requerida: btree_gist
-- Propósito: la restricción EXCLUDE de más abajo (sin rangos superpuestos
-- por habit_id) combina una comparación de igualdad sobre `habit_id`
-- (uuid) con una comparación de solapamiento sobre un `daterange`, dentro
-- de un único índice GiST. GiST no soporta el operador de igualdad (=)
-- para tipos escalares como uuid de forma nativa; btree_gist es la
-- extensión estándar de PostgreSQL que provee esa clase de operador. No se
-- habilita ninguna otra extensión ajena a este propósito.
-- Se asume que el esquema `extensions` ya existe en el proyecto (provisión
-- estándar de Supabase); si no existiera, esta línea fallaría de forma
-- explícita y visible al aplicar la migración, sin efectos silenciosos.
-- ----------------------------------------------------------------------------
create extension if not exists btree_gist with schema extensions;


-- ----------------------------------------------------------------------------
-- D-03 — Función auxiliar genérica de validación de days_of_week.
--
-- Reemplaza a public.habits_days_of_week_is_valid(smallint[]), creada en
-- database_integrity.sql para H-13. Esa función nunca tuvo lógica
-- específica de `habits` en su cuerpo (solo valida un array), así que
-- generalizarla es un cambio de nombre, no de comportamiento.
--
-- Transición (sin dejar dos implementaciones): esta misma migración, más
-- abajo, retira `habits_days_of_week_valid_chk` (su único llamador) y
-- luego elimina la función antigua explícitamente. En ningún momento
-- coexisten dos implementaciones con lógica propia — solo existe esta.
-- No se conserva un alias de compatibilidad porque su único uso conocido
-- (el CHECK de `habits`) se retira en esta misma migración.
-- ----------------------------------------------------------------------------
create or replace function public.days_of_week_is_valid(days smallint[])
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

-- Mismo criterio de privilegios que la función original: revocado de
-- PUBLIC (retira el acceso implícito de anon), concedido explícitamente a
-- `authenticated` (necesario para el CHECK durante escrituras normales de
-- `habit_schedules` hechas a través de la función RPC) y a `service_role`.
revoke execute on function public.days_of_week_is_valid(smallint[]) from public;
grant execute on function public.days_of_week_is_valid(smallint[]) to authenticated;
grant execute on function public.days_of_week_is_valid(smallint[]) to service_role;


-- ----------------------------------------------------------------------------
-- D-03 — Tabla public.habit_schedules
--
-- Sin columna user_id: la propiedad se resuelve exclusivamente a través de
-- habit_id -> habits.user_id, replicando el mismo patrón ya usado por
-- habit_categories y habit_logs (ninguna de las dos tiene user_id propio).
-- No hay justificación documentada para duplicar el dato aquí.
--
-- ON DELETE CASCADE en habit_id: el flujo normal de eliminación de un
-- hábito es borrado lógico (lifecycle_status = 'deleted', H-10/D-10 de la
-- auditoría). El CASCADE solo se activa en el flujo administrativo de
-- borrado físico ("eliminar hábito y todos sus registros"), exactamente
-- el mismo criterio ya aplicado a habit_logs, habit_categories y
-- goals.habit_id — sin esto, un DELETE físico de un hábito dejaría
-- versiones de frecuencia huérfanas.
-- ----------------------------------------------------------------------------
create table if not exists public.habit_schedules (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  frequency_type public.frequency_type not null,
  days_of_week smallint[],
  frequency_target smallint,
  interval_days smallint,
  valid_from date not null,
  valid_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- D-03 — Restricciones temporales y de coherencia sobre habit_schedules.
-- ----------------------------------------------------------------------------

-- valid_to es NULL (versión vigente, rango abierto) o >= valid_from.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'habit_schedules_valid_to_after_from_chk'
      and conrelid = 'public.habit_schedules'::regclass
  ) then
    alter table public.habit_schedules
      add constraint habit_schedules_valid_to_after_from_chk
      check (valid_to is null or valid_to >= valid_from);
  end if;
end $$;

-- Trasladado de H-14 (habits_frequency_target_positive_chk /
-- habits_interval_days_positive_chk en database_integrity.sql).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'habit_schedules_frequency_target_positive_chk'
      and conrelid = 'public.habit_schedules'::regclass
  ) then
    alter table public.habit_schedules
      add constraint habit_schedules_frequency_target_positive_chk
      check (frequency_target is null or frequency_target > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'habit_schedules_interval_days_positive_chk'
      and conrelid = 'public.habit_schedules'::regclass
  ) then
    alter table public.habit_schedules
      add constraint habit_schedules_interval_days_positive_chk
      check (interval_days is null or interval_days > 0);
  end if;
end $$;

-- Trasladado de H-13 (habits_days_of_week_valid_chk), usando la función
-- genérica definida arriba.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'habit_schedules_days_of_week_valid_chk'
      and conrelid = 'public.habit_schedules'::regclass
  ) then
    alter table public.habit_schedules
      add constraint habit_schedules_days_of_week_valid_chk
      check (public.days_of_week_is_valid(days_of_week));
  end if;
end $$;

-- Trasladado de H-11 (habits_frequency_coherence_chk), usando los valores
-- reales de public.frequency_type confirmados en init_schema: 'daily',
-- 'specific_days', 'times_per_week', 'times_per_month', 'one_time',
-- 'custom_interval'.
--
-- Regla MÁS ESTRICTA que la versión original de H-11 en `habits`: además
-- de exigir el campo requerido por cada tipo, aquí también se exige que
-- las columnas NO relevantes para ese tipo queden en NULL. `habits` nunca
-- exigió esto último (la auditoría lo documentó explícitamente: "no se
-- exige que los demás campos queden en null"); para `habit_schedules` sí
-- se exige, porque cada fila representa una única configuración de
-- frecuencia versionada y no debe cargar datos ambiguos de un tipo que no
-- le corresponde. `else false` (en vez de `else true`): los seis valores
-- del enum ya están cubiertos explícitamente, así que cualquier valor no
-- contemplado (solo posible si el enum se ampliara sin actualizar esta
-- regla) queda rechazado en vez de aceptado silenciosamente.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'habit_schedules_frequency_coherence_chk'
      and conrelid = 'public.habit_schedules'::regclass
  ) then
    alter table public.habit_schedules
      add constraint habit_schedules_frequency_coherence_chk
      check (
        case frequency_type
          when 'daily' then
            days_of_week is null and frequency_target is null and interval_days is null
          when 'specific_days' then
            days_of_week is not null and array_length(days_of_week, 1) > 0
            and frequency_target is null and interval_days is null
          when 'times_per_week' then
            frequency_target is not null
            and days_of_week is null and interval_days is null
          when 'times_per_month' then
            frequency_target is not null
            and days_of_week is null and interval_days is null
          when 'one_time' then
            days_of_week is null and frequency_target is null and interval_days is null
          when 'custom_interval' then
            interval_days is not null
            and days_of_week is null and frequency_target is null
          else false
        end
      );
  end if;
end $$;

-- Sin rangos de vigencia superpuestos para el mismo habit_id.
--
-- Semántica del rango: valid_from inclusivo, valid_to inclusivo cuando no
-- es NULL; valid_to NULL representa una versión vigente sin fecha de fin
-- (rango abierto). `daterange(valid_from, valid_to, '[]')` construye el
-- rango con ambos extremos inclusivos; si valid_to es NULL, el límite
-- superior queda sin acotar (equivalente a infinito), tal como exige la
-- consigna. Como consecuencia directa de esta restricción (sin necesidad
-- de una regla aparte): una versión posterior no puede comenzar el mismo
-- día en que terminó la anterior — [..., X] y [X, ...) se solapan en X —
-- por lo tanto valid_from de la nueva versión debe ser, como mínimo, un
-- día después del valid_to de la anterior.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'habit_schedules_no_overlap_excl'
      and conrelid = 'public.habit_schedules'::regclass
  ) then
    alter table public.habit_schedules
      add constraint habit_schedules_no_overlap_excl
      exclude using gist (
        habit_id with =,
        daterange(valid_from, valid_to, '[]') with &&
      );
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- D-03 — Índices.
-- ----------------------------------------------------------------------------

-- Único parcial: como máximo una fila vigente (valid_to IS NULL) por
-- habit_id. Nota: la restricción EXCLUDE de arriba ya implica este mismo
-- resultado (dos rangos abiertos del mismo habit_id siempre se solapan),
-- pero se agrega este índice explícito además del EXCLUDE porque: (a) es
-- la forma más directa y barata de resolver "¿cuál es la versión vigente
-- de este hábito?" (la consulta más frecuente sobre esta tabla), y (b)
-- deja la garantía "una sola versión vigente" expresada de forma explícita
-- e independiente, en vez de depender únicamente de un efecto colateral
-- del EXCLUDE.
create unique index if not exists habit_schedules_one_current_per_habit_idx
  on public.habit_schedules (habit_id)
  where valid_to is null;

-- Soporta: (a) el índice de la FK habit_id (evita escaneos secuenciales al
-- validar el CASCADE o al hacer joins con habits); (b) listar el
-- historial completo de versiones de un hábito en orden cronológico. No es
-- redundante con el índice GiST generado automáticamente por el EXCLUDE
-- (ese índice está optimizado para solapamiento de rangos, no para
-- igualdad+orden), ni con el índice único parcial de arriba (que solo
-- cubre la fila vigente, no el historial completo).
create index if not exists habit_schedules_habit_id_valid_from_idx
  on public.habit_schedules (habit_id, valid_from);


-- ----------------------------------------------------------------------------
-- D-03 — updated_at: se reutiliza public.set_updated_at(), la misma
-- función trigger ya usada por profiles, habits, habit_logs y goals
-- (definida en init_schema.sql). No se crea una función equivalente
-- nueva. created_at/updated_at son metadatos de auditoría de la fila;
-- no sustituyen a valid_from/valid_to, que son los que definen la
-- semántica histórica de vigencia.
-- ----------------------------------------------------------------------------
create or replace trigger set_habit_schedules_updated_at
  before update on public.habit_schedules
  for each row execute function public.set_updated_at();


-- ----------------------------------------------------------------------------
-- D-03 — RLS.
--
-- Resultado esperado y obtenido: SELECT permitido al dueño del hábito
-- (vía habits.user_id); sin ninguna política de INSERT/UPDATE/DELETE para
-- `authenticated` — con RLS activado y sin política que cubra esas
-- operaciones para ese rol, PostgreSQL las deniega por defecto. Esto
-- basta para bloquear la escritura directa del cliente sin necesitar una
-- política "deny" explícita. `service_role` no está sujeto a RLS (bypass
-- por diseño de Supabase) y conserva capacidad administrativa completa.
-- Los cambios de frecuencia deben pasar por public.change_habit_schedule
-- (más abajo), que corre como SECURITY DEFINER precisamente para poder
-- escribir aquí a pesar de esta restricción, después de validar
-- explícitamente la propiedad del hábito.
-- ----------------------------------------------------------------------------
alter table public.habit_schedules enable row level security;

create policy "Habit schedules are viewable by owner" on public.habit_schedules
  for select
  using (
    exists (
      select 1 from public.habits h
      where h.id = habit_id and h.user_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------------------
-- D-03 — Backfill.
--
-- Se ejecuta una fila por cada hábito existente que todavía no tenga
-- ninguna versión en habit_schedules (condición WHERE NOT EXISTS: hace el
-- backfill idempotente, seguro de repetir sin duplicar filas). No se
-- asume que la tabla `habits` esté vacía.
--
-- valid_from = habits.start_date: es la única fecha disponible que
-- razonablemente ancla "desde cuándo rige esta configuración de
-- frecuencia" para un hábito ya existente — es además NOT NULL en el
-- esquema (confirmado en init_schema.sql), por lo que toda fila existente
-- tiene un valor utilizable sin necesidad de una fecha alternativa
-- inventada. valid_to queda NULL: se asume que la configuración actual
-- de cada hábito sigue vigente hasta que alguien la cambie explícitamente
-- a través de la función RPC.
insert into public.habit_schedules (
  habit_id, frequency_type, days_of_week, frequency_target, interval_days, valid_from, valid_to
)
select
  h.id, h.frequency_type, h.days_of_week, h.frequency_target, h.interval_days, h.start_date, null
from public.habits h
where not exists (
  select 1 from public.habit_schedules hs where hs.habit_id = h.id
);


-- ----------------------------------------------------------------------------
-- D-03 — Verificación conceptual antes de retirar columnas de habits.
--
-- Si algún hábito quedara sin una versión vigente después del backfill de
-- arriba (no debería ocurrir dado el WHERE NOT EXISTS y que start_date es
-- NOT NULL, pero no se asume sin comprobar), esta migración se detiene
-- aquí con una excepción explícita, ANTES de tocar `habits`. No se
-- corrige nada silenciosamente ni se genera SQL destructivo adicional; se
-- reporta el bloqueo deteniendo la transacción completa de la migración.
-- ----------------------------------------------------------------------------
do $$
declare
  v_missing_count int;
begin
  select count(*) into v_missing_count
  from public.habits h
  where not exists (
    select 1 from public.habit_schedules hs
    where hs.habit_id = h.id and hs.valid_to is null
  );

  if v_missing_count > 0 then
    raise exception
      'habit_schedules: % habit(s) without a current (valid_to IS NULL) schedule version after backfill. Aborting before dropping frequency columns from habits.',
      v_missing_count;
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- D-03 — Retiro de las constraints temporales de frecuencia en habits.
--
-- Nombres confirmados por inspección directa de database_integrity.sql
-- (no se asumen): habits_frequency_coherence_chk,
-- habits_days_of_week_valid_chk, habits_interval_days_positive_chk,
-- habits_frequency_target_positive_chk. Ese mismo archivo ya documentaba
-- que estas cuatro constraints eran temporales y se retirarían aquí.
-- El orden importa: habits_days_of_week_valid_chk depende de la columna
-- days_of_week, por eso se retira antes de eliminar esa columna más abajo.
-- ----------------------------------------------------------------------------
alter table public.habits drop constraint if exists habits_frequency_coherence_chk;
alter table public.habits drop constraint if exists habits_days_of_week_valid_chk;
alter table public.habits drop constraint if exists habits_interval_days_positive_chk;
alter table public.habits drop constraint if exists habits_frequency_target_positive_chk;

-- La función original queda sin ningún llamador conocido en este punto
-- (su único uso era la constraint recién retirada) — se elimina en vez de
-- dejarla como código muerto, completando la transición documentada al
-- inicio de este archivo hacia public.days_of_week_is_valid.
drop function if exists public.habits_days_of_week_is_valid(smallint[]);


-- ----------------------------------------------------------------------------
-- D-03 — Retiro de las cuatro columnas de frecuencia en habits.
--
-- A partir de aquí, habit_schedules es la única fuente de verdad para la
-- frecuencia de un hábito. Columnas confirmadas por inspección directa de
-- init_schema.sql.
-- ----------------------------------------------------------------------------
alter table public.habits drop column if exists frequency_type;
alter table public.habits drop column if exists days_of_week;
alter table public.habits drop column if exists frequency_target;
alter table public.habits drop column if exists interval_days;


-- ----------------------------------------------------------------------------
-- D-03 — Operación atómica para cambiar la frecuencia de un hábito.
--
-- SECURITY DEFINER es necesario aquí (no opcional): la política RLS de
-- habit_schedules definida arriba no incluye ninguna política de escritura
-- para `authenticated`, por lo que un INSERT/UPDATE directo del cliente ya
-- queda bloqueado por RLS. Esta función necesita poder escribir a pesar de
-- esa restricción — para eso corre como definer (cuyo rol de ejecución de
-- migraciones tiene bypass de RLS) — y en compensación valida
-- explícitamente auth.uid() contra habits.user_id en su primera línea de
-- lógica, antes de cualquier lectura o escritura adicional. search_path
-- fijo a '' (vacío, el más restrictivo): todo el cuerpo ya referencia sus
-- objetos completamente calificados por esquema (public.habits,
-- public.habit_schedules, public.days_of_week_is_valid, auth.uid()), así
-- que no depende de resolución implícita de nombres en ningún punto. No se
-- usa SQL dinámico en ningún punto.
--
-- El cliente nunca cierra una versión e inserta la siguiente como dos
-- llamadas independientes: toda la operación ocurre dentro de esta única
-- función, en la transacción implícita de su propia ejecución.
-- ----------------------------------------------------------------------------
create or replace function public.change_habit_schedule(
  p_habit_id uuid,
  p_frequency_type public.frequency_type,
  p_days_of_week smallint[],
  p_frequency_target smallint,
  p_interval_days smallint,
  p_effective_date date
)
returns public.habit_schedules
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_current public.habit_schedules;
  v_new_row public.habit_schedules;
begin
  -- 0. p_effective_date es obligatorio: toda la lógica de cierre/apertura
  -- de versiones depende de esta fecha; sin ella no hay forma segura de
  -- continuar. Se valida antes de cualquier UPDATE o INSERT.
  if p_effective_date is null then
    raise exception 'change_habit_schedule: p_effective_date must not be null';
  end if;

  -- 1. El hábito debe existir y pertenecer al usuario autenticado.
  select user_id into v_owner from public.habits where id = p_habit_id;

  if v_owner is null then
    raise exception 'change_habit_schedule: habit % not found', p_habit_id;
  end if;

  if v_owner is distinct from auth.uid() then
    raise exception 'change_habit_schedule: habit % does not belong to the current user', p_habit_id;
  end if;

  -- 2. Bloqueo para concurrencia: serializa cambios simultáneos de
  -- frecuencia sobre el mismo hábito (dos llamadas concurrentes a esta
  -- función para el mismo habit_id no pueden intercalarse).
  perform 1 from public.habits where id = p_habit_id for update;

  -- Validación de coherencia (misma regla que
  -- habit_schedules_frequency_coherence_chk), verificada aquí también
  -- para devolver un mensaje de error específico en vez de depender solo
  -- del error genérico del CHECK al insertar.
  if p_frequency_type = 'specific_days'
     and (p_days_of_week is null or coalesce(array_length(p_days_of_week, 1), 0) = 0) then
    raise exception 'change_habit_schedule: frequency_type specific_days requires a non-empty days_of_week';
  end if;

  if p_frequency_type in ('times_per_week', 'times_per_month') and p_frequency_target is null then
    raise exception 'change_habit_schedule: frequency_type % requires frequency_target', p_frequency_type;
  end if;

  if p_frequency_type = 'custom_interval' and p_interval_days is null then
    raise exception 'change_habit_schedule: frequency_type custom_interval requires interval_days';
  end if;

  if p_frequency_type <> 'specific_days' and p_days_of_week is not null then
    raise exception 'change_habit_schedule: days_of_week must be null for frequency_type %', p_frequency_type;
  end if;

  if p_frequency_type not in ('times_per_week', 'times_per_month') and p_frequency_target is not null then
    raise exception 'change_habit_schedule: frequency_target must be null for frequency_type %', p_frequency_type;
  end if;

  if p_frequency_type <> 'custom_interval' and p_interval_days is not null then
    raise exception 'change_habit_schedule: interval_days must be null for frequency_type %', p_frequency_type;
  end if;

  if not public.days_of_week_is_valid(p_days_of_week) then
    raise exception 'change_habit_schedule: days_of_week contains out-of-range or duplicate values';
  end if;

  if p_frequency_target is not null and p_frequency_target <= 0 then
    raise exception 'change_habit_schedule: frequency_target must be positive';
  end if;

  if p_interval_days is not null and p_interval_days <= 0 then
    raise exception 'change_habit_schedule: interval_days must be positive';
  end if;

  -- 3. Localizar y bloquear la versión vigente.
  select * into v_current
  from public.habit_schedules
  where habit_id = p_habit_id and valid_to is null
  for update;

  if v_current.id is null then
    raise exception 'change_habit_schedule: habit % has no current schedule version', p_habit_id;
  end if;

  -- Idempotencia: si la configuración recibida es exactamente igual a la
  -- vigente, no se cierra ninguna versión ni se inserta una nueva — se
  -- devuelve la fila vigente tal cual. Comparación segura frente a NULL
  -- con IS NOT DISTINCT FROM (evita que NULL vs NULL se evalúe como
  -- distinto). La fecha efectiva recibida es irrelevante en este caso —
  -- no producir una nueva versión es, por definición, el resultado
  -- idempotente, incluso si p_effective_date por sí sola habría sido
  -- rechazada más abajo.
  if v_current.frequency_type is not distinct from p_frequency_type
     and v_current.days_of_week is not distinct from p_days_of_week
     and v_current.frequency_target is not distinct from p_frequency_target
     and v_current.interval_days is not distinct from p_interval_days
  then
    return v_current;
  end if;

  -- Rechaza fechas efectivas que producirían un rango inválido o
  -- superpuesto con la versión vigente (y, transitivamente, con
  -- cualquier versión histórica anterior, ya que valid_from de la
  -- versión vigente es siempre posterior a todo valid_to previo).
  if p_effective_date <= v_current.valid_from then
    raise exception
      'change_habit_schedule: effective_date (%) must be strictly after the current version''s valid_from (%)',
      p_effective_date, v_current.valid_from;
  end if;

  -- 4. Cerrar la versión vigente el día anterior a la nueva.
  update public.habit_schedules
  set valid_to = p_effective_date - 1
  where id = v_current.id;

  -- 5. Insertar la nueva versión vigente.
  insert into public.habit_schedules (
    habit_id, frequency_type, days_of_week, frequency_target, interval_days, valid_from, valid_to
  )
  values (
    p_habit_id, p_frequency_type, p_days_of_week, p_frequency_target, p_interval_days, p_effective_date, null
  )
  returning * into v_new_row;

  return v_new_row;
end;
$$;

-- Privilegios: revocado de PUBLIC (retira el acceso implícito de anon);
-- concedido explícitamente solo a authenticated (uso normal desde el
-- cliente autenticado, validado dentro de la función mediante auth.uid()
-- contra habits.user_id). service_role NO recibe GRANT sobre esta función:
-- su validación de propiedad vía auth.uid() no tiene sentido bajo ese rol
-- (sin sesión de usuario), y service_role ya conserva acceso administrativo
-- directo a habits/habit_schedules por bypass nativo de RLS — no necesita
-- pasar por esta RPC para escribir. El propietario de la función conserva
-- acceso implícito.
revoke execute on function public.change_habit_schedule(uuid, public.frequency_type, smallint[], smallint, smallint, date) from public;
grant execute on function public.change_habit_schedule(uuid, public.frequency_type, smallint[], smallint, smallint, date) to authenticated;
