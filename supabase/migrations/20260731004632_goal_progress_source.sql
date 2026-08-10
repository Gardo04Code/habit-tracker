-- ============================================================================
-- Migración: goal_progress_source
-- Origen: MDs/09_DATABASE_AUDIT.md (H-03, sección 16) + MDs/10_DATABASE_DECISIONS.md
-- (D-05 — "progress_source será implementado", Decisiones aprobadas)
--
-- Alcance: implementa D-05. Agrega goals.progress_source y establece, para
-- metas con progress_source = 'habit_logs', DOS triggers de sincronización
-- que mantienen goals.current_value mediante una función central de
-- recálculo: uno sobre habit_logs (INSERT/UPDATE/DELETE, reacciona a
-- cambios en los registros diarios) y otro sobre la propia goals (UPDATE
-- OF habit_id/start_date/end_date, reacciona a cambios en la fuente o el
-- rango temporal de la meta) — current_value queda sincronizado ante
-- cualquiera de los dos tipos de cambio, no solo ante el primero.
-- progress_source queda protegido contra reclasificación directa una vez
-- que la fila existe (BEFORE UPDATE dedicado). current_value queda
-- protegido mediante recálculo-y-comparación server-side (no una variable
-- de confianza): para 'habit_logs' cualquier cambio debe coincidir
-- exactamente con el valor recalculado desde habit_logs; para 'calculated'
-- ningún cambio persistido se acepta nunca. No implementa una fórmula de
-- cálculo para 'calculated' (sin definición funcional inequívoca en los
-- documentos — ver sección de ambigüedades).
--
-- No modifica init_schema, harden_functions, database_integrity,
-- entity_lifecycle, habit_schedules ni
-- 20260731002637_habit_log_goal_snapshots.sql (nombre real en el
-- repositorio del archivo de corrección de snapshots).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Validaciones previas (confirmadas por inspección directa antes de escribir
-- este archivo, no asumidas):
--
-- 1. Enums confirmados (sin cambios en ninguna migración posterior a su
--    creación):
--      goal_type            (init_schema.sql): 'boolean', 'quantity',
--                            'duration', 'repetitions', 'deadline',
--                            'accumulated_days'
--      habit_status          (init_schema.sql): 'pending', 'completed',
--                            'partial', 'not_completed', 'not_applicable'
--      goal_status           (init_schema.sql): 'active', 'completed',
--                            'expired'
--      goal_lifecycle_status (entity_lifecycle.sql): 'active', 'paused',
--                            'deleted'
-- 2. Tipos exactos (init_schema.sql, sin alterar por migraciones
--    posteriores): goals.current_value numeric not null default 0;
--    goals.target_value numeric not null; habit_logs.value numeric
--    (nullable). goals.start_date/end_date son AMBAS date not null (a
--    diferencia de habits, donde end_date sí es nullable) — confirmado por
--    inspección directa de init_schema.sql.
-- 3. Semántica documentada de current_value: MDs/10_DATABASE_DECISIONS.md
--    D-05 y MDs/09_DATABASE_AUDIT.md sección 16 documentan el MECANISMO
--    (trigger para habit_logs, cálculo al vuelo para calculated,
--    almacenado editable para manual) pero NO documentan una fórmula
--    aritmética exacta de cómo el value/status de cada habit_log se
--    traduce en current_value por goal_type. Ver sección de definición de
--    progreso más abajo para el análisis completo de qué se implementa y
--    qué se reporta como ambigüedad.
-- 4. goals.habit_id no tiene restricción UNIQUE (init_schema.sql:
--    `create index goals_habit_id_idx on public.goals(habit_id);`, índice
--    simple, no único) — SÍ puede haber varias goals para un mismo
--    habit_id. El trigger de sincronización no asume una sola meta por
--    hábito.
-- 5. Conteo de estados de habit_logs (revisado en esta corrección): solo
--    'completed' y 'partial' aportan a la suma de progreso; 'not_completed'
--    y 'not_applicable' quedan excluidos explícitamente ('not_applicable'
--    porque la auditoría documenta que "no suma ni rompe racha"; el
--    encargo de esta corrección exige adicionalmente excluir
--    'not_completed'). 'pending' queda excluido por la misma lista blanca
--    (solo se incluye lo que está explícitamente en la lista, no todo lo
--    que no está explícitamente excluido).
-- 6. Políticas RLS vigentes (init_schema.sql, sin cambios posteriores):
--      goals: "Goals are manageable by owner", FOR ALL, USING/WITH CHECK
--             auth.uid() = user_id — no distingue columnas.
--      habit_logs: "Habit logs manageable by owner", FOR ALL, USING/WITH
--             CHECK EXISTS (habits h WHERE h.id = habit_id AND h.user_id =
--             auth.uid()) — tampoco distingue columnas.
--    Ninguna de las dos impide que las funciones/triggers de esta
--    migración operen (ver sección RLS más abajo para el análisis
--    completo de por qué el diseño SECURITY DEFINER elegido es compatible
--    y seguro con RLS sin necesidad de modificarla).
-- 7. Triggers existentes: goals tiene set_goals_updated_at (BEFORE UPDATE,
--    init_schema.sql) y validate_goal_habit_ownership_trg (BEFORE INSERT
--    OR UPDATE, database_integrity.sql). habit_logs tiene
--    set_habit_logs_updated_at (BEFORE UPDATE, init_schema.sql),
--    set_habit_log_goal_snapshot_trg (BEFORE INSERT) y
--    protect_habit_log_goal_snapshot_trg (BEFORE UPDATE), ambos de
--    20260731002637_habit_log_goal_snapshots.sql. El nuevo trigger de esta
--    migración sobre habit_logs se registra AFTER (no BEFORE), por lo que
--    no interfiere con los dos triggers BEFORE existentes — se ejecuta
--    después de que la fila ya quedó escrita y validada.
-- 8. Este archivo depende de: goals.current_value/target_value/habit_id
--    (init_schema.sql), goal_lifecycle_status (entity_lifecycle.sql, solo
--    para no romperlo, no se usa en esta migración) y
--    habit_logs.goal_type_snapshot (20260731002637_habit_log_goal_snapshots.sql,
--    NOT NULL, imprescindible para distinguir qué fórmula aplica). Se
--    ejecuta correctamente después de las migraciones 1 a 4 y no requiere
--    nada de habit_schedules.sql.
-- 9. Fórmulas no definidas de forma inequívoca en los documentos
--    (goal_type 'boolean', 'deadline', 'accumulated_days' a nivel de
--    progreso de meta, y la fórmula agregada de 'calculated') NO se
--    inventan — ver secciones correspondientes más abajo.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- Enum public.goal_progress_source.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'goal_progress_source'
      and n.nspname = 'public'
  ) then
    create type public.goal_progress_source as enum ('habit_logs', 'calculated', 'manual');
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- Columna goals.progress_source — nullable en esta sentencia; se backfillea
-- y se vuelve NOT NULL más abajo, después de validar que no queden filas
-- sin clasificar. Sin DEFAULT: no existe un único valor por defecto seguro
-- para INSERT futuros (depende de si se envía habit_id en la misma fila, y
-- un DEFAULT de columna no puede referenciar otra columna) — ver
-- "Consecuencia reportada" en la sección de riesgos, al final de este
-- archivo, sobre el impacto de esto en INSERTs futuros que no envíen
-- progress_source explícitamente.
--
-- No se mezcla con goal_status ni goal_lifecycle_status: son tres columnas
-- independientes con significados distintos (resultado de la meta;
-- ciclo de vida active/paused/deleted; origen del progreso) y esta
-- migración no lee ni escribe ninguna de las otras dos.
-- ----------------------------------------------------------------------------
alter table public.goals
  add column if not exists progress_source public.goal_progress_source;


