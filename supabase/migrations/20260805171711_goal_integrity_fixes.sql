-- ============================================================================
-- Migración: goal_integrity_fixes
-- Origen: auditoría previa (sin cambios de código) de dos hallazgos reales
-- detectados durante las pruebas en vivo del CRUD de metas (MDs/12_BACKEND_
-- INTEGRATION_SETUP.md, sección "CRUD real de metas"):
--
--   Hallazgo 1 — al crear una meta progress_source='habit_logs' vinculada a
--   un hábito que YA tenía habit_logs calificados dentro de su rango,
--   current_value nacía en 0 (el DEFAULT de la columna) en vez de reflejar
--   ese historial — porque ningún trigger existente reacciona al INSERT de
--   la propia goals: sync_goal_progress_from_habit_log_trg es AFTER
--   INSERT/UPDATE/DELETE ON habit_logs (reacciona a los logs, no a la
--   meta) y sync_goal_progress_from_goal_change_trg es AFTER UPDATE OF
--   habit_id/start_date/end_date ON goals — "UPDATE OF" nunca se dispara
--   en un INSERT, por diseño de PostgreSQL.
--
--   Hallazgo 2 — nada en la base de datos impedía crear (ni editar) una
--   meta progress_source='habit_logs' vinculada a un hábito boolean/
--   deadline/accumulated_days (sin fórmula de progreso aprobada, D-05). El
--   único rechazo real ocurría tarde: al escribir el primer habit_log
--   calificado de ese hábito, dentro de compute_goal_habit_logs_progress.
--   goals_progress_source_habit_id_coherence_chk (database_integrity.sql)
--   solo valida que habit_id no sea nulo para 'habit_logs' — un CHECK
--   constraint no puede consultar habits.goal_type (no admite subconsultas
--   a otra tabla), así que esa validación nunca pudo vivir ahí.
--
-- Alcance: agrega EXCLUSIVAMENTE dos funciones trigger y sus dos triggers
-- correspondientes sobre public.goals. No modifica ninguna función,
-- trigger, política RLS, GRANT, columna, constraint, enum ni migración
-- existente. No agrega columnas, tablas, índices ni RPC de cliente. No
-- inventa ninguna fórmula de progreso nueva. No hace backfill ni toca
-- datos existentes.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- HALLAZGO 2 — Validación temprana de goal_type soportado.
--
-- public.validate_goal_habit_logs_goal_type()
--
-- BEFORE INSERT OR UPDATE ON public.goals, FOR EACH ROW. Solo actúa cuando
-- NEW.progress_source = 'habit_logs' AND NEW.habit_id IS NOT NULL — para
-- 'manual'/'calculated', o para 'habit_logs' con habit_id NULL (estado ya
-- imposible por goals_progress_source_habit_id_coherence_chk, pero la
-- condición se comprueba explícitamente de todas formas, sin asumir), esta
-- función no hace nada.
--
-- Únicos goal_type aceptados: 'quantity', 'duration', 'repetitions' — la
-- MISMA lista blanca ya usada por compute_goal_habit_logs_progress()
-- (20260731004632_goal_progress_source.sql) y por
-- SUPPORTED_HABIT_LOGS_GOAL_TYPES en src/services/goals.service.ts. No se
-- inventa ninguna fórmula nueva: esta función no calcula nada, solo decide
-- si la combinación (progress_source, goal_type del hábito) tiene sentido
-- ANTES de que la fila llegue a existir.
--
-- SECURITY INVOKER (por defecto, sin "security definer") — decisión
-- deliberada, no una omisión. Mismo patrón exacto ya usado por
-- set_habit_log_goal_snapshot() (20260731002637_habit_log_goal_snapshots.sql)
-- y por la propia validate_goal_habit_ownership() (sin SECURITY DEFINER,
-- database_integrity.sql) sobre esta misma tabla: la consulta a
-- public.habits queda sujeta a la política RLS vigente del cliente que
-- ejecuta el INSERT/UPDATE ("Habits are selectable by owner", auth.uid() =
-- user_id). Efecto deseado: si NEW.habit_id pertenece a OTRO usuario (o no
-- existe), RLS filtra la fila y la consulta no devuelve nada — esta
-- función entonces NO HACE NADA (no valida ni rechaza), dejando esa
-- decisión enteramente a validate_goal_habit_ownership_trg, que sí conoce
-- la semántica correcta de "hábito ajeno" y no expone si ese habit_id
-- existe ni cuál sería su goal_type. Usar SECURITY DEFINER aquí (bypasear
-- RLS para "ver" hábitos ajenos) sería CONTRAPRODUCENTE: permitiría a esta
-- función leer el goal_type de un hábito de otro usuario y, en el caso
-- (hábito ajeno + tipo no soportado), rechazar con un mensaje sobre
-- "goal_type no soportado" en vez de con el mensaje correcto de
-- "propiedad" — una fuga de información menor pero real e innecesaria.
-- Con SECURITY INVOKER, ese caso lo resuelve siempre
-- validate_goal_habit_ownership_trg, con el mensaje correcto, sin
-- importar en qué orden alfabético se ejecuten ambos triggers.
--
-- set search_path = '' y referencias totalmente calificadas
-- (public.habits). Sin SQL dinámico, sin WHEN OTHERS: la única excepción
-- que esta función puede lanzar es la explícita de "tipo no soportado".
-- No modifica progress_source, habit_id, current_value, status ni
-- goal_lifecycle_status — no escribe ninguna columna, solo puede devolver
-- NEW sin cambios o abortar con RAISE EXCEPTION.
-- ----------------------------------------------------------------------------
create or replace function public.validate_goal_habit_logs_goal_type()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_goal_type public.goal_type;
begin
  if new.progress_source is distinct from 'habit_logs' or new.habit_id is null then
    return new;
  end if;

  -- SECURITY INVOKER: esta consulta está sujeta a la RLS del cliente. Si
  -- NEW.habit_id no pertenece al usuario autenticado (o no existe), no
  -- devuelve fila alguna — se trata igual que "no hay nada que validar
  -- aquí", dejando el rechazo real a validate_goal_habit_ownership_trg.
  select h.goal_type
  into v_goal_type
  from public.habits h
  where h.id = new.habit_id;

  if not found then
    return new;
  end if;

  if v_goal_type not in ('quantity', 'duration', 'repetitions') then
    raise exception 'goals: habit_logs progress is not supported for habit goal_type %', v_goal_type
      using detail = format('goal %s, habit %s, progress_source habit_logs requires goal_type in (quantity, duration, repetitions)', new.id, new.habit_id);
  end if;

  return new;
