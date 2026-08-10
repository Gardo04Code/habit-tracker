-- ============================================================================
-- Migración: entity_lifecycle
-- Origen: MDs/09_DATABASE_AUDIT.md (Revisión 4) + MDs/10_DATABASE_DECISIONS.md
--
-- Alcance: implementa D-01 (ciclo de vida de categories) y D-02 (ciclo de
-- vida de goals), aprobados en MDs/10_DATABASE_DECISIONS.md. No modifica
-- init_schema, harden_functions ni database_integrity. No toca RLS, no
-- crea habit_schedules, no crea snapshots ni progress_source, no borra
-- datos.
-- ============================================================================


-- ============================================================================
-- D-01 — categories: borrado lógico simple (active / deleted)
-- ============================================================================

-- D-01 — Tipo para el ciclo de vida de categories. Solo dos valores,
-- deliberadamente: no se agregan 'paused' ni 'archived' (decisión D-01,
-- "Categories usarán borrado lógico simple").
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'category_lifecycle_status'
      and n.nspname = 'public'
  ) then
    create type public.category_lifecycle_status as enum ('active', 'deleted');
  end if;
end $$;

-- D-01 — Columna de ciclo de vida en categories. NOT NULL con DEFAULT
-- 'active': cualquier fila existente (la tabla puede tener datos, no se
-- asume que esté vacía) queda convertida a 'active' automáticamente al
-- agregar la columna con este DEFAULT, sin necesidad de un UPDATE aparte.
alter table public.categories
  add column if not exists lifecycle_status public.category_lifecycle_status not null default 'active';

-- D-01 — Reemplazo del índice único normalizado de categories (H-06) por
-- una versión parcial que solo aplica a categorías 'active'.
--
-- Inspección previa (no se asume el nombre): el índice existente se creó en
-- database_integrity.sql como `categories_active_name_normalized_idx`, con
-- definición `on public.categories (user_id, lower(btrim(name)))`, SIN
-- cláusula WHERE — porque en ese momento categories no tenía columna de
-- estado. Se elimina únicamente ese índice, por su nombre exacto verificado;
-- no se toca ningún otro índice o constraint de categories.
--
-- Efecto de la nueva versión parcial (WHERE lifecycle_status = 'active'):
--   - una categoría 'deleted' deja de "ocupar" su nombre, permitiendo crear
--     una categoría nueva con el mismo nombre normalizado;
--   - restaurar una categoría 'deleted' a 'active' vuelve a evaluarse contra
--     este índice — si ya existe otra categoría 'active' del mismo usuario
--     con el mismo nombre normalizado, la restauración (un UPDATE que pone
--     lifecycle_status = 'active') falla por violación de unicidad. Esta es
--     la garantía pedida por el punto 7 de D-01; no se crea ninguna función
--     de restauración en esta migración, la garantía surge del índice.
drop index if exists public.categories_active_name_normalized_idx;

create unique index if not exists categories_active_name_normalized_idx
  on public.categories (user_id, lower(btrim(name)))
  where lifecycle_status = 'active';

-- D-01 — Índice de apoyo para consultas por ciclo de vida: listar las
-- categorías activas de un usuario (selector de categorías al crear/editar
-- un hábito) o su papelera (categorías 'deleted'). No es redundante con
-- `categories_user_id_idx` (init_schema), que solo cubre `user_id` sin la
-- columna de estado.
create index if not exists categories_user_id_lifecycle_status_idx
  on public.categories (user_id, lifecycle_status);

-- Nota (D-01, punto 4): las relaciones existentes en habit_categories se
-- conservan automáticamente cuando una categoría pasa a 'deleted', porque
-- el borrado lógico es un UPDATE, no un DELETE — no hay ningún ON DELETE
-- CASCADE que se dispare. No se requiere ningún cambio adicional para
-- este punto.


-- ============================================================================
-- D-02 — goals: goal_lifecycle_status independiente de goal_status
-- ============================================================================

-- D-02 — Tipo para el ciclo de vida de goals. Deliberadamente distinto y
-- separado de `goal_status` (que sigue significando exactamente lo mismo:
-- active/completed/expired, sin modificar sus valores ni su propósito).
-- Solo 'active' / 'paused' / 'deleted' — no se agrega 'archived' (punto 7).
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'goal_lifecycle_status'
      and n.nspname = 'public'
  ) then
    create type public.goal_lifecycle_status as enum ('active', 'paused', 'deleted');
  end if;
end $$;

-- D-02 — Columna de ciclo de vida en goals, independiente de `status`
-- (goal_status). NOT NULL con DEFAULT 'active': las metas existentes
-- quedan convertidas a 'active' automáticamente, sin tocar su `status`
-- actual ni ningún otro campo.
alter table public.goals
  add column if not exists goal_lifecycle_status public.goal_lifecycle_status not null default 'active';

-- D-02 — Índice de apoyo para consultas por ciclo de vida y por resultado
-- combinados. Se crea un único índice compuesto en vez de uno separado
-- para (user_id, goal_lifecycle_status): como goal_lifecycle_status queda
-- en segunda posición aquí, este mismo índice ya sirve también como
-- prefijo para consultas que solo filtran por (user_id,
-- goal_lifecycle_status) — por ejemplo, "todas las metas visibles
-- (no eliminadas) de un usuario" — sin necesidad de un segundo índice
-- redundante. Cubre además el caso combinado, por ejemplo "metas activas y
-- cumplidas de un usuario" (pantalla Metas, tabs Activas/Cumplidas/
-- Vencidas, excluyendo pausadas/eliminadas).
create index if not exists goals_user_id_lifecycle_status_status_idx
  on public.goals (user_id, goal_lifecycle_status, status);

-- Nota (D-02, punto 6): pausar o eliminar lógicamente una meta es siempre
-- un UPDATE de goal_lifecycle_status únicamente. Ninguna otra columna
-- (habit_id, target_value, current_value, unit, start_date, end_date,
-- status, created_at) se toca ni se ve afectada — todas se conservan tal
-- cual, incluyendo el historial ya existente. No hay DELETE físico en el
-- flujo normal descrito por esta migración.