-- ----------------------------------------------------------------------------
-- Backfill de progress_source para filas existentes.
--
-- Estrategia (idempotente vía WHERE progress_source IS NULL):
--   - habit_id IS NOT NULL -> 'habit_logs' (regla explícita sugerida por el
--     encargo: una meta ya vinculada a un hábito es, por definición
--     estructural, una meta de tipo habit_logs bajo este modelo).
--   - habit_id IS NULL -> 'manual', NO 'calculated'.
--
-- Justificación de 'manual' como clasificación conservadora (el encargo
-- exige no asumir 'calculated' sin justificarlo y usar una estrategia
-- explícita si no puede distinguirse con fiabilidad): el esquema actual no
-- tiene ninguna señal que distinga una meta agregada ("calculated", por
-- ejemplo "80 % de cumplimiento mensual sobre varios hábitos") de una meta
-- editada a mano por el usuario cuando habit_id es NULL — ambos casos son
-- indistinguibles hoy. 'manual' es la clasificación de menor riesgo posible
-- para datos preexistentes de origen desconocido: preserva exactamente el
-- current_value que ya tenían (ninguna lógica nueva de esta migración toca
-- current_value de una meta 'manual'), mientras que clasificarlas como
-- 'calculated' implicaría tratar su current_value ya almacenado como "no
-- fuente real" sin tener ninguna fórmula con la que reemplazarlo. No se
-- inventa una clasificación silenciosa: esta es la clasificación explícita
-- elegida, documentada aquí.
-- ----------------------------------------------------------------------------
update public.goals
set progress_source = case
  when habit_id is not null then 'habit_logs'::public.goal_progress_source
  else 'manual'::public.goal_progress_source
end
where progress_source is null;

do $$
declare
  v_missing_count int;
begin
  select count(*) into v_missing_count
  from public.goals
  where progress_source is null;

  if v_missing_count > 0 then
    raise exception
      'goal_progress_source: % goal row(s) left without progress_source after backfill.',
      v_missing_count;
  end if;
end $$;

alter table public.goals
  alter column progress_source set not null;


-- ----------------------------------------------------------------------------
-- Constraints de coherencia entre progress_source y habit_id.
-- ----------------------------------------------------------------------------

-- 1. habit_logs -> habit_id obligatorio (sin un hábito vinculado no hay
--    fuente de la que derivar el progreso).
-- 2. calculated -> habit_id debe ser NULL (el único ejemplo documentado,
--    "80 % de cumplimiento mensual", es una agregación sobre múltiples
--    hábitos, no sobre uno solo; no se encontró evidencia documental
--    contraria que justifique permitir habit_id no nulo aquí).
-- 3. manual -> sin restricción sobre habit_id (el encargo indica
--    explícitamente que puede ser NULL o no, y que no debe vincularse
--    automáticamente a habit_logs).
-- El backfill nunca asigna 'calculated' a ninguna fila, por lo que esta
-- constraint no puede ser violada por datos preexistentes.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'goals_progress_source_habit_id_coherence_chk'
      and conrelid = 'public.goals'::regclass
  ) then
    alter table public.goals
      add constraint goals_progress_source_habit_id_coherence_chk
      check (
        case progress_source
          when 'habit_logs' then habit_id is not null
          when 'calculated' then habit_id is null
          else true
        end
      );
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- Protección de goals.progress_source: public.protect_goal_progress_source()
--
-- BEFORE UPDATE, FOR EACH ROW. Requerido porque toda la protección de
-- current_value (más abajo) depende de que OLD.progress_source sea
-- confiable — si el cliente pudiera reclasificar una meta libremente
-- (por ejemplo, de 'habit_logs' a 'manual' y de vuelta), podría rodear por
-- completo la protección de current_value en un segundo UPDATE.
--
-- Solo rechaza cuando progress_source CAMBIA en una fila EXISTENTE
-- (NEW.progress_source IS DISTINCT FROM OLD.progress_source dentro de un
-- UPDATE) — al ser un trigger BEFORE UPDATE (no BEFORE INSERT), nunca se
-- ejecuta durante un INSERT, por lo que establecer progress_source por
-- primera vez al crear una meta sigue funcionando sin ninguna restricción
-- nueva. No depende de RLS (es un trigger de PostgreSQL, no una política)
-- ni de ninguna validación de frontend. No lee ni modifica goal_status ni
-- goal_lifecycle_status — su única responsabilidad es progress_source.
--
-- No es SECURITY DEFINER: solo compara dos valores escalares de la propia
-- fila (OLD/NEW), sin necesitar acceso a ninguna otra tabla.
--
-- Reclasificar una meta existente (por ejemplo, vincularla después a un
-- hábito) queda deliberadamente sin mecanismo en esta migración: el
-- mensaje de error indica explícitamente que deberá resolverse mediante
-- una RPC controlada futura (no implementada aquí, fuera de alcance).
-- ----------------------------------------------------------------------------
create or replace function public.protect_goal_progress_source()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.progress_source is distinct from old.progress_source then
    raise exception
      'goals: progress_source is read-only after creation (goal %, currently %); reclassifying an existing goal to % must go through a dedicated, controlled RPC (not implemented yet) — direct UPDATEs are rejected',
      old.id, old.progress_source, new.progress_source;
  end if;

  return new;
end;
$$;

revoke execute on function public.protect_goal_progress_source() from public, anon, authenticated;