end;
$$;

-- Función de trigger: solo debe invocarse vía trigger, nunca como RPC
-- directa. Revocado de PUBLIC, anon y authenticated — el disparo del
-- trigger no requiere EXECUTE del rol que ejecuta el INSERT/UPDATE (no
-- depende de este GRANT/REVOKE en absoluto). Sin GRANT a nadie: nadie
-- necesita invocarla directamente.
revoke execute on function public.validate_goal_habit_logs_goal_type() from public, anon, authenticated;

create or replace trigger validate_goal_habit_logs_goal_type_trg
  before insert or update on public.goals
  for each row execute function public.validate_goal_habit_logs_goal_type();


-- ----------------------------------------------------------------------------
-- HALLAZGO 1 — Recálculo al crear una meta habit_logs.
--
-- public.sync_goal_progress_after_insert()
--
-- AFTER INSERT ON public.goals, FOR EACH ROW. Reutiliza EXCLUSIVAMENTE
-- public.recalculate_goal_current_value(uuid) (20260731004632_goal_
-- progress_source.sql, sin modificar) — la misma función ya usada por
-- sync_goal_progress_from_habit_log() y sync_goal_progress_from_goal_
-- change(). Esta función no consulta habit_logs directamente ni duplica
-- ninguna fórmula: compute_goal_habit_logs_progress() (dentro de
-- recalculate_goal_current_value) sigue siendo la única implementación de
-- la suma.
--
-- Si NEW.progress_source <> 'habit_logs', no hace nada — recalculate_
-- goal_current_value() ya tiene su propia guarda idéntica internamente
-- ("if v_goal.progress_source <> 'habit_logs' then return"), pero se
-- comprueba aquí también para no invocar siquiera una función protegida
-- sin necesidad, dejando explícito en esta migración qué casos activa.
--
-- SECURITY DEFINER: necesario específicamente para poder invocar
-- recalculate_goal_current_value(uuid), que tiene EXECUTE revocado de
-- authenticated/anon/PUBLIC (mismo motivo, documentado con el mismo
-- razonamiento, que sync_goal_progress_from_habit_log() y sync_goal_
-- progress_from_goal_change(): dentro de una función SECURITY DEFINER, el
-- rol efectivo para el resto de su cuerpo —incluidas las funciones que
-- invoca— pasa a ser el propietario de la función, no el rol
-- authenticated que originó el INSERT; como esta función y recalculate_
-- goal_current_value() comparten propietario, la llamada interna funciona
-- sin necesitar ningún GRANT adicional).
--
-- Sin riesgo de recursión: el UPDATE que hace recalculate_goal_current_
-- value() sobre goals (`update public.goals set current_value = ... where
-- id = p_goal_id`) es un UPDATE, nunca un INSERT — no puede volver a
-- disparar este mismo trigger (AFTER INSERT). Ese UPDATE sí dispara
-- protect_goal_current_value_trg (que recalcula el mismo valor de forma
-- independiente para verificarlo y siempre coincide, misma fórmula) y, si
-- alguna vez se ampliara su lista de columnas, potencialmente set_goals_
-- updated_at — ninguno de los dos toca habit_id/start_date/end_date, así
-- que tampoco dispara sync_goal_progress_from_goal_change_trg (acotado a
-- "UPDATE OF" esas tres columnas). Deliberadamente NO se registra este
-- trigger como "AFTER INSERT OR UPDATE": si se creara sobre UPDATE
-- también, el propio UPDATE interno de recalculate_goal_current_value()
-- SÍ lo volvería a disparar (bucle) — se declara únicamente AFTER INSERT,
-- tal como exige el encargo.
--
-- set search_path = '' y referencias totalmente calificadas
-- (public.recalculate_goal_current_value). Sin SQL dinámico. No modifica
-- status, goal_lifecycle_status, progress_source, habit_id ni fechas — no
-- escribe ninguna columna por sí misma; su único efecto es, cuando
-- corresponde, invocar el recálculo ya existente de current_value.
-- ----------------------------------------------------------------------------
create or replace function public.sync_goal_progress_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.progress_source = 'habit_logs' then
    perform public.recalculate_goal_current_value(new.id);
  end if;

  return new;
