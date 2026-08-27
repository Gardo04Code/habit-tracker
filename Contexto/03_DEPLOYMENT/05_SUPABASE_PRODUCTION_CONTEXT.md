# Supabase Production — Contexto (proyecto confirmado y migrado)

## Identidad

| Campo | Valor |
|---|---|
| Project Name | `habit-tracker` |
| Project Ref | `xgasncrztfwotjlghlfg` |
| Region | `us-east-1` |
| Plan | Free |
| Status | Resumed / Active |
| Clasificación | **CONFIRMED USER PROJECT — MIGRATED, SCHEMA COMPLETE** |

## Estado de esquema (post 7.5B — migración completa aplicada)

- **Migraciones aplicadas: 15/15.** Pending: 0. Confirmado con
  `list_migrations` y con `db push --dry-run` ("Remote database is up
  to date").
- **Tablas:** 7/7 (`profiles`, `categories`, `habits`,
  `habit_categories`, `habit_schedules`, `habit_logs`, `goals`).
- **RLS:** habilitada en las 7. **Policies:** 19, granulares
  (`rls_hardening.sql`) — las policies `ALL` amplias originales ya no
  existen.
- **Grants:** `authenticated` tiene exactamente los privilegios de
  `table_privileges.sql` (p. ej. `habit_schedules`: solo `SELECT`,
  todo cambio pasa por RPC). `anon` sin privilegios indebidos (solo
  `REFERENCES`/`TRIGGER`/`TRUNCATE`).
- **Functions/RPC:** 24 propias (`create_habit_schedule`,
  `change_habit_schedule`, `recalculate_goal_current_value`,
  `compute_goal_habit_logs_progress`, `lock_habit_for_goal_progress`,
  familia `protect_*`/`validate_*`/`sync_*`), más `rls_auto_enable`
  (función de plataforma Supabase, no de nuestras migraciones,
  inocua).
- **Triggers:** 20 en `public` + `on_auth_user_created` en
  `auth.users`.
- **Constraints:** 36 (incluye el `EXCLUDE` de no-solapamiento de
  `habit_schedules`). **Indexes:** 23 (incluye el único parcial "una
  versión vigente por hábito").
- **Comparación contra Local:** MATCH exacto en cada categoría
  (auditoría read-only exhaustiva, 1:1, no asumida) — ver
  `MDs/14_DEPLOYMENT_PLAN.md`, sección "7.5B" para el detalle completo.

**El proyecto es ahora funcionalmente utilizable para la aplicación**
(antes de 7.5B no lo era: sin grants de tabla, sin RPC de negocio).

## Datos existentes

**Cero.** 0 filas en las 7 tablas, 0 usuarios en `auth.users`. El `db
push` de 7.5B no creó ningún dato. Sin Storage, sin Edge Functions,
sin cron, sin Realtime.

## Seguridad — advisories conocidas

`get_advisors(security)` reporta 2 WARN: `create_habit_schedule` y
`change_habit_schedule` son `SECURITY DEFINER` ejecutables por
`authenticated` vía RPC. **Esperado y por diseño** — es el mecanismo
sancionado para que un usuario gestione sus propios horarios sin
privilegios directos de escritura sobre `habit_schedules` (que
intencionalmente solo tiene `GRANT SELECT`). Ya revisado en QA 6.3I.
No requiere corrección.

## Estado de vinculación del CLI

**LINKED.** `supabase/.temp/project-ref` = `xgasncrztfwotjlghlfg`. CLI
autenticado (`supabase login` ya ejecutado por el Product Owner en
7.5A). El `db push` de las 13 migraciones pendientes se ejecutó con
éxito en 7.5B, con autorización explícita y limitada exactamente al
conjunto ya auditado por dry-run.

## Auth decision

Email confirmation V1: **DESACTIVADA** (decisión explícita del Product
Owner). Site URL / Redirect URLs / providers de este proyecto remoto:
**todavía no configurados** — pendiente para el bloque 7.8, cuando
haya una URL de Hostinger definitiva. Trigger de creación automática
de perfil (`on_auth_user_created` → `handle_new_user()`) presente y
confirmado correcto.

## Reglas de seguridad — no olvidar

- Nunca `service_role`/DB password/JWT secret en este documento, en
  ningún otro archivo de `Contexto/`/`MDs/`, ni en el frontend.
- Ninguna escritura adicional contra este proyecto sin autorización
  explícita del Product Owner.
- Cualquier migración nueva futura: dry-run antes, autorización
  explícita separada antes del `db push` real, nunca editar una
  migración ya aplicada.

## Conectividad frontend confirmada (7.6)

Una llamada REST directa con la Publishable Key de Production contra
`/rest/v1/profiles` devolvió `401 permission denied` — exactamente lo
esperado dado que `anon` no tiene `GRANT` (confirmado en 7.5B). Prueba
que la API responde y que la key configurada en el build de 7.6 es
válida. Cero escrituras.

## Siguiente paso

Bloques restantes de Deployment, cada uno con autorización explícita
propia:
- **7.6 — Frontend Production Configuration: COMPLETADO.** Ver
  `Contexto/03_DEPLOYMENT/06_FRONTEND_PRODUCTION_CONTEXT.md`.
- **7.7 — Frontend Deployment:** primer deploy real a Hostinger (usando
  el `dist/` ya auditado como candidato).
- **7.8 — Auth/Domain/HTTPS:** configurar Site URL/Redirect URLs contra
  la URL definitiva.
- **7.9 — Post-Deployment Smoke:** signup → hábito → checklist → etc.
  contra el frontend real desplegado.
