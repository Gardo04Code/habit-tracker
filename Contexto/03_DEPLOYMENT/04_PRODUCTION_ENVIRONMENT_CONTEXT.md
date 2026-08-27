# Production Environment — Contexto (Paso 7, bloques 7.4-7.8)

## Estado al cierre de 7.6

7.1-7.5B: **COMPLETADOS** (esquema de Production migrado 15/15, sin
datos). **7.6 — Frontend Production Configuration: COMPLETADO
(READY).** Build productivo generado y auditado (`dist/`, candidato
para 7.7), conectividad REST contra Production confirmada, mock
regression Passed. Detalle completo en `MDs/14_DEPLOYMENT_PLAN.md`
(sección "7.6") y en
`Contexto/03_DEPLOYMENT/06_FRONTEND_PRODUCTION_CONTEXT.md` (contexto
específico para 7.7).

## Decisiones confirmadas — no volver a preguntar

- **Hosting frontend:** Hostinger, modalidad SPA estática (`dist/`).
- **Staging:** ninguno. Modelo Local → Production.
- **Supabase Production = `habit-tracker` (`xgasncrztfwotjlghlfg`,
  `us-east-1`, Free) — esquema completo (15/15 migraciones) ya
  aplicado.** No es necesario crear un proyecto nuevo.
- **Email confirmation V1:** **DESACTIVADA** — decisión explícita del
  Product Owner. No configurar SMTP en este bloque.
- **Dominio inicial:** subdominio/URL temporal de Hostinger; dominio
  propio más adelante.
- **Source maps:** no publicar (comportamiento por defecto de Vite).
- **`VITE_DATA_SOURCE`:** `supabase` únicamente en la config de build
  productivo de Hostinger, nunca editando `.env.local`.
- **Build productivo:** `npm ci` + `npm run build`, generado localmente
  con variables de producción exportadas temporalmente (Estrategia A).
- **`Contexto/`/`MDs/`:** ya versionados en `origin/main`, sin secretos.

## Estado real del proyecto `habit-tracker` (post 7.5B)

- **Migraciones aplicadas remotamente: 15/15.** Pending: 0. Confirmado
  con `list_migrations` y con un segundo `db push --dry-run` ("Remote
  database is up to date").
- **Esquema:** 7/7 tablas, RLS/policies/grants/functions/RPC/triggers/
  constraints/índices en **MATCH exacto** contra Local (auditoría
  read-only exhaustiva, comparación 1:1, no asumida).
- **`habit_schedules`:** existe, con `EXCLUDE` de no-solapamiento e
  índice único de "una versión vigente por hábito", RPC
  `create_habit_schedule`/`change_habit_schedule` operativas.
- **Datos: 0 filas en las 7 tablas, 0 usuarios en `auth.users`.** El
  `db push` no creó ningún dato de aplicación.
- **Seguridad:** 2 advisories WARN (RPC `SECURITY DEFINER` expuestas a
  `authenticated`) — esperadas y por diseño, ya revisadas en QA 6.3I,
  no corregidas por no ser una regresión.

**El proyecto ahora es funcionalmente utilizable para la app** — antes
de 7.5B le faltaban los grants de tabla (`table_privileges.sql`) y toda
la lógica de negocio (RPC/triggers), lo que lo hacía inservible.

## CLI local — estado

**LINKED.** `supabase/.temp/project-ref` = `xgasncrztfwotjlghlfg`
(vinculado en 7.5A, confirmado tras el push en 7.5B). El CLI está
autenticado (`supabase login` ya ejecutado por el Product Owner).

## Salvaguarda para futuras migraciones

Cualquier migración **nueva** que se agregue en el futuro deberá seguir
el mismo patrón ya validado: dry-run oficial antes de aplicar,
comparación literal contra lo esperado, autorización explícita
separada del Product Owner antes de cada `db push` real. Nunca editar
una migración ya aplicada — cualquier corrección es una migración
nueva y aditiva. Detalle del procedimiento completo en `MDs/14`,
secciones 7.3.11/7.3.12.

## Variables — quién vive dónde

**Públicas (`VITE_*`, van en la config de build de Hostinger):**
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_DATA_SOURCE`.

**Secretas (nunca en frontend/Git/dist, solo en el panel de Supabase o
un gestor de contraseñas):** DB password, JWT secret, `service_role`.

## Decisiones que aún necesita tomar el Product Owner

1. Confirmar si se avanza a **7.6 (Frontend Production Configuration)**
   o **7.8 (Auth/Domain/HTTPS)** primero.
2. Método de deploy en Hostinger (subida manual de `dist/` vs. Git
   deployment) — depende del plan contratado, no confirmado.
3. Auth remoto (Site URL, Redirect URLs) — pendiente hasta tener
   dominio/URL de Hostinger definitivo (bloque 7.8).

## Dónde está el detalle

`MDs/14_DEPLOYMENT_PLAN.md`, secciones "7.3", "7.4A", "7.4A
(continuación)", "7.4B", "7.5A", "7.5A (continuación)" y "7.5B":
arquitectura completa, matriz Local vs. Producción, inventario de
variables/secretos, comparación de esquema exhaustiva post-migración,
seguridad y prerrequisitos de los siguientes bloques.
