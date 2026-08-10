-- ============================================================================
-- Migración: create_habit_schedule
-- Origen: Paso 5 de 7 — CRUD real de hábitos. Hallazgo real detectado antes
-- de escribir código de servicio: `public.change_habit_schedule(...)`
-- (20260731001044_habit_schedules.sql) exige que YA EXISTA una versión
-- vigente (`valid_to IS NULL`) para el hábito — está diseñada para CAMBIAR
-- una frecuencia existente, no para crear la primera. `habit_schedules` no
-- tiene ninguna política RLS de INSERT/UPDATE/DELETE para `authenticated`
-- (solo SELECT, rls_hardening.sql + table_privileges.sql) ni ningún otro
-- GRANT que permita escribirla directamente. Resultado: con el esquema
-- anterior a esta migración, un cliente autenticado podía crear un hábito
-- en `habits` pero no tenía NINGÚN camino permitido para darle una
-- periodicidad inicial. Autorizado explícitamente por el responsable del
-- producto (opción "Nueva RPC dedicada a creación") antes de escribir esta
-- migración.
--
-- Alcance: agrega EXCLUSIVAMENTE una función nueva,
-- `public.create_habit_schedule(...)`, para la primera versión de
-- `habit_schedules` de un hábito. No modifica `change_habit_schedule` (sigue
-- exactamente igual, para cambios posteriores) ni ninguna migración previa.
-- No toca RLS de `habits`/`habit_categories`/`categories`, no agrega
-- columnas, no modifica constraints existentes.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- public.create_habit_schedule — crea la ÚNICA/PRIMERA versión vigente de
-- habit_schedules para un hábito recién creado, propiedad del usuario
-- autenticado.
--
-- Diseño deliberadamente simétrico a change_habit_schedule (mismas reglas de
-- coherencia frequency_type↔columnas dependientes, mismas validaciones de
-- rango) pero con la guarda invertida: aquí se exige que NO exista ninguna
-- versión vigente todavía — si ya existe una, se rechaza (el cliente debe
-- usar change_habit_schedule para modificarla, no esta función).
--
-- `valid_from` no se recibe como parámetro: se toma directamente de
-- `habits.start_date` del hábito referenciado, igual que hizo el backfill
-- original de 20260731001044_habit_schedules.sql
-- ("valid_from = habits.start_date: es la única fecha disponible que..."),
-- evitando que el cliente pueda enviar una fecha de vigencia inconsistente
-- con la fecha de inicio real del hábito.
-- ----------------------------------------------------------------------------
create or replace function public.create_habit_schedule(
  p_habit_id uuid,
  p_frequency_type public.frequency_type,
  p_days_of_week smallint[],
  p_frequency_target smallint,
  p_interval_days smallint
)
returns public.habit_schedules
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_start_date date;
  v_existing_id uuid;
  v_new_row public.habit_schedules;
begin
  -- 1. El hábito debe existir y pertenecer al usuario autenticado. Se lee
  -- start_date en la misma consulta: es el valor que se usará como
  -- valid_from más abajo.
  select user_id, start_date into v_owner, v_start_date
  from public.habits
  where id = p_habit_id;

  if v_owner is null then
    raise exception 'create_habit_schedule: habit % not found', p_habit_id;
  end if;

  if v_owner is distinct from auth.uid() then
    raise exception 'create_habit_schedule: habit % does not belong to the current user', p_habit_id;
  end if;

  -- 2. Bloqueo para concurrencia: mismo patrón que change_habit_schedule,
  -- serializa creaciones/cambios simultáneos de frecuencia para el mismo
  -- habit_id.
  perform 1 from public.habits where id = p_habit_id for update;

  -- 3. Guarda invertida respecto a change_habit_schedule: esta función es
  -- solo para la PRIMERA versión. Si ya existe una vigente, se rechaza en
  -- vez de sobrescribirla o crear una segunda fila vigente simultánea (lo
  -- que violaría habit_schedules_one_current_per_habit_idx de todas formas,
  -- pero se da aquí un mensaje claro antes de llegar a ese error genérico).
  select id into v_existing_id
  from public.habit_schedules
  where habit_id = p_habit_id and valid_to is null
  for update;

  if v_existing_id is not null then
    raise exception
      'create_habit_schedule: habit % already has a current schedule version — use change_habit_schedule to modify it',
      p_habit_id;
  end if;

  -- 4. Validación de coherencia — idéntica a change_habit_schedule (mismas
  -- reglas que habit_schedules_frequency_coherence_chk/
  -- habit_schedules_days_of_week_valid_chk), repetida aquí por la misma
  -- razón: devolver un mensaje específico en vez de depender solo del CHECK
  -- genérico al insertar.
  if p_frequency_type = 'specific_days'
     and (p_days_of_week is null or coalesce(array_length(p_days_of_week, 1), 0) = 0) then
    raise exception 'create_habit_schedule: frequency_type specific_days requires a non-empty days_of_week';
  end if;

  if p_frequency_type in ('times_per_week', 'times_per_month') and p_frequency_target is null then
    raise exception 'create_habit_schedule: frequency_type % requires frequency_target', p_frequency_type;
  end if;

  if p_frequency_type = 'custom_interval' and p_interval_days is null then
    raise exception 'create_habit_schedule: frequency_type custom_interval requires interval_days';
  end if;

  if p_frequency_type <> 'specific_days' and p_days_of_week is not null then
    raise exception 'create_habit_schedule: days_of_week must be null for frequency_type %', p_frequency_type;
  end if;

  if p_frequency_type not in ('times_per_week', 'times_per_month') and p_frequency_target is not null then
    raise exception 'create_habit_schedule: frequency_target must be null for frequency_type %', p_frequency_type;
  end if;

  if p_frequency_type <> 'custom_interval' and p_interval_days is not null then
    raise exception 'create_habit_schedule: interval_days must be null for frequency_type %', p_frequency_type;
  end if;

  if not public.days_of_week_is_valid(p_days_of_week) then
    raise exception 'create_habit_schedule: days_of_week contains out-of-range or duplicate values';
  end if;

  if p_frequency_target is not null and p_frequency_target <= 0 then
    raise exception 'create_habit_schedule: frequency_target must be positive';
  end if;

  if p_interval_days is not null and p_interval_days <= 0 then
    raise exception 'create_habit_schedule: interval_days must be positive';
  end if;

  -- 5. Insertar la primera (y por ahora única) versión vigente.
  insert into public.habit_schedules (
    habit_id, frequency_type, days_of_week, frequency_target, interval_days, valid_from, valid_to
  )
  values (
    p_habit_id, p_frequency_type, p_days_of_week, p_frequency_target, p_interval_days, v_start_date, null
  )
  returning * into v_new_row;

  return v_new_row;
end;
$$;

-- Privilegios: mismo criterio que change_habit_schedule — revocado de
-- PUBLIC, concedido solo a authenticated (la función valida auth.uid()
-- contra habits.user_id en su propio cuerpo). service_role no lo necesita:
-- ya tiene acceso administrativo directo por bypass nativo de RLS.
revoke execute on function public.create_habit_schedule(uuid, public.frequency_type, smallint[], smallint, smallint) from public;
grant execute on function public.create_habit_schedule(uuid, public.frequency_type, smallint[], smallint, smallint) to authenticated;
