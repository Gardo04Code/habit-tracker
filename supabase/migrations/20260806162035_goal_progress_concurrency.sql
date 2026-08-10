-- ============================================================================
-- Migración: goal_progress_concurrency
-- Origen: BUG-002 (MDs/13_E2E_QA_TEST_PLAN.md) — condición de carrera entre
-- la creación de una meta progress_source='habit_logs' y una escritura
-- concurrente sobre habit_logs del mismo hábito, reproducida de forma
-- idéntica en 3 corridas independientes.
--
-- ----------------------------------------------------------------------------
-- CAUSA RAÍZ CONCURRENTE (confirmada por inspección directa de
-- 20260731004632_goal_progress_source.sql y 20260805171711_goal_integrity_
-- fixes.sql antes de escribir este archivo, no asumida):
--
-- Los tres puntos de entrada que recalculan goals.current_value —
--   sync_goal_progress_after_insert()       (AFTER INSERT ON goals)
--   sync_goal_progress_from_goal_change()   (AFTER UPDATE OF habit_id/
--                                             start_date/end_date ON goals)
--   sync_goal_progress_from_habit_log()     (AFTER INSERT/UPDATE/DELETE ON
--                                             habit_logs)
-- — todos terminan invocando public.recalculate_goal_current_value(p_goal_id),
-- que adquiere `select ... from public.goals where id = p_goal_id for
-- update` ANTES de leer habit_logs vía compute_goal_habit_logs_progress().
-- Ese FOR UPDATE serializa correctamente dos recálculos concurrentes de LA
-- MISMA fila de goals ya existente — pero es insuficiente como mutex del
-- hábito completo, por dos motivos demostrados:
--
--   1. Una meta recién insertada NO es visible para otra transacción hasta
--      que su INSERT hace commit (MVCC estándar). Si la Transacción A crea
--      una meta nueva para el hábito H (dispara sync_goal_progress_after_
--      insert_trg, que lee habit_logs de H para calcular el valor inicial)
--      mientras la Transacción B escribe/actualiza/borra un habit_log de H
--      en paralelo (dispara sync_goal_progress_from_habit_log_trg, que
--      busca `goals where habit_id = H` para decidir qué metas recalcular),
--      B no puede ver ni recalcular la meta de A si A todavía no hizo
--      commit — y viceversa, A puede no ver el cambio de B si el snapshot
--      de su propia sentencia de lectura se tomó antes de que B hiciera
--      commit. Ninguna de las dos transacciones bloquea a la otra en ningún
--      punto: no comparten ninguna fila en su cláusula FOR UPDATE (A
--      bloquea su propia fila nueva de goals; B bloquea las filas de goals
--      ya existentes que encuentra — conjuntos disjuntos).
--   2. Bajo READ COMMITTED (nivel de aislamiento por defecto, sin cambios
--      en esta migración), cada sentencia dentro de la función PL/pgSQL —
--      incluida la de compute_goal_habit_logs_progress() — toma su PROPIO
--      snapshot MVCC en el momento en que esa sentencia arranca, no en el
--      momento en que arrancó la transacción. Dos transacciones que
--      ejecutan su respectiva sentencia de lectura de habit_logs en
--      instantes solapados pueden ver, cada una, un conjunto de filas
--      ligeramente distinto (una ve el log nuevo, la otra no) — y cuando
--      ambas terminan escribiendo current_value (cada una con `update
--      goals set current_value = ...`), la que hace commit EN SEGUNDO
--      LUGAR sobrescribe el resultado de la primera con un valor calculado
--      sobre un snapshot más antiguo — un "lost update" clásico. La
--      compra/actualización/borrado del habit_log en sí NUNCA se pierde
--      (BUG-002 lo confirma explícitamente: no hay pérdida de habit_logs ni
--      fuga entre usuarios) — lo que queda stale es exclusivamente
--      goals.current_value, hasta la siguiente escritura sobre ese hábito
--      (que sí lo corrige, porque en ese momento ya no hay concurrencia y
--      el snapshot de esa sentencia posterior ve todo lo ya comprometido).
--
-- Ninguna de las funciones existentes bloquea `public.habits` en ningún
-- punto (confirmado por grep sobre las dos migraciones origen: sin `for
-- update` sobre habits en ninguna de las dos). Tampoco se bloquea `public.
-- habit_logs` como conjunto (correcto: bloquear filas de una tabla que se
-- va a leer con SELECT simple no tendría sentido sin FOR UPDATE explícito,
-- y habit_logs no necesita FOR UPDATE — solo necesita que su lectura ocurra
-- DESPUÉS de que la escritura concurrente relevante ya se resolvió, lo cual
-- un mutex compartido garantiza indirectamente).
--
-- CONCLUSIÓN: no existe hoy ninguna fila común que ambos caminos (creación
-- de meta / escritura de log) bloqueen ANTES de leer habit_logs — por eso
-- pueden proceder en paralelo con snapshots divergentes. La corrección de
-- esta migración introduce esa fila común.
-- ----------------------------------------------------------------------------
--
-- ----------------------------------------------------------------------------
-- DISEÑO — mutex único por hábito.
--
-- public.habits.id (la fila del hábito vinculado) se usa como mutex lógico
-- para TODA operación que pueda afectar goals.current_value de metas
-- progress_source='habit_logs' vinculadas a ese hábito. Los tres puntos de
-- entrada ahora adquieren `select ... from public.habits where id = ...
-- for update` (vía la función auxiliar public.lock_habit_for_goal_progress,
-- más abajo) ANTES de leer o escribir cualquier fila de goals/habit_logs
-- relacionada con ese hábito — no después, no en paralelo.
--
-- Por qué basta con esto bajo READ COMMITTED (sin necesidad de subir el
-- nivel de aislamiento, sin advisory locks, sin LOCK TABLE): un `for
-- update` que debe esperar porque otra transacción ya tiene la fila
-- bloqueada, al desbloquearse (cuando la otra transacción hace commit o
-- rollback), permite que la transacción que esperaba continúe con su
-- CódigoPL/pgSQL siguiente — y esa siguiente sentencia (la que llama a
-- compute_goal_habit_logs_progress, o la que busca `goals where habit_id
-- = ...`) toma un snapshot NUEVO en ese momento, que bajo READ COMMITTED SÍ
-- incluye todo lo que la transacción que acaba de liberar el lock ya
-- comprometió. No hace falta releer manualmente ni mover el cálculo a una
-- sentencia posterior de forma especial: el simple hecho de que el lock se
-- adquiera ANTES de la primera lectura relevante, combinado con que cada
-- sentencia PL/pgSQL siguiente toma su propio snapshot en READ COMMITTED,
-- ya produce la visibilidad correcta. (Bajo REPEATABLE READ/SERIALIZABLE
-- esto no bastaría —el snapshot se fija al inicio de la transacción—, pero
-- esta base de datos no cambia su nivel de aislamiento por defecto en
-- ningún punto de esta migración, así que el razonamiento aplica tal cual).
--
-- Se descarta advisory locks (pg_advisory_xact_lock): una fila real de
-- `habits` ya es un mutex estable, único por hábito, con el mismo ciclo de
-- vida que la transacción (se libera automáticamente al hacer commit o
-- rollback, igual que un advisory lock transaccional) y sin necesidad de
-- mantener un espacio de claves numérico aparte (pg_advisory_xact_lock
-- exige convertir un uuid a bigint, con riesgo de colisión de hash) — no
-- se encontró ninguna limitación de la fila real que justificara la
-- complejidad adicional de un advisory lock.
--
-- Alcance del lock: por fila (`where id = p_habit_id`), nunca por tabla —
-- dos hábitos distintos nunca se bloquean entre sí (ver Fase 8 del reporte
-- de entrega para el análisis de rendimiento).
-- ----------------------------------------------------------------------------
--
-- ----------------------------------------------------------------------------
-- ORDEN DE LOCKS FINAL (documentado, único, sin excepciones):
--
--   INSERT goal (progress_source='habit_logs'):
--     1. lock habits(NEW.habit_id)
--     2. recalculate_goal_current_value(NEW.id)  [bloquea la propia fila
--        de goals internamente, sin cambios respecto a antes]
--
--   UPDATE goal (habit_id y/o start_date/end_date cambian,
--   progress_source='habit_logs' — invariante ya garantizado por
--   protect_goal_progress_source_trg, que corre ANTES en la cadena BEFORE
--   UPDATE, así que OLD.progress_source = NEW.progress_source siempre):
--     1. si OLD.habit_id = NEW.habit_id: lock habits(NEW.habit_id) — un
--        único id, un único lock.
--     2. si OLD.habit_id <> NEW.habit_id (ambos NOT NULL, ver más abajo):
--        lock habits(LEAST(OLD.habit_id, NEW.habit_id)) primero, después
--        lock habits(GREATEST(OLD.habit_id, NEW.habit_id)) — orden
--        ascendente por UUID, determinista, independiente de cuál
--        transacción concurrente esté moviendo la meta en qué dirección.
--     3. recalculate_goal_current_value(NEW.id)
--
--   INSERT/UPDATE/DELETE habit_log:
--     1. lock habits(id) para cada habit_id distinto involucrado (en la
--        práctica, siempre exactamente uno — ver nota de inmutabilidad más
--        abajo —, pero el código sigue soportando el caso defensivo de más
--        de uno, ya presente antes de esta migración, en orden ascendente
--        por UUID para mantener el mismo criterio que el camino de UPDATE
--        de goals).
--     2. buscar goals afectadas por esos habit_id
--     3. recalculate_goal_current_value(...) por cada una
--
-- Por qué esto no puede producir un deadlock previsible: el ÚNICO camino
-- que adquiere DOS locks de habits en la misma transacción es el UPDATE de
-- habit_id de una meta, y ese camino SIEMPRE los adquiere en el mismo
-- orden ascendente por UUID — dos transacciones que intentaran mover metas
-- en direcciones opuestas entre los mismos dos hábitos (H1->H2 y H2->H1)
-- adquieren sus locks en el MISMO orden (el menor primero), por lo que
-- nunca pueden formar un ciclo de espera mutua. Ningún otro camino de esta
-- migración adquiere más de un lock de habits por transacción, así que no
-- puede participar en un ciclo (un ciclo de deadlock exige que cada
-- participante mantenga un recurso mientras espera otro que el otro
-- participante ya tiene — un camino de un solo lock nunca "mantiene y
-- espera" un segundo recurso).
--
-- Nota de inmutabilidad — UPDATE habit_logs.habit_id: confirmado por
-- inspección de 20260731015901_rls_hardening.sql
-- (protect_habit_logs_habit_id_trg, BEFORE UPDATE, `if new.habit_id is
-- distinct from old.habit_id then raise exception`) que habit_logs.habit_id
-- es inmutable a nivel de trigger — cualquier intento de cambiarlo aborta
-- la transacción ANTES de que sync_goal_progress_from_habit_log_trg (AFTER
-- UPDATE) pueda siquiera dispararse. La rama "OLD.habit_id IS DISTINCT FROM
-- NEW.habit_id" dentro de sync_goal_progress_from_habit_log() es, por lo
-- tanto, código muerto en la práctica (ya lo era antes de esta migración) —
-- se conserva sin cambios de comportamiento, solo se le añade el mismo
-- bloqueo determinista, por si esa invariante cambiara en el futuro. No
-- abre ningún camino de deadlock nuevo: sigue las mismas reglas de orden
-- ascendente documentadas arriba.
-- ----------------------------------------------------------------------------
--
-- No modifica tablas, columnas, enums, constraints, índices, RLS ni GRANT
-- de tablas. No crea ninguna RPC nueva para el cliente. No cambia ninguna
-- fórmula de progreso: compute_goal_habit_logs_progress() sigue siendo la
-- ÚNICA implementación de la suma, sin tocar. No cambia goal_status ni
-- goal_lifecycle_status. Únicamente reemplaza (CREATE OR REPLACE, mismas
-- firmas públicas) las tres funciones trigger ya implicadas en BUG-002 y
-- agrega una función interna auxiliar de lock.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Función interna: public.lock_habit_for_goal_progress(p_habit_id uuid)
--
-- Único propósito: adquirir el mutex lógico de un hábito (su propia fila en
-- public.habits) antes de que el llamador lea o escriba cualquier cosa
-- relacionada con goals/habit_logs de ese hábito. No devuelve nada útil
-- (returns void) — su efecto es exclusivamente el bloqueo, retenido hasta
-- el commit/rollback de la transacción actual (semántica estándar de un
-- FOR UPDATE de fila).
--
-- SIN "security definer": mismo criterio ya documentado para
-- compute_goal_habit_logs_progress() en 20260731004632_goal_progress_
-- source.sql — esta función SOLO se invoca desde dentro de las tres
-- funciones trigger que ya son SECURITY DEFINER (sync_goal_progress_after_
-- insert, sync_goal_progress_from_goal_change, sync_goal_progress_from_
-- habit_log), así que hereda el contexto de privilegio ya elevado de su
-- llamador sin necesitar su propia elevación — declararla también SECURITY
-- DEFINER sería redundante, no incorrecto, pero se prefiere el mínimo
-- privilegio declarado explícitamente cuando no aporta nada adicional.
--
-- set search_path = '' y referencia totalmente calificada (public.habits).
-- Sin SQL dinámico. Sin WHEN OTHERS: si la fila no existe (p_habit_id
-- inválido, no debería ocurrir dado el FK existente desde goals/habit_logs
-- hacia habits), el SELECT ... FOR UPDATE simplemente no bloquea ninguna
-- fila y retorna sin error — no hay ninguna excepción que ocultar aquí.
--
-- Revocada de public/anon/authenticated: función interna, nunca pensada
-- para invocarse como RPC directa (no valida auth.uid() ni ownership —
-- bloquear una fila de habits sin más contexto no tendría sentido como
-- operación de cliente).
-- ----------------------------------------------------------------------------
create or replace function public.lock_habit_for_goal_progress(p_habit_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform 1 from public.habits where id = p_habit_id for update;
end;
$$;

revoke execute on function public.lock_habit_for_goal_progress(uuid) from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- public.sync_goal_progress_after_insert() — CREATE OR REPLACE.
--
-- Único cambio respecto a 20260805171711_goal_integrity_fixes.sql: adquiere
-- el lock de public.habits(NEW.habit_id) ANTES de invocar recalculate_
-- goal_current_value(new.id) — cierra la ventana de carrera descrita arriba
-- para el camino "crear meta sobre un hábito con escritura concurrente de
-- logs". Firma, SECURITY DEFINER, search_path, guardas y REVOKE idénticos
-- a la versión anterior — solo se inserta una línea `perform public.
-- lock_habit_for_goal_progress(...)`.
-- ----------------------------------------------------------------------------
create or replace function public.sync_goal_progress_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.progress_source = 'habit_logs' then
    perform public.lock_habit_for_goal_progress(new.habit_id);
    perform public.recalculate_goal_current_value(new.id);
  end if;

  return new;
end;
$$;

revoke execute on function public.sync_goal_progress_after_insert() from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- public.sync_goal_progress_from_goal_change() — CREATE OR REPLACE.
--
-- Único cambio respecto a 20260731004632_goal_progress_source.sql: adquiere
-- el/los lock(s) de public.habits ANTES de invocar recalculate_goal_
-- current_value(new.id). Si OLD.habit_id = NEW.habit_id (el UPDATE solo
-- tocó start_date/end_date, o reasignó habit_id al mismo valor que ya
-- tenía), un único lock. Si difieren, dos locks en orden ascendente por
-- UUID (LEAST primero, GREATEST después) — ver "ORDEN DE LOCKS FINAL" al
-- inicio de este archivo para la justificación completa de por qué este
-- orden evita deadlock frente a un UPDATE concurrente que mueva otra meta
-- en la dirección opuesta entre los mismos dos hábitos. OLD.habit_id y
-- NEW.habit_id son ambos NOT NULL en esta rama (progress_source='habit_logs'
-- es inmutable por protect_goal_progress_source_trg, y goals_progress_
-- source_habit_id_coherence_chk exige habit_id NOT NULL para 'habit_logs'
-- en ambas versiones de la fila). Firma, SECURITY DEFINER, search_path,
-- guardas y REVOKE idénticos a la versión anterior.
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
    perform public.lock_habit_for_goal_progress(least(old.habit_id, new.habit_id));

    if new.habit_id is distinct from old.habit_id then
      perform public.lock_habit_for_goal_progress(greatest(old.habit_id, new.habit_id));
    end if;

    perform public.recalculate_goal_current_value(new.id);
  end if;

  return new;
end;
$$;

revoke execute on function public.sync_goal_progress_from_goal_change() from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- public.sync_goal_progress_from_habit_log() — CREATE OR REPLACE.
--
-- Único cambio respecto a 20260731004632_goal_progress_source.sql: adquiere
-- el lock de public.habits para cada habit_id distinto en v_habit_ids (en
-- la práctica, siempre uno solo — ver nota de inmutabilidad de habit_logs.
-- habit_id al inicio de este archivo —, pero se recorre en orden ascendente
-- por UUID por si v_habit_ids llegara a tener dos elementos) ANTES de
-- buscar y recalcular las goals afectadas. El resto de la lógica (qué
-- habit_id(s) corresponden a INSERT/UPDATE/DELETE, por qué se recalculan
-- TODAS las metas del hábito sin pre-filtrar por rango de fecha) es
-- exactamente la misma que en la migración original — ver esos comentarios
-- allí, no repetidos aquí. Firma, SECURITY DEFINER, search_path y REVOKE
-- idénticos a la versión anterior.
-- ----------------------------------------------------------------------------
create or replace function public.sync_goal_progress_from_habit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_habit_ids uuid[];
  v_habit_id uuid;
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

  for v_habit_id in
    select distinct h from unnest(v_habit_ids) as h order by h
  loop
    perform public.lock_habit_for_goal_progress(v_habit_id);
  end loop;

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

revoke execute on function public.sync_goal_progress_from_habit_log() from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- Triggers: sin cambios de definición (mismo evento, misma tabla, mismo
-- FOR EACH ROW) — se vuelven a declarar con CREATE OR REPLACE TRIGGER
-- únicamente para que apunten a los cuerpos de función recién reemplazados
-- (en PostgreSQL un CREATE OR REPLACE FUNCTION ya actualiza el cuerpo que
-- un trigger existente ejecuta sin necesidad de recrear el trigger en sí;
-- se re-declaran aquí de todas formas por explicitud y para que este
-- archivo sea legible de forma autocontenida, sin cambiar ningún
-- comportamiento respecto a dejarlos implícitos).
-- ----------------------------------------------------------------------------
create or replace trigger sync_goal_progress_after_insert_trg
  after insert on public.goals
  for each row execute function public.sync_goal_progress_after_insert();

create or replace trigger sync_goal_progress_from_goal_change_trg
  after update of habit_id, start_date, end_date on public.goals
  for each row execute function public.sync_goal_progress_from_goal_change();

create or replace trigger sync_goal_progress_from_habit_log_trg
  after insert or update or delete on public.habit_logs
  for each row execute function public.sync_goal_progress_from_habit_log();


-- ----------------------------------------------------------------------------
-- No se modifica recalculate_goal_current_value(uuid) ni
-- compute_goal_habit_logs_progress(uuid, date, date): ambas conservan su
-- FOR UPDATE existente sobre la propia fila de goals (recalculate_goal_
-- current_value) y su lectura pura de habit_logs (compute_goal_habit_logs_
-- progress) sin cambios — el mutex de habits añadido en esta migración es
-- estrictamente ADICIONAL, adquirido antes de que estas dos funciones se
-- invoquen, no un reemplazo de su propio bloqueo de fila.
--
-- Rendimiento: el lock es por fila (`where id = p_habit_id`), nunca por
-- tabla — dos hábitos distintos nunca compiten entre sí. No se recorren
-- filas adicionales de habit_logs ni de goals para adquirirlo (un solo
-- `perform 1 ... for update` sobre la PK de habits, ya indexada por ser
-- PRIMARY KEY). No se agrega ningún índice nuevo: no hace falta, la
-- búsqueda es por PK. Tradeoff aceptado y documentado: dos escrituras
-- verdaderamente concurrentes sobre EL MISMO hábito ahora se serializan
-- (una espera brevemente a la otra) en vez de competir por un resultado
-- final potencialmente incorrecto — consistencia fuerte por habit_id a
-- cambio de una espera acotada y poco frecuente en la práctica (solo
-- ocurre si dos escrituras sobre el mismo hábito coinciden en la misma
-- ventana de milisegundos).
-- ----------------------------------------------------------------------------