create or replace trigger protect_goal_progress_source_trg
  before update on public.goals
  for each row execute function public.protect_goal_progress_source();


-- ----------------------------------------------------------------------------
-- Definición del progreso para progress_source = 'habit_logs', por
-- goal_type_snapshot de los habit_logs del hábito vinculado.
--
-- goal_type_snapshot (habit_logs, NOT NULL desde
-- 20260731002637_habit_log_goal_snapshots.sql) identifica, para CADA
-- registro diario, con qué tipo de meta se generó ese registro —
-- necesario porque habits.goal_type puede editarse en cualquier momento
-- (no está versionado como habits_schedules) y mezclar tipos distintos
-- dentro del rango de una goal sería aritméticamente incorrecto (sumar
-- cantidades con unidades distintas, o sumar un conteo booleano con una
-- cantidad numérica).
--
-- Estados incluidos (revisado en esta corrección): SOLO 'completed' y
-- 'partial' aportan a la suma. 'not_completed' y 'not_applicable' quedan
-- explícitamente excluidos (ver punto 5 de las validaciones previas);
-- 'pending' también queda excluido por tratarse de una lista blanca, no de
-- una lista negra.
--
-- SOPORTADOS (fórmula clara, respaldada por el esquema, no inventada):
--   'quantity' / 'duration' / 'repetitions' -> el campo `value` de cada
--   habit_log es, en los tres casos, literalmente el monto numérico
--   registrado ese día para ese tipo de meta (04_SCREEN_SPECIFICATIONS.md,
--   "Input por tipo": "Cantidad: campo numérico. Duración: minutos u
--   horas. Repeticiones: campo numérico."). current_value se define como
--   la SUMA de `value` de los habit_logs con status IN ('completed',
--   'partial') del hábito vinculado, dentro del rango [goals.start_date,
--   goals.end_date]. Se exige DOBLE homogeneidad, no solo de tipo: si
--   dentro del rango existieran logs con más de un goal_type_snapshot
--   distinto (por ejemplo, el hábito cambió de 'quantity' a 'duration' a
--   mitad del rango) O más de un target_unit_snapshot distinto (por
--   ejemplo, cambió de "vasos" a "litros" sin cambiar de goal_type),
--   sumar sus `value` mezclaría unidades de forma incorrecta — cualquiera
--   de los dos casos se trata como NO soportado (ver abajo), nunca se suma
--   a ciegas. La comparación de target_unit_snapshot es segura frente a
--   NULL: se agrupa por el par (goal_type_snapshot, target_unit_snapshot)
--   vía SELECT DISTINCT, y DISTINCT trata dos NULL como el mismo grupo
--   (a diferencia de `=`, que los trataría como desconocido) — así que
--   varios logs con target_unit_snapshot NULL no se rechazan entre sí por
--   error.
--
-- NO SOPORTADOS — se rechaza el recálculo con una excepción explícita, sin
-- fórmula inventada y SIN conservar el current_value anterior como si
-- siguiera vigente (revisado en esta corrección: ya no se deja el valor
-- previo intacto ante estos casos):
--   'boolean' — el input es "Sí/No" (sin campo `value` numérico:
--   habits_goal_type_coherence_chk exige target_value NULL para
--   'boolean'). Ningún documento define qué número representaría el
--   progreso de una meta vinculada a un hábito booleano (¿cuenta de días
--   completados? ¿algo distinto?) — no se infiere.
--   'deadline' — el input es un selector de hora (cumplir antes de una
--   hora límite), tampoco tiene un `value` numérico asociado ni una
--   fórmula de acumulación documentada.
--   'accumulated_days' — a pesar de que su nombre sugiere "contar días",
--   04_SCREEN_SPECIFICATIONS.md solo dice "Días acumulados: registro de
--   avance" (frase deliberadamente ambigua: no aclara si es un valor
--   numérico por día, un checkbox por día, ni cómo se relaciona con el
--   current_value de una `goals` vinculada). Inventar "contar días con
--   status = completed" sería una fórmula no respaldada de forma
--   inequívoca — se reporta como ambigüedad en vez de asumirla.
--
-- Consecuencia práctica (revisada en esta corrección): la función de
-- cálculo compartida de abajo SOLO devuelve un valor cuando TODOS los
-- habit_logs calificados en el rango comparten un único par
-- (goal_type_snapshot, target_unit_snapshot) y ese goal_type_snapshot está
-- en ('quantity', 'duration', 'repetitions'). En cualquier otro caso (tipo
-- no soportado presente, o mezcla de tipos/unidades), la función lanza
-- RAISE EXCEPTION — ya no RAISE WARNING — con un mensaje explícito; esa
-- excepción se propaga hasta abortar la transacción que la originó (la
-- escritura del habit_log, o el intento de UPDATE directo sobre
-- current_value que la disparó), sin dejar nunca current_value en un
-- estado silenciosamente desactualizado. Si no hay ningún habit_log
-- calificado en el rango, no hay ambigüedad posible: el resultado es 0.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- Función interna compartida: public.compute_goal_habit_logs_progress(...)
--
-- Cálculo puro (sin efectos secundarios, no escribe nada) — es la ÚNICA
-- implementación de la fórmula de progreso; tanto recalculate_goal_current_value
-- (que la usa para escribir) como protect_goal_current_value (que la usa
-- para verificar) llaman a esta misma función, evitando dos copias de la
-- lógica que pudieran divergir.
--
-- Agrupa por (goal_type_snapshot, target_unit_snapshot) usando SELECT
-- DISTINCT sobre ambas columnas a la vez: DISTINCT compara con semántica
-- "IS NOT DISTINCT FROM" internamente (dos NULL se consideran el mismo
-- grupo), que es exactamente la comparación segura frente a NULL exigida
-- para target_unit_snapshot — no se necesita una condición IS NOT DISTINCT
-- FROM escrita a mano aparte.
--
-- No es SECURITY DEFINER: solo lee habit_logs, nunca escribe nada; sus dos
-- únicos invocadores (recalculate_goal_current_value y
-- protect_goal_current_value) ya se ejecutan en un contexto con el
-- privilegio adecuado en cada caso (ver justificación de privilegios junto
-- a cada uno), así que esta función hereda ese contexto sin necesitar su
-- propia elevación.
--
-- Sin SQL dinámico. search_path = '' y referencias totalmente calificadas.
-- ----------------------------------------------------------------------------
create or replace function public.compute_goal_habit_logs_progress(
  p_habit_id uuid,
  p_start_date date,
  p_end_date date
)
returns numeric
language plpgsql
set search_path = ''
as $$
declare
  v_distinct_count int;
  v_type public.goal_type;
