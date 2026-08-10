-- ============================================================================
-- Migración: habit_log_edit_window
-- Origen: MDs/09_DATABASE_AUDIT.md (H-05, sección 15) + MDs/10_DATABASE_DECISIONS.md
-- (D-06 — "La ventana de edición será de 7 días con garantía obligatoria en
-- PostgreSQL", Decisiones aprobadas)
--
-- Alcance: implementa D-06. Garantiza en PostgreSQL (no solo en frontend,
-- no solo en RLS) que public.habit_logs solo pueda crearse/editarse/
-- eliminarse dentro de una ventana de 7 días naturales (hoy y los seis
-- días anteriores, en la hora local del dueño del hábito), rechazando
-- fechas futuras y fechas fuera de ventana en INSERT/UPDATE/DELETE.
--
-- No modifica init_schema, harden_functions, database_integrity,
-- entity_lifecycle, habit_schedules,
-- 20260731002637_habit_log_goal_snapshots.sql ni
-- 20260731004632_goal_progress_source.sql (nombres reales de archivo en el
-- repositorio, con sus correcciones ya aplicadas).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Validaciones previas (confirmadas por inspección directa antes de escribir
-- este archivo, no asumidas):
--
-- 1. public.habit_logs.date es `date not null` (init_schema.sql), sin
--    cambios en ninguna migración posterior.
-- 2. Relación exacta habit_logs -> habits -> profiles:
--      habit_logs.habit_id uuid not null references public.habits(id)
--      habits.user_id      uuid not null references auth.users(id)
--      profiles.id         uuid primary key references auth.users(id)
--    profiles NO tiene una columna `user_id` separada — profiles.id ES el
--    id del usuario (relación 1:1 con auth.users, igual que habits.user_id
--    referencia directamente auth.users(id)). La forma correcta de unir
--    ambas tablas es profiles.id = habits.user_id (ambas columnas
--    referencian la misma auth.users(id); no existe una FK declarada
--    directamente entre habits y profiles, pero la relación es correcta y
--    seguirá siéndolo mientras ambas sigan referenciando auth.users(id)).
-- 3. profiles.timezone es `text not null default 'America/Mexico_City'`
--    (init_schema.sql). Sin CHECK constraint sobre su valor en ninguna
--    migración — confirmado por búsqueda en las 6 migraciones anteriores:
--    ninguna agrega una restricción sobre esta columna. NOT NULL sí está
--    garantizado por el esquema, pero nada impide hoy un valor no válido
--    como zona horaria IANA real (por ejemplo, un texto arbitrario nunca
--    validado en el cliente) — de ahí la necesidad de manejar
--    explícitamente una timezone inválida en esta migración (ver sección
--    dedicada más abajo), no solo NULL/vacía.
-- 4. Triggers existentes sobre public.habit_logs (orden alfabético real,
--    confirmado por inspección de las 4 migraciones que los crean):
--      BEFORE UPDATE:        protect_habit_log_goal_snapshot_trg
--                             (20260731002637_habit_log_goal_snapshots.sql)
--      BEFORE INSERT:        set_habit_log_goal_snapshot_trg
--                             (20260731002637_habit_log_goal_snapshots.sql)
--      BEFORE UPDATE:        set_habit_logs_updated_at (init_schema.sql)
--      AFTER  I/U/D:         sync_goal_progress_from_habit_log_trg
--                             (20260731004632_goal_progress_source.sql)
--    No existe hoy ningún trigger BEFORE DELETE sobre habit_logs. Postgres
--    ejecuta los triggers de un mismo momento (BEFORE) y evento en orden
--    alfabético de nombre — "protect_..." < "set_..." (ver análisis
--    completo de nombre elegido más abajo, junto a la creación del
--    trigger de esta migración).
-- 5. Política RLS vigente de habit_logs (init_schema.sql, sin cambios
--    posteriores): "Habit logs manageable by owner", FOR ALL, USING/WITH
--    CHECK EXISTS (habits h WHERE h.id = habit_id AND h.user_id =
--    auth.uid()) — permite HOY que el cliente autenticado, dueño del
--    hábito, ejecute INSERT/UPDATE/DELETE directamente sobre cualquier
--    habit_log de ese hábito, sin ninguna restricción de fecha. La
--    garantía de esta migración vive enteramente en el trigger, no en RLS
--    (ver sección RLS más abajo).
-- 6. No existe ninguna función reutilizable para obtener la fecha local de
--    un usuario/hábito en ninguna migración anterior (confirmado por
--    búsqueda de "local_date"/"timezone" en todo supabase/migrations/) —
--    se crea una en esta migración.
-- 7. Comportamiento de service_role frente a triggers en Supabase/Postgres:
--    ver análisis dedicado completo en la sección "Seguridad y
--    service_role" más abajo — resumen: NO se implementa ningún mecanismo
--    de bypass en esta migración.
-- 8. Este archivo no modifica ninguna estructura existente, solo agrega
--    dos funciones y un trigger nuevos sobre habit_logs — es seguro
--    aplicarlo después de las 6 migraciones anteriores en cualquier orden
--    relativo entre ellas (no depende de habit_schedules ni de
--    entity_lifecycle).
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- Definición funcional aprobada (D-06):
--   fecha mínima editable = hoy local del dueño - 6 días
--   fecha máxima permitida = hoy local del dueño
--   ambos extremos incluidos -> 7 fechas distintas en total
--   fechas anteriores a la mínima: bloqueadas
--   fechas posteriores a "hoy local": bloqueadas
-- "Hoy local" se calcula con profiles.timezone del dueño del hábito
-- relacionado con el habit_log, NUNCA con current_date del servidor como
-- fuente final (la zona horaria del servidor de PostgreSQL puede diferir
-- de la del usuario).
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- Función interna: public.get_habit_local_date(uuid)
--
-- Resuelve, para un habit_id dado, la fecha "de hoy" en la zona horaria
-- del dueño del hábito. Centraliza en un único lugar la resolución
-- habit_id -> habits.user_id -> profiles.timezone -> fecha local, para no
-- duplicar esta lógica en cada una de las ramas (INSERT/UPDATE-OLD/
-- UPDATE-NEW/DELETE) de la función trigger de más abajo — mismo criterio
-- de factorización ya usado en 20260731004632_goal_progress_source.sql
-- (compute_goal_habit_logs_progress).
--
-- No es SECURITY DEFINER: su único invocador es
-- public.enforce_habit_log_edit_window() (más abajo), que SÍ lo es — esta
-- función hereda ese contexto ya elevado sin necesitar su propia
-- declaración (mismo patrón ya usado en la migración anterior).
--
-- Manejo explícito de los cuatro casos exigidos:
--   1. Perfil inexistente / hábito sin owner resoluble -> NOT FOUND tras
--      el JOIN -> excepción explícita.
--   2. timezone NULL -> excepción explícita (no debería ocurrir dado el
--      NOT NULL del esquema, pero no se asume sin comprobar).
--   3. timezone vacía ('' o solo espacios) -> excepción explícita.
--   4. timezone con un valor que PostgreSQL no reconoce como zona horaria
--      válida -> excepción explícita, capturada desde el error nativo que
--      produce `timezone(...)` al recibir un nombre no reconocido.
--
-- Ninguno de los cuatro casos usa UTC como fallback silencioso: los
-- documentos no aprueban ese comportamiento en ningún punto (D-06 no lo
-- menciona, y el encargo pide explícitamente rechazar en vez de asumir
-- UTC salvo aprobación documental, que no existe).
--
-- Validación de timezone contra pg_timezone_names: evaluada y descartada
-- como mecanismo de validación en esta función. pg_timezone_names es una
-- vista calculada dinámicamente (escanea la base de datos de zonas
-- horarias del sistema en cada consulta), no un catálogo estático barato
-- — usarla en una función de trigger invocada en CADA INSERT/UPDATE/DELETE
-- de habit_logs añadiría un costo no despreciable a cada escritura. En su
-- lugar, se intenta la conversión real con `timezone(v_timezone, now())`
-- dentro de un bloque BEGIN/EXCEPTION: si el nombre no es válido,
-- PostgreSQL ya lanza su propio error nativo en ese punto, que se captura
-- y se traduce a un mensaje propio — el mismo resultado protector, sin el
-- costo adicional de una consulta extra a pg_timezone_names en cada fila.
-- No se agrega tampoco un CHECK constraint sobre profiles.timezone en esta
-- migración: sería una corrección legítima pero pertenece al alcance de
-- profiles/perfil de usuario, no al de "ventana de edición de
-- habit_logs" — se reporta como mejora futura razonable, fuera de alcance
-- aquí (ver riesgos y ambigüedades, al final de este archivo).
--
-- search_path = '' y referencias totalmente calificadas
-- (public.habits, public.profiles). Sin SQL dinámico.
-- ----------------------------------------------------------------------------
create or replace function public.get_habit_local_date(p_habit_id uuid)
returns date
language plpgsql
set search_path = ''
as $$
declare
  v_timezone text;
  v_local_date date;
begin
  select p.timezone
  into v_timezone
  from public.habits h
  join public.profiles p on p.id = h.user_id
  where h.id = p_habit_id;

  if not found or v_timezone is null then
    raise exception 'habit_logs: owner profile or timezone is unavailable'
      using detail = format('habit %s has no resolvable owner profile/timezone', p_habit_id);
  end if;

  if btrim(v_timezone) = '' then
    raise exception 'habit_logs: invalid timezone configured'
      using detail = format('habit %s has an empty timezone configured', p_habit_id);
  end if;

  begin
    v_local_date := (timezone(v_timezone, now()))::date;
  exception
    when invalid_parameter_value then
      raise exception 'habit_logs: invalid timezone configured'
        using detail = format('habit %s has an unrecognized timezone configured', p_habit_id);
  end;

  return v_local_date;
end;
$$;

-- Función interna: solo debe invocarse desde
-- public.enforce_habit_log_edit_window() (más abajo). Revocado de PUBLIC,
-- anon y authenticated; no se concede a service_role tampoco: no es
-- necesario para que el mecanismo funcione (hereda el contexto elevado de
-- su único invocador), y otorgarlo permitiría invocarla directamente como
-- RPC arbitraria para inferir la timezone configurada de cualquier hábito
-- sin ninguna validación de propiedad.
revoke execute on function public.get_habit_local_date(uuid) from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- Función trigger: public.enforce_habit_log_edit_window()
--
-- SECURITY DEFINER: la función necesita leer public.habits y
-- public.profiles independientemente de las políticas RLS del cliente que
-- disparó la escritura (RLS de profiles solo permite a un usuario ver su
-- propia fila — "Profiles are viewable by owner" — lo cual normalmente
-- coincide con el dueño del hábito, pero esta migración no asume esa
-- coincidencia para el caso de UPDATE que reasigna habit_id entre
-- hábitos de distintos usuarios, ver más abajo). Al ejecutar bajo su
-- propio propietario, también puede invocar
-- public.get_habit_local_date() sin necesitar ningún GRANT adicional
-- (acceso implícito de propietario, mismo razonamiento ya documentado en
-- 20260731004632_goal_progress_source.sql).
--
-- SET search_path = '' y referencias totalmente calificadas
-- (public.habits, public.profiles, public.get_habit_local_date). Sin SQL
-- dinámico. No confía en ningún parámetro suministrado por el cliente
-- para decidir identidad: toda resolución de dueño/timezone se hace
-- exclusivamente a través de habit_id -> habits.user_id -> profiles.id,
-- nunca a partir de un valor enviado directamente por el INSERT/UPDATE.
--
-- Distingue explícitamente TG_OP = INSERT / UPDATE / DELETE. No referencia
-- NEW durante DELETE ni OLD durante INSERT (exigido explícitamente por el
-- encargo) — cada rama solo toca las variables de fila que existen para
-- esa operación.
--
-- INSERT: usa NEW.habit_id y NEW.date. Permite crear un registro cuya
-- fecha esté entre (hoy local - 6) y hoy local, ambos inclusive. Rechaza
-- fechas futuras y fechas más antiguas que la ventana.
--
-- UPDATE: valida DOS veces, con DOS resoluciones de timezone
-- independientes (no se asume que OLD y NEW pertenecen al mismo usuario,
-- exigido explícitamente por el encargo):
--   1. OLD.habit_id/OLD.date contra la ventana del dueño ANTERIOR — si el
--      registro que se intenta modificar ya está fuera de su propia
--      ventana (envejeció desde que se creó), se rechaza el UPDATE
--      completo sin importar qué columna se esté cambiando ("impide
--      modificar registros ya cerrados por antigüedad").
--   2. NEW.habit_id/NEW.date contra la ventana del dueño NUEVO — si la
--      fecha resultante (haya cambiado o no; si no cambió, sigue siendo
--      la misma fecha, evaluada contra la misma ventana) queda fuera de
--      la ventana del hábito destino, se rechaza ("impide mover un
--      registro... a una fecha futura o antigua"). Esto cubre también el
--      caso de reasignar habit_id a un hábito de otro dueño con otra
--      timezone: la fecha se revalida contra la ventana de ESE dueño, no
--      la del original.
-- Si ambas validaciones pasan, el UPDATE continúa (y dispara, en su
-- momento, protect_habit_log_goal_snapshot_trg y
-- set_habit_logs_updated_at, ambos posteriores alfabéticamente — ver
-- sección de orden más abajo).
--
-- DELETE: usa OLD.habit_id y OLD.date. Permite eliminar únicamente
-- registros cuya fecha esté dentro de la ventana vigente del dueño;
-- bloquea con un mensaje distinto cada límite violado (registro más
-- antiguo que la ventana vs. registro con fecha futura respecto a "hoy
-- local" del dueño). Devuelve OLD (como exige un trigger BEFORE DELETE
-- para permitir que la operación proceda).
--
-- La regla se aplica de forma IDÉNTICA sin importar NEW.status/OLD.status
-- — incluido 'not_applicable' — no hay ninguna rama que distinga por
-- status en esta función (exigido explícitamente: "no agregues excepciones
-- funcionales por status").
-- ----------------------------------------------------------------------------
create or replace function public.enforce_habit_log_edit_window()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_local_date date;
  v_old_min_date date;
  v_new_local_date date;
  v_new_min_date date;
begin
  if tg_op = 'DELETE' then
    v_old_local_date := public.get_habit_local_date(old.habit_id);
    v_old_min_date := v_old_local_date - 6;

    if old.date > v_old_local_date then
      raise exception 'habit_logs: future dates are not allowed'
        using detail = format('record date %s is after today (%s)', old.date, v_old_local_date);
    end if;

    if old.date < v_old_min_date then
      raise exception 'habit_logs: records older than the seven-day edit window are read-only'
        using detail = format(
          'record date %s is outside the editable range %s to %s',
          old.date, v_old_min_date, v_old_local_date
        );
    end if;

    return old;
  end if;

  if tg_op = 'INSERT' then
    v_new_local_date := public.get_habit_local_date(new.habit_id);
    v_new_min_date := v_new_local_date - 6;

    if new.date > v_new_local_date then
      raise exception 'habit_logs: future dates are not allowed'
        using detail = format('record date %s is after today (%s)', new.date, v_new_local_date);
    end if;

    if new.date < v_new_min_date then
      raise exception 'habit_logs: records older than the seven-day edit window are read-only'
        using detail = format(
          'record date %s is outside the editable range %s to %s',
          new.date, v_new_min_date, v_new_local_date
        );
    end if;

    return new;
  end if;

  -- tg_op = 'UPDATE'

  -- 1. El registro ACTUAL (antes del cambio) debe seguir dentro de su
  -- propia ventana — evaluado contra la timezone del dueño anterior.
  v_old_local_date := public.get_habit_local_date(old.habit_id);
  v_old_min_date := v_old_local_date - 6;

  if old.date < v_old_min_date or old.date > v_old_local_date then
    raise exception 'habit_logs: records older than the seven-day edit window are read-only'
      using detail = format(
        'record date %s is outside the editable range %s to %s',
        old.date, v_old_min_date, v_old_local_date
      );
  end if;

  -- 2. El registro RESULTANTE debe quedar dentro de la ventana del dueño
  -- nuevo (que puede ser el mismo hábito y por lo tanto el mismo dueño, o
  -- uno distinto si habit_id cambió).
  v_new_local_date := public.get_habit_local_date(new.habit_id);
  v_new_min_date := v_new_local_date - 6;

  if new.date > v_new_local_date then
    raise exception 'habit_logs: future dates are not allowed'
      using detail = format('record date %s is after today (%s)', new.date, v_new_local_date);
  end if;

  if new.date < v_new_min_date then
    raise exception 'habit_logs: records older than the seven-day edit window are read-only'
      using detail = format(
        'record date %s is outside the editable range %s to %s',
        new.date, v_new_min_date, v_new_local_date
      );
  end if;

  return new;
end;
$$;

-- Función de trigger: solo debe invocarse vía trigger, nunca como RPC
-- directa. El disparo del trigger no requiere EXECUTE del rol que ejecuta
-- el INSERT/UPDATE/DELETE (no depende de este GRANT/REVOKE en absoluto).
revoke execute on function public.enforce_habit_log_edit_window() from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- Trigger: enforce_habit_log_edit_window_trg
--
-- BEFORE INSERT OR UPDATE OR DELETE, FOR EACH ROW: una operación inválida
-- falla ANTES de escribir la fila y, por lo tanto, antes de que el trigger
-- AFTER de progreso (sync_goal_progress_from_habit_log_trg,
-- 20260731004632_goal_progress_source.sql) llegue a ejecutarse — los
-- triggers AFTER de Postgres solo se disparan si la fila terminó de
-- escribirse con éxito, así que esto queda garantizado por la sola
-- elección de BEFORE, independientemente del nombre del trigger.
--
-- Nombre elegido deliberadamente para el orden ENTRE triggers BEFORE
-- (Postgres ejecuta los triggers de un mismo momento/evento en orden
-- alfabético de nombre — confirmado, no asumido, en la sección de
-- validaciones previas): "enforce_habit_log_edit_window_trg" empieza con
-- 'e', que ordena alfabéticamente ANTES que los tres triggers BEFORE ya
-- existentes sobre habit_logs ('p'rotect_habit_log_goal_snapshot_trg,
-- 's'et_habit_log_goal_snapshot_trg, 's'et_habit_logs_updated_at). Esto
-- garantiza que la ventana de edición se valide antes de que se ejecute
-- cualquier trabajo innecesario de esos otros triggers BEFORE (poblar
-- snapshots en INSERT, proteger snapshots en UPDATE) cuando la operación
-- de todas formas va a ser rechazada — no es necesario para la corrección
-- (una excepción en CUALQUIER trigger BEFORE aborta toda la sentencia
-- igual), solo evita ese trabajo de más. No existe hoy ningún trigger
-- BEFORE DELETE sobre habit_logs, así que este es el único en ese evento
-- — sin conflicto de orden posible ahí.
-- ----------------------------------------------------------------------------
create or replace trigger enforce_habit_log_edit_window_trg
  before insert or update or delete on public.habit_logs
  for each row execute function public.enforce_habit_log_edit_window();


-- ----------------------------------------------------------------------------
-- Seguridad y service_role: sin mecanismo de bypass en esta migración
-- (decisión deliberada, no una omisión).
--
-- D-06 reserva service_role para tareas administrativas server-side, pero
-- un trigger de PostgreSQL se dispara para CUALQUIER rol que ejecute la
-- sentencia, sin excepción automática — hay que decidir explícitamente si
-- se distingue algún rol, y cómo.
--
-- Mecanismos evaluados y descartados:
--
--   - auth.uid() IS NULL como señal de "es administrativo": descartado
--     explícitamente por el propio encargo — auth.uid() también es NULL
--     en otros contextos (por ejemplo, una conexión directa sin contexto
--     de autenticación de PostgREST), por lo que no distingue de forma
--     fiable a service_role de otras situaciones.
--
--   - current_user = 'service_role' evaluado DENTRO de esta función: se
--     descarta por una razón técnica concreta, no solo por cautela:
--     enforce_habit_log_edit_window() es SECURITY DEFINER — dentro de una
--     función SECURITY DEFINER, current_user pasa a ser el PROPIETARIO de
--     la función (el rol que aplicó esta migración) durante toda su
--     ejecución, no el rol que originó la sentencia INSERT/UPDATE/DELETE.
--     Comprobar current_user aquí dentro siempre vería al propietario,
--     nunca a service_role/authenticated/anon reales — sería una
--     comprobación que parece funcionar pero que en realidad nunca
--     detecta nada correctamente. Se podría evitar moviendo la
--     comprobación a una función SECURITY INVOKER separada que corra
--     antes de la elevación, pero eso solo resuelve el problema técnico
--     de DÓNDE mirar, no el problema de fondo de abajo.
--
--   - session_user: no cambia con SECURITY DEFINER ni con SET ROLE, pero
--     tampoco es fiable en la arquitectura real de Supabase: PostgREST
--     habitualmente mantiene la conexión física autenticada como un rol
--     "authenticator" (o el rol de conexión configurado en el pooler) y
--     aplica el rol real de la petición (anon/authenticated/service_role)
--     mediante `SET ROLE`/`SET LOCAL ROLE` según el JWT — un mecanismo que
--     cambia current_user, no session_user. Bajo pooling en modo
--     transacción (habitual en Supabase), esto puede variar según cómo
--     esté configurado el pooler en cada proyecto concreto, y no hay forma
--     de confirmarlo con certeza desde este archivo sin acceso de
--     inspección en vivo al proyecto (fuera de alcance de esta tarea:
--     solo lectura, sin MCP, sin ejecutar nada).
--
-- Ante esta incertidumbre real (no hipotética) sobre cuál señal es
-- verificable de forma fiable en el entorno real de este proyecto, el
-- encargo mismo da la instrucción explícita a seguir en este caso: "Si no
-- existe una forma segura y verificable de identificar service_role
-- dentro de PostgreSQL, no inventes un bypass inseguro: aplica la regla a
-- todas las escrituras normales". Eso es exactamente lo que hace esta
-- migración: el trigger se aplica sin excepción a postgres/propietario
-- (durante migraciones), service_role, authenticated y anon por igual.
--
-- Consecuencia práctica: esta misma migración no necesitó escribir
-- ningún habit_log fuera de ventana (no requiere backfill), así que no
-- quedó bloqueada por su propio trigger. Pero cualquier necesidad futura
-- de una corrección administrativa genuina fuera de la ventana de 7 días
-- (por ejemplo, un soporte al cliente corrigiendo un registro antiguo por
-- un error del sistema) SÍ quedará bloqueada por este trigger tal como
-- está — se reporta explícitamente como trabajo pendiente: una función
-- administrativa separada, con su propia validación de autorización
-- explícita y verificable (no basada únicamente en el nombre de un rol
-- dentro de una función ya elevada), diseñada en una migración futura
-- dedicada. Esa función NO se crea aquí y, cuando exista, no debe
-- exponerse al cliente bajo ninguna circunstancia (ya excluido
-- explícitamente del alcance de esta migración).
--
-- Escape manual existente, fuera de esta migración: un administrador con
-- privilegio suficiente siempre puede ejecutar
-- `ALTER TABLE public.habit_logs DISABLE TRIGGER enforce_habit_log_edit_window_trg`
-- manualmente como último recurso auditado, y reactivarlo después — no es
-- un mecanismo construido por esta migración, se menciona solo como el
-- escape existente a nivel de PostgreSQL, ortogonal a cualquier código
-- aquí.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- UPDATE de habit_id: sin prohibición absoluta en esta migración.
--
-- El esquema permite hoy reasignar habit_logs.habit_id a otro hábito (no
-- hay ninguna constraint que lo impida, y no se encontró en la auditoría
-- ninguna decisión que lo prohíba explícitamente). Esta migración no
-- agrega esa prohibición — fuera de su alcance declarado ("no agregues
-- todavía una prohibición absoluta de cambiar habit_id salvo que esté
-- documentada en la auditoría"; no se encontró tal documentación).
--
-- Lo que SÍ garantiza esta migración, tal como quedó implementado arriba:
-- un UPDATE que cambia habit_id no puede usarse para evadir la ventana de
-- edición — se valida la fecha ANTIGUA contra la ventana del dueño
-- ANTERIOR y la fecha NUEVA contra la ventana del dueño NUEVO,
-- independientemente. Los triggers de propiedad/RLS existentes
-- (validate_habit_category_ownership no aplica aquí — es de
-- habit_categories, no de habit_logs; no existe un trigger equivalente de
-- ownership dedicado a habit_logs porque esta tabla no tiene columna
-- user_id propia) y la política RLS "Habit logs manageable by owner" se
-- conservan sin ningún cambio.
--
-- Recomendación reportada (no implementada): dado que la aplicación no
-- tiene hoy ningún flujo documentado que reasigne habit_id de un
-- habit_log existente, y que permitirlo añade la complejidad de
-- reconciliar dos timezones distintas en un mismo UPDATE, sería razonable
-- prohibirlo por completo en una futura migración de integridad — pero
-- eso es una decisión de negocio/esquema distinta de D-06, no se toma
-- aquí sin evidencia documental.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- Fechas futuras: prohibidas para INSERT y UPDATE, sin excepción.
--
-- No se encontró en 01_PRODUCT_CONTEXT.md, 04_SCREEN_SPECIFICATIONS.md,
-- 05_DATA_MODELS_AND_MOCKS.md ni 07_ACCEPTANCE_CRITERIA.md ninguna
-- funcionalidad que dependa de crear habit_logs por adelantado (registros
-- futuros/programados) — el flujo documentado siempre es registrar el
-- cumplimiento del día actual o corregir uno de los últimos días. No se
-- detectó ninguna contradicción documental que requiriera reportar antes
-- de aplicar esta regla tal como está aprobada en D-06.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- Revisión de RLS (sin modificarla en esta migración, por alcance
-- explícito del encargo).
--
-- Confirmado: la política "Habit logs manageable by owner" (FOR ALL)
-- permite hoy que un cliente autenticado, dueño del hábito, ejecute
-- directamente INSERT/UPDATE/DELETE sobre cualquier habit_log de ese
-- hábito sin ninguna restricción de fecha — RLS por sí sola NO impone
-- ningún límite temporal. La garantía real de los 7 días vive
-- enteramente en enforce_habit_log_edit_window_trg, que se ejecuta
-- independientemente de qué política RLS esté vigente (SECURITY DEFINER,
-- no depende de que RLS sea permisiva o restrictiva) — esto es
-- intencional: aunque RLS cambiara en el futuro, la garantía temporal no
-- se debilitaría por eso.
--
-- Interacción entre RLS y el trigger: para una escritura de un cliente
-- normal, RLS decide PRIMERO si la fila es alcanzable en absoluto (dueño
-- del hábito), y el trigger BEFORE decide DESPUÉS (en el mismo INSERT/
-- UPDATE/DELETE, antes de escribir físicamente) si la fecha está dentro
-- de ventana — ambas capas son independientes y complementarias, ninguna
-- sustituye a la otra.
--
-- Qué deberá endurecerse en la futura Migración 7 (rls_hardening),
-- reportado, no implementado aquí: la política actual sigue sin distinguir
-- columnas para habit_logs (mismo hallazgo ya documentado en
-- 20260731002637_habit_log_goal_snapshots.sql sobre las columnas de
-- snapshot) — eso no compromete la ventana de edición (protegida por
-- trigger, no por RLS), pero sigue pendiente para otras columnas. No se
-- identificó ningún bloqueo técnico que exigiera modificar RLS para que
-- este trigger funcione, por lo que no se propuso ni se aplicó ningún
-- cambio de RLS en esta migración.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- Backfill: ninguno. Esta migración no modifica ni elimina ningún
-- habit_log existente. Las filas ya creadas fuera de lo que hoy sería su
-- ventana permanecen exactamente como están, siguen siendo legibles sin
-- restricción (esta migración no toca SELECT en ningún punto) — únicamente
-- sus futuras operaciones de UPDATE/DELETE quedan sujetas a la validación
-- de ventana a partir de este momento. No se corrige ninguna fecha
-- existente.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- Índices: ninguno agregado.
--
-- get_habit_local_date() hace un JOIN puntual habits.id (ya PK) ->
-- profiles.id (ya PK) filtrado por una igualdad de PK en ambos lados — ya
-- óptimamente soportado por los índices de clave primaria existentes, sin
-- necesidad de un índice adicional. enforce_habit_log_edit_window_trg no
-- ejecuta ninguna consulta sobre habit_logs más allá de las columnas de la
-- propia fila (OLD/NEW), por lo que tampoco necesita nada nuevo ahí — la
-- UNIQUE (habit_id, date) ya existente (init_schema.sql) no se duplica ni
-- se toca. No se agrega ningún índice especulativo sobre timezone (no hay
-- ninguna consulta en esta migración que filtre o ordene por esa
-- columna).
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- Exclusiones confirmadas: no se implementan cambios finales de RLS,
-- cambios en progress_source, fórmulas nuevas de progreso, cambios en
-- snapshots, habit_goal_versions, estadísticas, cambios de frontend,
-- funciones administrativas de bypass expuestas al cliente,
-- preferred_time, minimum_target, ideal_target, ni recordatorios. No se
-- modifica habit_schedules, categories, goals lifecycle, current_value,
-- funciones de progreso (recalculate_goal_current_value,
-- compute_goal_habit_logs_progress, sync_goal_progress_from_habit_log,
-- sync_goal_progress_from_goal_change), ni las columnas snapshot de
-- habit_logs.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- Riesgos y ambigüedades (resumen; detalle en las secciones
-- correspondientes de más arriba).
--
-- 1. Sin CHECK constraint sobre profiles.timezone: un valor inválido
--    solo se detecta en el momento de escribir/editar/eliminar un
--    habit_log (vía el bloque BEGIN/EXCEPTION de get_habit_local_date()),
--    no al guardar el perfil. Evaluado y descartado agregarlo aquí por
--    pertenecer al alcance de profiles, no al de esta migración — reportado
--    como mejora futura razonable.
-- 2. Sin mecanismo de bypass para service_role/administración: cualquier
--    corrección administrativa fuera de ventana quedará bloqueada hasta
--    que se diseñe una función administrativa dedicada en una migración
--    futura, no construida aquí. Ver análisis completo en "Seguridad y
--    service_role".
-- 3. habit_id de un habit_log sigue siendo reasignable sin restricción
--    propia (más allá de que la ventana ahora se revalide en ambos lados)
--    — se reportó como candidato a prohibición futura, no implementada.
-- 4. La resolución de timezone se hace en tiempo real en cada
--    INSERT/UPDATE/DELETE (sin caché): es el comportamiento correcto para
--    reflejar cambios de timezone del usuario inmediatamente, pero implica
--    un JOIN adicional por fila — aceptable dado que ya son claves
--    primarias en ambos lados, sin índice adicional que ayude más de lo
--    que ya existe.
-- ----------------------------------------------------------------------------