end;
$$;

-- Función de trigger: solo debe invocarse vía trigger, nunca como RPC
-- directa. El disparo del trigger no requiere EXECUTE del rol que ejecuta
-- el INSERT (no depende de este GRANT/REVOKE en absoluto).
revoke execute on function public.sync_goal_progress_after_insert() from public, anon, authenticated;

create or replace trigger sync_goal_progress_after_insert_trg
  after insert on public.goals
  for each row execute function public.sync_goal_progress_after_insert();


-- ----------------------------------------------------------------------------
-- Orden de triggers BEFORE sobre public.goals tras esta migración
-- (PostgreSQL ejecuta los triggers BEFORE de un mismo evento en orden
-- alfabético de nombre — confirmado, no asumido, por inspección de los
-- nombres reales ya existentes antes de escribir este archivo).
--
-- Para INSERT (triggers BEFORE aplicables a INSERT):
--   1. validate_goal_habit_logs_goal_type_trg   (NUEVO — esta migración)
--   2. validate_goal_habit_ownership_trg        (database_integrity.sql)
--
--   "logs" (l) ordena antes que "ownership" (o) — el nuevo trigger de tipo
--   se ejecuta ANTES que el de propiedad en un INSERT. Esto NO debilita la
--   protección de ownership (ver justificación de SECURITY INVOKER arriba):
--   para un habit_id ajeno, validate_goal_habit_logs_goal_type_trg no
--   encuentra fila (RLS) y no hace nada — validate_goal_habit_ownership_trg
--   sigue siendo quien rechaza esa meta, con su mensaje original de
--   siempre, sin importar que se ejecute en segundo lugar.
--
-- Para UPDATE (todos los triggers BEFORE UPDATE existentes, sin cambios en
-- su orden relativo entre sí):
--   1. protect_goal_current_value_trg           (goal_progress_source.sql)
--   2. protect_goal_progress_source_trg         (goal_progress_source.sql)
--   3. protect_goals_user_id_trg                (rls_hardening.sql)
--   4. set_goals_updated_at                     (init_schema.sql)
--   5. validate_goal_habit_logs_goal_type_trg   (NUEVO — esta migración)
--   6. validate_goal_habit_ownership_trg        (database_integrity.sql)
--
--   Los tres primeros protegen columnas específicas comparando OLD/NEW de
--   la propia fila (current_value, progress_source, user_id) — no
--   dependen de qué se ejecute después, y como corren ANTES que el nuevo
--   trigger, cualquier intento de cambiar progress_source/current_value/
--   user_id en la misma sentencia ya queda rechazado antes de que
--   validate_goal_habit_logs_goal_type_trg llegue a evaluarse. set_goals_
--   updated_at no depende de ningún otro trigger. El nuevo trigger de tipo
--   y el de ownership se comportan igual que en INSERT.
--
-- Confirmado explícitamente (sin asumir, verificado en la sección de
-- pruebas de esta misma migración):
--   - la nueva validación de goal_type NO desactiva ni sustituye
--     ownership: una meta vinculada a un hábito ajeno sigue rechazándose
--     por validate_goal_habit_ownership_trg, con el mismo mensaje que
--     antes de esta migración;
--   - progress_source sigue siendo inmutable (protect_goal_progress_
--     source_trg, sin cambios);
--   - current_value sigue protegido (protect_goal_current_value_trg, sin
--     cambios) — incluyendo el valor que esta misma migración escribe vía
--     recalculate_goal_current_value(), que protect_goal_current_value_trg
--     verifica de forma independiente en cada UPDATE, sin excepción;
--   - updated_at sigue actualizándose en cada UPDATE (set_goals_updated_at,
--     sin cambios) — el INSERT nuevo no lo toca, tal como ya ocurría
--     (updated_at se fija una sola vez al crear, por su propio DEFAULT).
-- ----------------------------------------------------------------------------