begin
  select count(*)
  into v_distinct_count
  from (
    select distinct hl.goal_type_snapshot, hl.target_unit_snapshot
    from public.habit_logs hl
    where hl.habit_id = p_habit_id
      and hl.date >= p_start_date
      and (p_end_date is null or hl.date <= p_end_date)
      and hl.status in ('completed', 'partial')
  ) as distinct_pairs;

  if v_distinct_count = 0 then
    -- Ningún habit_log calificado en el rango: sin ambigüedad posible.
    return 0;
  end if;

  if v_distinct_count > 1 then
    raise exception
      'compute_goal_habit_logs_progress: habit % has habit_logs with mixed goal_type_snapshot/target_unit_snapshot combinations in range [%, %]; refusing to sum different types or units',
      p_habit_id, p_start_date, p_end_date;
  end if;

  select hl.goal_type_snapshot
  into v_type
  from public.habit_logs hl
  where hl.habit_id = p_habit_id
    and hl.date >= p_start_date
    and (p_end_date is null or hl.date <= p_end_date)
    and hl.status in ('completed', 'partial')
  limit 1;

  if v_type not in ('quantity', 'duration', 'repetitions') then
    raise exception
      'compute_goal_habit_logs_progress: goal_type_snapshot % has no approved progress formula (habit %, range [%, %])',
      v_type, p_habit_id, p_start_date, p_end_date;
  end if;

  return coalesce(
    (
      select sum(hl.value)
      from public.habit_logs hl
      where hl.habit_id = p_habit_id
        and hl.date >= p_start_date
        and (p_end_date is null or hl.date <= p_end_date)
        and hl.status in ('completed', 'partial')
    ),
    0
  );
end;
$$;

revoke execute on function public.compute_goal_habit_logs_progress(uuid, date, date) from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- Función central de recálculo: public.recalculate_goal_current_value(uuid)
--
-- Retorna void: esta función existe puramente por su efecto secundario
-- (actualizar goals.current_value cuando aplica). Un caller interesado en
-- el valor vigente debe hacer un SELECT fresco sobre goals después de
-- invocarla.
--
-- No es SECURITY DEFINER (revisado en esta corrección — antes lo era, para
-- poder escribir current_value sin depender de un contexto de confianza en
-- el trigger protector; ese mecanismo ya no existe). Ya no necesita
-- privilegio elevado propio: se invoca exclusivamente (a) desde
-- public.sync_goal_progress_from_habit_log() (reacciona a cambios en
-- habit_logs) o (b) desde public.sync_goal_progress_from_goal_change()
-- (reacciona a cambios en goals.habit_id/start_date/end_date, agregada en
-- esta corrección) — ambas SÍ son SECURITY DEFINER y por lo tanto ya
-- ejecutan este cuerpo bajo un current_user elevado (heredado, no
-- declarado aquí) — o (c) desde el DO block de backfill de esta misma
-- migración, ejecutado directamente por el rol propietario de la
-- migración. En los tres casos el UPDATE de más abajo ya corre con
-- privilegio suficiente sin declarar "security definer" en esta función.
--
-- Bloqueo con FOR UPDATE sobre la propia fila de goals (se conserva):
-- serializa recálculos concurrentes de la MISMA meta, mismo patrón usado
-- en change_habit_schedule (habit_schedules.sql).
--
-- Ya NO usa ninguna variable de configuración (`app.goal_recalc_active`
-- fue eliminada en esta corrección): el UPDATE de current_value de más
-- abajo dispara igualmente a protect_goal_current_value_trg, que verifica
-- de forma independiente el valor escrito llamando a esta misma fórmula
-- (compute_goal_habit_logs_progress) — como ambos usan la fórmula
-- idéntica con los mismos parámetros, la verificación siempre coincide
-- para una escritura legítima, sin necesitar ninguna bandera de "contexto
-- de confianza". Si compute_goal_habit_logs_progress lanza una excepción
-- (tipo no soportado o mezcla), esa excepción ocurre AQUÍ, antes de llegar
-- siquiera al UPDATE — se propaga tal cual hasta abortar la transacción
-- que originó este recálculo.
-- ----------------------------------------------------------------------------
create or replace function public.recalculate_goal_current_value(p_goal_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_goal public.goals%rowtype;
  v_new_value numeric;
begin
  select * into v_goal from public.goals where id = p_goal_id for update;

  -- 1. Localizar la meta. Si no existe (borrada entre la detección y la
  -- ejecución, condición de carrera benigna), no hay nada que recalcular.
  if v_goal.id is null then
    return;
  end if;

  -- 2. Ignorar metas que no sean progress_source = 'habit_logs'.
  if v_goal.progress_source <> 'habit_logs' then
    return;
  end if;

  -- 3-6. Calcular el progreso mediante la función compartida. Si el rango
  -- contiene un tipo no soportado o una mezcla de tipos/unidades, esta
  -- llamada lanza una excepción explícita en vez de devolver un número —
  -- se deja propagar sin capturarla, abortando la transacción que disparó
  -- este recálculo (no se conserva el current_value anterior como si
  -- siguiera vigente).
  v_new_value := public.compute_goal_habit_logs_progress(
    v_goal.habit_id, v_goal.start_date, v_goal.end_date
  );

  -- 7-8. Actualizar goals.current_value desde el servidor. El cliente no
  -- participa en este cálculo en ningún punto. El UPDATE solo toca
  -- current_value: habit_id, user_id, status, goal_lifecycle_status y el
  -- resto de columnas de la fila quedan exactamente como estaban (no se
  -- listan en el SET). validate_goal_habit_ownership_trg (BEFORE UPDATE)
  -- se reevalúa igualmente con los mismos habit_id/user_id de siempre, por
  -- lo que pasa trivialmente. set_goals_updated_at (BEFORE UPDATE) sigue
  -- actualizando updated_at con su propia lógica existente, sin cambios.
  -- protect_goal_current_value_trg (BEFORE UPDATE, definida más abajo)
  -- también se dispara y recalcula el mismo valor de forma independiente
  -- para verificarlo — ver su propia documentación.
  update public.goals set current_value = v_new_value where id = p_goal_id;
end;
$$;

-- Función interna: solo debe invocarse desde
-- public.sync_goal_progress_from_habit_log(), public.sync_goal_progress_from_goal_change()
-- (ambas más abajo) o desde el DO block de backfill de current_value de
-- esta misma migración — ninguno de los tres casos requiere GRANT
-- explícito (ver justificación de privilegios junto a cada trigger).
-- Revocado de PUBLIC, anon y authenticated; no se concede a service_role
-- tampoco: no es necesario
-- para que el mecanismo funcione, y otorgarlo permitiría invocarla
-- directamente como RPC arbitraria sobre cualquier goal_id sin ninguna
-- validación de propiedad — esta función deliberadamente no valida
-- auth.uid() porque no está diseñada para ser invocada directamente por un
-- cliente.
revoke execute on function public.recalculate_goal_current_value(uuid) from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- Trigger de sincronización sobre habit_logs:
-- public.sync_goal_progress_from_habit_log()
--
-- AFTER INSERT OR UPDATE OR DELETE, FOR EACH ROW: se ejecuta después de
-- que la fila de habit_logs ya quedó escrita y validada (después de los
-- triggers BEFORE existentes: set_habit_log_goal_snapshot_trg,
-- protect_habit_log_goal_snapshot_trg, set_habit_logs_updated_at) — así se
-- lee siempre el estado final y consistente de la fila, sin interferir con
-- esos triggers ni depender de su orden relativo entre sí.
--
-- SECURITY DEFINER (con set search_path = '' y referencias totalmente
-- calificadas): necesario específicamente para que la llamada interna a
-- recalculate_goal_current_value() más abajo funcione sin necesitar un
-- GRANT EXECUTE explícito a `authenticated`/`service_role` sobre esa
-- función. Motivo (no evidente, documentado explícitamente): dentro de una
-- función SECURITY DEFINER, el rol efectivo (current_user) para el resto
-- de su cuerpo — incluyendo las funciones que ella misma invoca — pasa a
-- ser el propietario de la función (el rol que aplicó esta migración), no
-- el rol que originó el INSERT/UPDATE/DELETE sobre habit_logs. Como esta
-- función y recalculate_goal_current_value() son creadas por el mismo
-- propietario, este puede invocar la segunda sin necesitar GRANT alguno
-- (el propietario de un objeto siempre tiene acceso implícito a él). El
-- propio disparo de este trigger tampoco requiere EXECUTE del rol que
-- escribe el habit_log — eso nunca dependió de GRANT/REVOKE.
--
-- Que esta función lea directamente public.goals bajo privilegio elevado
-- (bypass de RLS por ser SECURITY DEFINER) no expone datos de otros
-- usuarios: solo se consultan metas cuyo habit_id coincide EXACTAMENTE con
-- el de la fila de habit_logs que disparó el trigger — y esa fila ya tuvo
-- que pasar la política RLS de habit_logs (dueño del hábito) para llegar
-- hasta aquí. Como validate_goal_habit_ownership_trg garantiza que toda
-- goals.habit_id pertenece al mismo user_id que el hábito, cualquier meta
-- que coincida por habit_id pertenece, por construcción, al mismo usuario
-- que ya era dueño legítimo del habit_log escrito.
--
-- No hay riesgo de recursión: el UPDATE que hace recalculate_goal_current_value
-- sobre goals no toca habit_logs en ningún punto, por lo que no puede
-- volver a disparar este mismo trigger. Los triggers existentes de goals
-- (set_goals_updated_at, validate_goal_habit_ownership_trg) tampoco tocan
-- habit_logs.
--
-- Estrategia ante INSERT/UPDATE/DELETE:
--   INSERT -> recalcula las metas afectadas por NEW.habit_id.
--   DELETE -> recalcula las metas afectadas por OLD.habit_id.
--   UPDATE -> si NEW.habit_id IS DISTINCT FROM OLD.habit_id, recalcula las
--             metas afectadas tanto por OLD.habit_id como por NEW.habit_id
--             (el log "salió" de las metas del hábito anterior y "entró" a
--             las del nuevo). Si no cambió, recalcula solo una vez las
--             metas de ese habit_id — evita el recálculo duplicado exigido
--             por el encargo sin necesidad de una estructura de
--             deduplicación aparte.
--   No se filtra por si OLD.date/NEW.date cae dentro del rango de cada
--   meta antes de decidir qué metas recalcular: se recalculan TODAS las
--   metas progress_source = 'habit_logs' del/de los habit_id afectado(s),
--   sin importar si la fecha del log concreto cae dentro de su rango.
--   Motivo: recalculate_goal_current_value() vuelve a agregar el rango
--   completo de cada meta desde cero (no aplica un delta incremental), por
--   lo que es idempotente y siempre correcto — un pre-filtro por fecha
--   sería una optimización, no una necesidad de corrección, y además sería
--   fácil de hacer mal (un cambio de fecha que saca un log del rango de
--   una meta también debe disparar su recálculo, no solo un cambio que lo
--   mete). El encargo prioriza consistencia sobre microoptimización.
-- ----------------------------------------------------------------------------
create or replace function public.sync_goal_progress_from_habit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_habit_ids uuid[];
  v_goal_id uuid;
begin
  if tg_op = 'DELETE' then
    v_habit_ids := array[old.habit_id];
  elsif tg_op = 'INSERT' then
    v_habit_ids := array[new.habit_id];
  else
    if new.habit_id is distinct from old.habit_id then
      v_habit_ids := array[old.habit_id, new.habit_id];
    else
      v_habit_ids := array[new.habit_id];
    end if;
  end if;

  for v_goal_id in
    select id from public.goals
    where habit_id = any(v_habit_ids)
      and progress_source = 'habit_logs'
  loop
    perform public.recalculate_goal_current_value(v_goal_id);
  end loop;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

-- Función de trigger: solo debe invocarse vía trigger, nunca como RPC
-- directa. El disparo del trigger no requiere EXECUTE del rol que escribe
-- el habit_log (no depende de este GRANT/REVOKE en absoluto).
revoke execute on function public.sync_goal_progress_from_habit_log() from public, anon, authenticated;

create or replace trigger sync_goal_progress_from_habit_log_trg
  after insert or update or delete on public.habit_logs
  for each row execute function public.sync_goal_progress_from_habit_log();


-- ----------------------------------------------------------------------------
-- Protección de goals.current_value: public.protect_goal_current_value()
--
-- Revisada en esta corrección: ya NO se apoya en ninguna variable de
-- configuración ("contexto de confianza") como única autorización. En su
-- lugar implementa una garantía más fuerte — recálculo y comparación —
-- usando la MISMA función compartida (compute_goal_habit_logs_progress)
-- que usa recalculate_goal_current_value para escribir. No importa quién
-- ejecute el UPDATE ni desde dónde: el único criterio de aceptación para
-- una meta 'habit_logs' es que el current_value propuesto sea
-- MATEMÁTICAMENTE IDÉNTICO al que la fórmula server-side produce para esa
-- fila en este momento.
--
-- BEFORE UPDATE, FOR EACH ROW. SECURITY DEFINER (revisado — antes no lo
-- era): necesario por dos razones, no solo por privilegio de lectura:
--   1. Que la verificación sea válida independientemente de RLS: si en el
--      futuro la política de habit_logs cambiara y ya no garantizara por
--      transitividad que el dueño de la meta puede leer sus propios
--      habit_logs, esta protección seguiría funcionando igual — no
--      depende de esa cadena de RLS para operar correctamente.
--   2. Producir siempre el mensaje de error explícito de esta función en
--      vez de un "permission denied" genérico si en algún momento se
--      restringe aún más el acceso a compute_goal_habit_logs_progress —
--      esta función, al ejecutar bajo su propio propietario, siempre
--      puede invocar esa función compartida sin depender de GRANT alguno.
-- search_path = '' y referencias totalmente calificadas. Sin SQL dinámico.
-- No escribe nada por sí misma (ni siquiera dentro de la rama que acepta
-- el cambio: se limita a devolver NEW) — no hay riesgo de recursión.
--
-- Comportamiento por progress_source (evaluado sobre OLD.progress_source,
-- el valor vigente antes de este UPDATE — protect_goal_progress_source_trg,
-- definida más arriba, ya garantiza que progress_source no pudo cambiar en
-- este mismo UPDATE, así que OLD y NEW coinciden en este campo):
--   'manual'     -> el cambio de current_value se permite siempre (opción
--                 A del encargo para metas manuales: editable directamente
--                 por el dueño). Sin verificación adicional.
--   'calculated' -> CUALQUIER cambio persistido de current_value se
--                 rechaza, sin excepción y sin necesidad de recalcular
--                 nada: no existe ninguna fórmula aprobada para
--                 'calculated' (ver sección dedicada más abajo), por lo
--                 que ningún valor almacenado puede considerarse la fuente
--                 real — ni siquiera uno que "coincida" con algo, porque
--                 no hay nada con qué compararlo.
--   'habit_logs' -> se recalcula el valor esperado llamando a
--                 compute_goal_habit_logs_progress(NEW.habit_id,
--                 NEW.start_date, NEW.end_date) y se compara contra
--                 NEW.current_value con IS DISTINCT FROM (seguro frente a
--                 NULL). Si no coincide exactamente, se rechaza con una
--                 excepción explícita. Si compute_goal_habit_logs_progress
--                 lanza su propia excepción (tipo no soportado o mezcla de
--                 tipos/unidades en el rango), esa excepción se propaga
--                 tal cual — también un rechazo, con un mensaje distinto
--                 pero igual de explícito.
--   (else)       -> rama defensiva: si progress_source tuviera algún día
--                 un valor no contemplado arriba, se rechaza explícitamente
--                 en vez de aceptar el cambio por omisión.
-- ----------------------------------------------------------------------------
create or replace function public.protect_goal_current_value()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expected numeric;
begin
  if new.current_value is distinct from old.current_value then
    if old.progress_source = 'manual' then
      return new;
    elsif old.progress_source = 'calculated' then
      raise exception
        'goals: current_value cannot be persisted for progress_source = calculated (goal %); no approved calculation formula exists — this column has no legitimate write path for calculated goals',
        old.id;
    elsif old.progress_source = 'habit_logs' then
      v_expected := public.compute_goal_habit_logs_progress(
        new.habit_id, new.start_date, new.end_date
      );

      if new.current_value is distinct from v_expected then
        raise exception
          'goals: current_value (%) does not match the value recalculated from habit_logs (%) for goal % (progress_source = habit_logs); current_value is maintained automatically and direct writes are rejected',
          new.current_value, v_expected, old.id;
      end if;
    else
      raise exception
        'goals: unrecognized progress_source % for goal % while validating current_value',
        old.progress_source, old.id;
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.protect_goal_current_value() from public, anon, authenticated;

create or replace trigger protect_goal_current_value_trg
  before update on public.goals
  for each row execute function public.protect_goal_current_value();


-- ----------------------------------------------------------------------------
-- Sincronización ante cambios en la propia meta:
-- public.sync_goal_progress_from_goal_change()
--
-- Problema que corrige (confirmado): sync_goal_progress_from_habit_log_trg
-- (más arriba) solo recalcula current_value cuando cambia un habit_log —
-- pero una meta 'habit_logs' también puede quedar desactualizada si
-- CAMBIA SU PROPIA fuente/rango (habit_id, start_date o end_date) sin que
-- ningún habit_log se haya tocado: por ejemplo, reasignar la meta a otro
-- hábito, o ampliar/acortar su rango de fechas. Sin este trigger,
-- current_value seguiría reflejando el hábito o rango ANTERIOR hasta el
-- próximo habit_log escrito, lo cual podría no ocurrir nunca.
--
-- AFTER UPDATE OF habit_id, start_date, end_date ON public.goals, FOR EACH
-- ROW: Postgres solo dispara un trigger con esta cláusula "OF <columnas>"
-- cuando el UPDATE en cuestión incluye alguna de esas columnas en su lista
-- de asignación (SET) — evaluado de forma puramente sintáctica sobre la
-- sentencia, no sobre si el valor realmente cambió. Por eso, dentro de la
-- función, se vuelve a comprobar con IS DISTINCT FROM que al menos una de
-- las tres realmente cambió de valor (un UPDATE que reasigna habit_id al
-- mismo valor que ya tenía, por ejemplo, no debería disparar un recálculo
-- innecesario).
--
-- Se ejecuta únicamente cuando NEW.progress_source = 'habit_logs': para
-- 'manual'/'calculated' no hay ningún recálculo automático que hacer (la
-- primera acepta ediciones directas de current_value; la segunda no tiene
-- fórmula). protect_goal_progress_source_trg (más arriba) ya garantiza que
-- progress_source no puede cambiar en este mismo UPDATE, así que evaluar
-- NEW.progress_source aquí es equivalente a evaluar OLD.progress_source.
--
-- SECURITY DEFINER: necesario por el mismo motivo exacto que
-- sync_goal_progress_from_habit_log — invoca
-- public.recalculate_goal_current_value(new.id), y esa función tiene
-- EXECUTE revocado de authenticated/anon/PUBLIC. Sin elevar aquí, un
-- UPDATE directo del cliente sobre start_date/end_date/habit_id (un caso
-- de uso legítimo y común: el usuario edita el rango de su propia meta)
-- fallaría con "permission denied" en vez de disparar el recálculo. Al
-- ejecutar bajo su propio propietario, esta función puede invocar
-- recalculate_goal_current_value() sin necesitar ningún GRANT adicional
-- (mismo razonamiento de acceso implícito de propietario documentado junto
-- a sync_goal_progress_from_habit_log).
--
-- search_path = '' y referencias totalmente calificadas (public.goals,
-- public.recalculate_goal_current_value). Sin SQL dinámico. No modifica
-- goal_status ni goal_lifecycle_status — su único efecto es, cuando
-- corresponde, invocar el recálculo de current_value; no escribe ninguna
-- columna por sí misma.
--
-- Cómo evita recursión (sin necesitar ninguna bandera ni comprobación
-- adicional): recalculate_goal_current_value() ejecuta internamente
-- `update public.goals set current_value = v_new_value where id = ...` —
-- esa sentencia SOLO asigna current_value en su lista SET. Como este
-- trigger está delimitado a "AFTER UPDATE OF habit_id, start_date,
-- end_date", Postgres ni siquiera lo evalúa para una sentencia que no
-- toca ninguna de esas tres columnas — la recursión queda excluida por la
-- propia definición sintáctica del trigger, no por una condición en
-- tiempo de ejecución que pudiera fallar.
-- ----------------------------------------------------------------------------
create or replace function public.sync_goal_progress_from_goal_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.progress_source = 'habit_logs'
     and (
       new.habit_id is distinct from old.habit_id
       or new.start_date is distinct from old.start_date
       or new.end_date is distinct from old.end_date
     )
  then
    perform public.recalculate_goal_current_value(new.id);
  end if;

  return new;
end;
$$;

-- Función de trigger: solo debe invocarse vía trigger, nunca como RPC
-- directa. El disparo del trigger no requiere EXECUTE del rol que ejecuta
-- el UPDATE sobre goals (no depende de este GRANT/REVOKE en absoluto).
revoke execute on function public.sync_goal_progress_from_goal_change() from public, anon, authenticated;

create or replace trigger sync_goal_progress_from_goal_change_trg
  after update of habit_id, start_date, end_date on public.goals
  for each row execute function public.sync_goal_progress_from_goal_change();


-- ----------------------------------------------------------------------------
-- Metas 'calculated': sin función de lectura todavía.
--
-- public.get_calculated_goal_progress(p_goal_id uuid) NO se crea en esta
-- migración. El único ejemplo documentado ("meta general de 80 % de
-- cumplimiento mensual sobre varios hábitos", D-05) no especifica de forma
-- inequívoca sobre qué conjunto de hábitos, con qué ventana temporal ni con
-- qué ponderación se calcularía ese porcentaje — y el propio D-05 deja
-- explícitamente pendiente de confirmación si el producto necesita este
-- tipo de meta más allá de esa meta general ya existente en los mocks
-- (pregunta P-05, sin responder). Inventar una fórmula agregada aquí
-- violaría directamente el mandato de no inventar reglas no respaldadas.
--
-- 'calculated' queda modelado en el enum (para que progress_source pueda
-- representarlo cuando el producto lo defina) y su current_value queda
-- protegido por protect_goal_current_value_trg — con una regla incluso más
-- estricta que la de 'habit_logs': para 'calculated' se rechaza CUALQUIER
-- cambio persistido de current_value, sin excepción, porque no existe
-- ninguna fórmula contra la que verificar un valor propuesto (a diferencia
-- de 'habit_logs', que sí puede compararse contra un cálculo real). La
-- función de cálculo queda pendiente por falta de definición funcional —
-- reportado aquí y en el reporte de entrega, no implementado.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- Backfill de current_value para metas existentes con
-- progress_source = 'habit_logs'.
--
-- Se ejecuta después de que progress_source ya es NOT NULL y después de
-- que toda la maquinaria (función compartida de cálculo, función de
-- recálculo y los tres triggers) ya existe. El orden entre "crear
-- protect_goal_current_value_trg" y "ejecutar este backfill" no afecta la
-- corrección: cada llamada a recalculate_goal_current_value() calcula el
-- valor mediante compute_goal_habit_logs_progress() y lo escribe; el
-- trigger protector, al disparar, recalcula el mismo valor con la misma
-- función y siempre coincide (misma fórmula, mismos parámetros) — no
-- depende de ningún orden de creación entre objetos, a diferencia del bug
-- de orden corregido en 20260731002637_habit_log_goal_snapshots.sql.
--
-- No sobrescribe metas 'manual' (el WHERE las excluye explícitamente). No
-- persiste ningún valor para 'calculated' (el WHERE de este backfill ya
-- las excluye; tampoco podría, dado que protect_goal_current_value_trg
-- rechaza cualquier persistencia de current_value para ese tipo). Procesa
-- varias metas por hábito de forma natural: el bucle recorre cada
-- goals.id individualmente, sin asumir una sola meta por habit_id.
-- Determinismo: la fórmula (SUMA de value, o 0 sin logs calificados)
-- depende únicamente del contenido actual de habit_logs/goals — mismas
-- filas producen siempre el mismo resultado.
--
-- Revisado en esta corrección — consecuencia importante: si alguna meta
-- 'habit_logs' preexistente tiene, en su rango, habit_logs con un
-- goal_type_snapshot no soportado o con tipos/unidades mezclados,
-- compute_goal_habit_logs_progress() lanza una excepción — YA NO se
-- reporta con un simple RAISE WARNING dejando el current_value anterior
-- intacto. Esa excepción se propaga sin capturarla, lo que hace que ESTE
-- BLOQUE DO (y por lo tanto la migración completa) falle si existe algún
-- dato preexistente en ese estado. Esto es intencional y consistente con
-- el resto del comportamiento de esta migración (nunca se deja un
-- current_value desactualizado pasar como si fuera válido) — pero implica
-- que, si la base tuviera datos reales en ese estado ambiguo, esta
-- migración NO se aplicaría hasta resolver esos datos primero. Reportado
-- explícitamente en el reporte de entrega, no se trabaja alrededor de ello
-- silenciosamente.
-- ----------------------------------------------------------------------------
do $$
declare
  v_goal_id uuid;
begin
  for v_goal_id in
    select id from public.goals where progress_source = 'habit_logs'
  loop
    perform public.recalculate_goal_current_value(v_goal_id);
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- Índices.
-- ----------------------------------------------------------------------------

-- Soporta la consulta real de sync_goal_progress_from_habit_log():
-- `where habit_id = any(...) and progress_source = 'habit_logs'`. No se
-- agrega start_date/end_date a este índice porque ninguna consulta de esta
-- migración filtra por esas columnas (el trigger recalcula todas las metas
-- que coincidan por habit_id + progress_source, sin pre-filtrar por rango
-- — ver justificación en la sección del trigger). Si una futura
-- optimización agrega ese pre-filtro, este índice debería extenderse
-- entonces, no antes.
create index if not exists goals_habit_id_progress_source_idx
  on public.goals (habit_id, progress_source);

-- No se agrega ningún índice sobre goal_lifecycle_status/status: ninguna
-- consulta de esta migración filtra por esas columnas.
-- No se agrega ningún índice nuevo sobre habit_logs: la agregación de
-- recalculate_goal_current_value() ya se apoya en los índices existentes
-- de init_schema.sql (habit_logs_habit_id_idx, habit_logs_date_idx); un
-- índice compuesto (habit_id, date) sería una optimización razonable a
-- futuro, pero está fuera del alcance explícito de esta migración (la
-- sección de índices del encargo solo pide evaluar índices sobre goals).


-- ----------------------------------------------------------------------------
-- goal_status: sin cambios automáticos.
--
-- recalculate_goal_current_value() únicamente escribe goals.current_value.
-- No hay ningún punto en esta migración que lea o modifique goals.status
-- ni goals.goal_lifecycle_status — D-05 no exige inequívocamente que
-- cambiar current_value deba alterar status (por ejemplo, marcar
-- automáticamente 'completed' al alcanzar target_value no está
-- especificado ni pedido), y el encargo lo excluye explícitamente
-- ("cambios automáticos de goal_status" en exclusiones).
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- Revisión de RLS (sin modificarla en esta migración, por alcance
-- explícito del encargo).
--
-- Confirmado que los triggers/funciones de esta migración SÍ pueden operar
-- bajo las políticas RLS actuales: ambas están diseñadas para no depender
-- de que RLS sea permisiva o restrictiva (SECURITY DEFINER bypasea RLS
-- deliberadamente para las escrituras/lecturas internas, con el
-- razonamiento de scoping-por-habit_id documentado junto a
-- sync_goal_progress_from_habit_log más arriba) — el mecanismo es robusto
-- incluso si una futura migración de RLS hardening endurece las políticas
-- de goals/habit_logs, siempre que esa migración no revoque las funciones
-- SECURITY DEFINER en sí mismas.
--
-- Puntos que deberán cerrarse en la futura migración rls_hardening
-- (reportados, no implementados aquí):
--   1. progress_source SÍ queda protegido contra reclasificación directa
--      en esta corrección (protect_goal_progress_source_trg) — la
--      política "Goals are manageable by owner" (FOR ALL) sigue sin
--      distinguir columnas a nivel de RLS, pero ya no importa para este
--      caso concreto: el trigger de PostgreSQL bloquea el cambio
--      independientemente de lo permisiva que sea la política. current_value
--      queda protegido por el mismo motivo (recálculo-y-comparación), sin
--      depender de RLS en ningún punto.
--   2. La política "Goals are manageable by owner" sigue sin distinguir
--      columnas para el resto de escrituras de goals (título, descripción,
--      fechas, etc.) — coherente con el hallazgo ya documentado en
--      20260731002637_habit_log_goal_snapshots.sql sobre habit_logs, y con
--      H-05/H-10/H-17/H-18/H-19/D-06 ya pendientes para esa migración
--      futura. Esto no representa un riesgo para progress_source ni
--      current_value específicamente (ya protegidos por trigger), solo
--      para el resto de columnas de goals.
--   3. La política "Habit logs manageable by owner" no requirió ningún
--      ajuste para esta migración — el trigger de sincronización no
--      depende de ella (SECURITY DEFINER), y no se identificó ningún
--      bloqueo técnico que exigiera modificarla ahora.
-- No se propuso ni se aplicó ninguna modificación mínima de RLS: no fue
-- necesaria para que este mecanismo funcione.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- Riesgos y ambigüedades (resumen; detalle en las secciones
-- correspondientes de más arriba).
--
-- 1. Sin DEFAULT en goals.progress_source: cualquier INSERT futuro que no
--    envíe explícitamente progress_source fallará por violación NOT NULL.
--    El frontend actual (05_DATA_MODELS_AND_MOCKS.md, interfaz Goal) no
--    conoce este campo todavía. Esta migración NO agrega un trigger de
--    auto-derivación en INSERT porque no fue solicitado explícitamente y
--    habría sido una pieza de lógica nueva no pedida por el encargo — se
--    reporta como consecuencia directa a resolver junto con la
--    actualización del frontend/servicios que escriben goals, no se
--    trabaja alrededor de ella silenciosamente.
-- 2. goal_type 'boolean', 'deadline' y 'accumulated_days' no tienen
--    fórmula de progreso implementada para progress_source = 'habit_logs'
--    — ver sección "Definición del progreso" más arriba. Revisado en esta
--    corrección: metas vinculadas a hábitos de estos tipos (o con
--    goal_type_snapshot/target_unit_snapshot mezclados en el rango) ya NO
--    conservan su current_value anterior en silencio — cualquier intento
--    de recalcularlas (disparado por un habit_log nuevo/editado/eliminado,
--    o por el backfill de esta misma migración) lanza una excepción
--    explícita hasta que exista una definición funcional aprobada. Esto
--    puede llegar a bloquear la escritura de habit_logs para hábitos en
--    esa situación — ver también el aviso en la sección de backfill sobre
--    el riesgo de que la migración misma falle si ya existen datos así.
-- 3. 'calculated' no tiene función de lectura (get_calculated_goal_progress)
--    por falta de fórmula aprobada — ver sección dedicada más arriba. Su
--    current_value queda protegido de forma incondicional (ningún cambio
--    persistido se acepta nunca, ver protect_goal_current_value).
-- 4. Clasificación 'manual' para filas preexistentes con habit_id NULL es
--    una decisión conservadora explícita, no una certeza — documentada en
--    la sección de backfill.
-- 5. progress_source SÍ queda protegido contra reclasificación directa del
--    cliente en esta corrección (protect_goal_progress_source_trg,
--    BEFORE UPDATE) — reclasificar una meta existente requiere una RPC
--    controlada futura, no implementada todavía (fuera de alcance de esta
--    migración).
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- Exclusiones confirmadas: no se implementa ventana de edición de 7 días,
-- cambios finales de RLS, habit_goal_versions, cambios en snapshots,
-- estadísticas completas, cambios automáticos de goal_status,
-- notificaciones, preferred_time, minimum_target, ideal_target, ni
-- frontend. No se modifica habit_schedules, categories lifecycle, goals
-- lifecycle (goal_lifecycle_status), columnas snapshot ya creadas, ni
-- políticas de otras tablas.
-- ----------------------------------------------------------------------------
