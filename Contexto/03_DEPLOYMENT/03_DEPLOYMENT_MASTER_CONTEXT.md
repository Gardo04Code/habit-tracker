# Deployment — Contexto maestro (Paso 7)

## Estado

Paso 6 — QA/E2E: **COMPLETADO**. Veredicto final (re-ejecución del Cierre
Final, `MDs/13_E2E_QA_TEST_PLAN.md`): **GO PARA PASO 7 — DEPLOYMENT**
(20/20 criterios de salida cumplidos, BUG-001..007 Fixed — Retest
Passed, cero bugs Críticos/Altos abiertos).

Paso 7 — Deployment:
- **7.1 — Deployment Discovery & Planning: COMPLETADO.**
- **7.2 — Git & Release Preparation: COMPLETADO (GO).**
- **7.2A — Security & Privacy Hardening: COMPLETADO (GO).**
- **7.2B — Release Staging, Commits & Push: COMPLETADO (GO).** `main` =
  `origin/main`, SHA `e452fef`. `npm audit` = 0 vulnerabilidades. PII de
  `mockUser.ts` corregida y pusheada.
- **7.3 — Production Environment Definition: COMPLETADO.** Ver
  `Contexto/03_DEPLOYMENT/04_PRODUCTION_ENVIRONMENT_CONTEXT.md` para el
  resumen de decisiones confirmadas, y `MDs/14_DEPLOYMENT_PLAN.md`
  (sección "7.3") para el detalle completo.
- **7.4A — Local Preflight: COMPLETADO (PASSED).** Docker Desktop ya
  operativo; `db reset` ejecutado con éxito (15/15 migraciones, sanity
  check estructural Passed — 7/7 tablas, RLS habilitada, RPC/funciones
  críticas presentes, 20 triggers), `tsc`/`lint`/`build`/`npm audit` en
  verde. Detalle en `MDs/14_DEPLOYMENT_PLAN.md` (sección "7.4A" y "7.4A
  (continuación)").
- **Reclasificación del proyecto histórico:** el Product Owner confirmó
  que `xgasncrztfwotjlghlfg` (nombre `habit-tracker`, región
  `us-east-1`, plan Free) **es un proyecto propio creado previamente**,
  no un remoto desconocido. Cambia de UNKNOWN/UNAUTHORIZED a
  **CONFIRMED USER PROJECT — PRODUCTION CANDIDATE**.
- **7.4B — Existing Supabase Read-Only Schema Audit: COMPLETADO.**
  Auditoría 100% read-only (MCP con SELECT únicamente) confirmó:
  esquema remoto = exactamente migraciones 1-2 de 15 aplicadas
  (`init_schema` + `harden_functions`), **cero filas de datos en
  cualquier tabla, cero usuarios de Auth**, sin Storage/Edge
  Functions/cron/Realtime. Clasificación: **B — PARTIAL OLD SCHEMA**.
  Recomendación: **SAFE TO REUSE AFTER CONTROLLED MIGRATION** (aplicar
  las 13 migraciones restantes en 7.5, sin `supabase link` todavía).
  Detalle completo en `MDs/14_DEPLOYMENT_PLAN.md` (sección "7.4B") y en
  `Contexto/03_DEPLOYMENT/05_SUPABASE_PRODUCTION_CONTEXT.md`.
- **7.5A — Database Migration Pre-Push: COMPLETADO (SAFE TO EXECUTE DB
  PUSH = YES, push ejecutado en 7.5B).** CLI autenticado y vinculado a
  `xgasncrztfwotjlghlfg`, dry-run confirmó las 13 migraciones
  pendientes sin discrepancias. Detalle en `MDs/14_DEPLOYMENT_PLAN.md`
  (secciones "7.5A" y "7.5A (continuación)").
- **7.5B — Database Migration Production: COMPLETADO (DATABASE
  MIGRATION = COMPLETED).** Las 13 migraciones pendientes se aplicaron
  con éxito contra `habit-tracker`/`xgasncrztfwotjlghlfg`. **Remote
  migrations: 15/15. Pending: 0.** Auditoría read-only exhaustiva
  post-push: 7/7 tablas, RLS/policies/grants/functions-RPC/triggers/
  constraints/índices en **MATCH exacto** contra Local (36 constraints,
  23 índices, 20 triggers, 24 funciones propias, 19 policies granulares
  — las policies `ALL` amplias de `init_schema.sql` ya no existen).
  **0 filas de datos, 0 usuarios** — el push no creó ningún dato.
  2 advisories WARN de seguridad (RPC `SECURITY DEFINER` expuestas a
  `authenticated`) clasificadas como esperadas/por diseño, no
  corregidas por no ser una regresión. `tsc`/`lint`/`build`/`npm audit`
  reconfirmados en verde. **Supabase Production ahora tiene el esquema
  completo de las 15 migraciones aprobadas, sin datos.** Detalle
  completo en `MDs/14_DEPLOYMENT_PLAN.md` (sección "7.5B").

- **7.6 — Frontend Production Configuration & Build Validation:
  COMPLETADO (READY).** Build productivo generado con
  `.env.production.local` (gitignored, no versionado):
  `VITE_SUPABASE_URL=https://xgasncrztfwotjlghlfg.supabase.co`,
  Publishable Key de Production (obtenida vía herramienta read-only,
  nunca reproducida completa), `VITE_DATA_SOURCE=supabase`. `dist/`
  auditado: sin endpoints locales reales, sin secretos prohibidos,
  apunta exclusivamente al Project Ref autorizado. Conectividad REST
  contra Production confirmada (401 esperado por RLS/grants, sin
  escrituras). SPA validado con `vite preview` (servidor real, no dev
  server) — 8/8 rutas 200. Mock regression Passed (`.env.local` sigue
  en `mock`, sin tocar). `tsc`/`lint`/`build`/`npm audit` en verde.
  `dist/` conservado como candidato para 7.7 (gitignored, no
  desplegado). Detalle completo en `MDs/14_DEPLOYMENT_PLAN.md`
  (sección "7.6") y en
  `Contexto/03_DEPLOYMENT/06_FRONTEND_PRODUCTION_CONTEXT.md`.

- **7.7A — codgoli.com/habitos Deployment Preparation: PAUSED (parte
  Hostinger) / GO (parte código).** Decisión definitiva:
  `https://codgoli.com/habitos` (subruta del sitio Codgoli existente,
  no subdominio, no dominio nuevo). Código: `src/main.tsx` con
  `basename={import.meta.env.BASE_URL}` (1 línea, sin impacto en
  desarrollo local), `public/.htaccess` nuevo (SPA fallback aislado a
  `/habitos/`, se bundlea automáticamente a `dist/.htaccess`). Build
  regenerado con `vite build --base=/habitos/`: assets/rutas
  correctamente prefijadas, auditado sin secretos, 8/8 rutas `/habitos/*`
  Passed vía `vite preview`. **Pendiente exclusivamente de que el
  Product Owner confirme el document root real de Codgoli en
  Hostinger** (sin acceso al panel desde este entorno) — el sitio
  Codgoli no fue tocado en ningún momento. Detalle completo en
  `MDs/14_DEPLOYMENT_PLAN.md` (sección "7.7A") y en
  `Contexto/03_DEPLOYMENT/07_HOSTINGER_CONTEXT.md`.

- **7.7B — Hostinger Pre-Upload & Deployment Preparation: COMPLETADO
  (GO PARA 7.7C).** Arquitectura confirmada por el Product Owner
  (verificación manual en Hostinger): document root = `public_html`,
  contenido actual = `.git/`, `index.html`, `README.md`;
  `public_html/habitos/` **no existe**; HTTPS confirmado. Build final
  regenerado desde cero (`vite build --base=/habitos/`): 7 archivos,
  2.2M, `index.html` con assets correctamente prefijados
  `/habitos/...`. Auditoría exhaustiva: 0 secretos reales, 0 proyectos
  Supabase inesperados (solo `xgasncrztfwotjlghlfg`), `tsc`/`lint`/
  `npm audit` en verde. 8/8 rutas `/habitos/*` Passed a nivel de
  servidor/assets (smoke interactivo real declarado `LIMITED` — sin
  herramienta de navegador en este entorno). Supabase Production
  reconfirmado: 15/15 migraciones, 0 filas, 0 usuarios, cero
  escrituras en este bloque. Estrategias de backup/upload/rollback
  para 7.7C diseñadas y documentadas, no ejecutadas. Detalle completo
  en `MDs/14_DEPLOYMENT_PLAN.md` (sección "7.7B").

- **7.7C — Hostinger First Deploy: COMPLETADO. FRONTEND DEPLOYED.** El
  Product Owner ejecutó manualmente la extracción de
  `habitos-deploy.zip` dentro de `public_html/habitos/` (el único paso
  que este entorno no podía realizar por falta de herramienta de
  acceso a Hostinger). Verificación post-upload independiente desde
  este entorno: `https://codgoli.com/habitos/` → 200; **7/7 deep
  links** Passed contra el servidor Apache/LiteSpeed real de Hostinger
  (primera prueba real, supera la aproximación de `vite preview` de
  bloques anteriores); assets **byte-idénticos** al `dist/` auditado
  (`diff` sin diferencias — cero corrupción en la subida); único
  Project Ref en el bundle desplegado: `xgasncrztfwotjlghlfg`; cero
  secretos; Supabase Production reconfirmado sin cambios (15/15
  migraciones, 0 filas, 0 usuarios); `https://codgoli.com/` intacto,
  sirviendo su propio contenido, sin redirigir a `/habitos`. Consola
  del navegador: `LIMITED` (sin herramienta de navegador en este
  entorno) — `ProtectedRoute` confirmado por observación directa del
  Product Owner + verificación cruzada contra el código ya auditado.
  Detalle completo en `MDs/14_DEPLOYMENT_PLAN.md` (sección "7.7C" y
  "7.7C (continuación)").

- **7.8 — Production Auth Configuration: COMPLETADO (AUTH PRODUCTION
  STATUS = READY).** El Product Owner configuró manualmente Site URL/
  Redirect URL (`https://codgoli.com/habitos/`, exacta, sin wildcard),
  Email Provider/Signup habilitados, Confirm Email desactivado, y
  ejecutó el primer signup real + login/logout/session
  persistence/deep-links directamente en producción — todo reportado
  `PASSED`. Verificación read-only independiente desde este entorno:
  `auth.users = 1`, `profiles = 1`, UUID compartido (trigger
  `handle_new_user` funcionando en Production), 0 filas en las 6
  tablas de dominio restantes, RLS/policies/constraints/triggers/
  functions **sin cambios** (7/19/36/20/25, idéntico a 7.5B/7.7C),
  `anon` sigue recibiendo `401` al intentar leer `profiles` incluso
  con una fila real presente. `tsc`/`lint`/`build`/`npm audit` en
  verde. Detalle completo en `MDs/14_DEPLOYMENT_PLAN.md` (secciones
  "7.8" y "7.8 (cierre)").

Supabase Production (`xgasncrztfwotjlghlfg`) **tiene el esquema
completo de las 15 migraciones aplicado**, Auth configurado y
verificado con el primer usuario real (`auth.users = 1`,
`profiles = 1`), cero datos de dominio. **Habit Tracker está
desplegado, autenticable y en producción en
`https://codgoli.com/habitos/`**, sin ningún impacto sobre el sitio
Codgoli existente.

## Qué se hizo en 7.1

Auditoría de solo lectura del repositorio + `npm run build` local (sin
cambios de código) para verificar el build productivo real. Se creó
documentación de Deployment. No se modificó código funcional, ni
migraciones, ni `.env.local`.

## Stack confirmado

React 19.2, TypeScript ~6.0 (`tsc -b` en el build), Vite 8.1
(`@vitejs/plugin-react`, `@tailwindcss/vite`), Tailwind CSS 4,
react-router-dom 7 (client-side, `<Routes>`/`<Route>`, sin loaders de
servidor), Framer Motion, Recharts, `@react-three/fiber`/`drei`/`three`
(usados en efectos decorativos), `@supabase/supabase-js` 2.112.

## Build

- Comando: `npm run build` → `tsc -b && vite build`.
- Output: `dist/` (`index.html`, `dist/assets/*.js`, `*.css`,
  `favicon.svg`, `icons.svg`).
- Resultado verificado en esta sesión: **build correcto**, sin errores.
- Warning conocido: chunk `index-*.js` ~1.23 MB (350 kB gzip) y
  `StatusDonut3D-*.js` ~1.0 MB (277 kB gzip) — supera el umbral de 500 kB
  de Vite. Ya aceptado como deuda técnica por QA (`MDs/13`, sección 12).
  No es bloqueante para 7.1; queda como candidato a code-splitting
  futuro (probablemente relacionado con `three`/`@react-three/fiber` del
  componente `StatusDonut3D`).
- **Hallazgo de esta auditoría:** el `dist/` generado con el
  `.env.local` actual (`VITE_DATA_SOURCE=mock`,
  `VITE_SUPABASE_URL=http://127.0.0.1:54321`) incrusta literalmente
  `127.0.0.1:54321` en el bundle — comportamiento esperado de Vite
  (inlining de `import.meta.env` en build time), pero confirma que
  **el build de producción debe ejecutarse con las variables de entorno
  del proveedor de hosting**, nunca reutilizando el `dist/` generado
  localmente con `.env.local`. Sin secretos reales (`service_role`,
  claves privadas) encontrados en el bundle — solo esa URL local.
  `dist/` generado en esta auditoría fue eliminado tras la inspección
  (no se commiteó, está `.gitignore`d de todas formas).

## SPA routing

`react-router-dom` en modo cliente puro. El hosting productivo deberá
servir `index.html` como fallback para cualquier ruta no encontrada
(`/checklist`, `/habits`, etc. recargadas directamente devolverían 404
sin esta configuración). Requisito registrado, sin implementar — depende
del proveedor elegido.

## Variables de entorno

`.env.example` (trackeado, sin valores):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_DATA_SOURCE=
```

`.env.local` (NO trackeado, confirmado ignorado por `.gitignore` con
`git check-ignore`): contiene la URL de Supabase Local
(`http://127.0.0.1:54321`), la `publishable key` de Supabase Local (no
es secreta — segura para cliente, RLS es la barrera real) y
`VITE_DATA_SOURCE=mock`. Sin `service_role`, sin `SECRET_KEY` en este
archivo ni en `src/` (verificado con `grep`, único resultado es un
comentario explicativo no ejecutable en `auth.service.ts`).

Todas las variables `VITE_*` son **públicas por diseño** (Vite las
incrusta en el bundle del cliente) — nunca deben contener secretos.

## Supabase

- **Local:** `supabase/config.toml` (`project_id = "Habitos"`, API
  puerto 54321, DB 54322, `major_version = 17`), 15 migraciones en
  `supabase/migrations/`. `db reset` local **reejecutado con éxito** en
  la continuación de 7.4A (15/15 migraciones, sanity check estructural
  Passed).
- **CLI local: NOT LINKED.** `supabase/.temp/project-ref` fue
  neutralizado en 7.4A (eliminación directa de filesystem) y sigue
  ausente — **ningún `supabase link` se ha ejecutado**, ni siquiera tras
  la reclasificación de 7.4B. Vincular el CLI sigue siendo un checkpoint
  humano separado (salvaguarda de la sección 7.3.12).
- Sin `seed.sql` en el repositorio (`find supabase -iname "seed*"` sin
  resultados) — coincide con lo reportado por QA.
- Últimas 3 migraciones: `20260804221046_create_habit_schedule.sql`,
  `20260805171711_goal_integrity_fixes.sql`,
  `20260806162035_goal_progress_concurrency.sql`.
- **Supabase Production:** proyecto `habit-tracker`
  (`xgasncrztfwotjlghlfg`, `us-east-1`, Free) **reclasificado como
  CONFIRMED USER PROJECT — PRODUCTION CANDIDATE** por el Product Owner.
  Auditoría read-only (7.4B) confirmó: solo 2/15 migraciones aplicadas
  remotamente, cero datos, cero usuarios, sin RPC/triggers de negocio,
  sin grants de tabla para `authenticated`/`anon`. Clasificación: **B —
  PARTIAL OLD SCHEMA**. Recomendación: **SAFE TO REUSE AFTER
  CONTROLLED MIGRATION** — ver
  `Contexto/03_DEPLOYMENT/05_SUPABASE_PRODUCTION_CONTEXT.md` y
  `MDs/14_DEPLOYMENT_PLAN.md` (sección "7.4B") para el detalle completo.

## Git

- Branch: `main`, sincronizado con `origin/main`
  (`https://github.com/Gardo04Code/habit-tracker.git`).
- **Estado actual (post 7.2B):** working tree limpio, `main` = `origin/main`
  en `e452fef`. Todo lo que en 7.1 aparecía como `M`/`??` (rediseño,
  integración Supabase, `Contexto/`, `MDs/`, `supabase/`) ya fue
  auditado, hardened (7.2A) y commiteado/pusheado (7.2B) en 10 commits
  trazables con Conventional Commits.

## Decisiones ya resueltas (no volver a preguntar)

1. **Proveedor de hosting del frontend:** Hostinger (confirmado por el
   Product Owner).
2. **Staging separado:** no se usará inicialmente. Modelo: Local →
   Production.
3. **`Contexto/` y `MDs/` versionados:** sí, ya están en `origin/main`
   (auditados sin secretos en 7.2, commits `e7e27b3`/`5711047`).
4. **Política de source maps:** no publicar en V1 (confirmado además que
   Vite no los genera por defecto — sin cambios necesarios en
   `vite.config.ts`).

## Decisiones pendientes reales (tras 7.4B)

1. **Autorización para aplicar las 13 migraciones restantes a
   `habit-tracker`/`xgasncrztfwotjlghlfg` (7.5)** — la reutilización ya
   fue recomendada (SAFE TO REUSE AFTER CONTROLLED MIGRATION), pero
   `supabase link` y `db push` siguen requiriendo checkpoints humanos
   separados conforme a la salvaguarda de CLI (7.3.12) — ambos aún no
   ejecutados.
2. **Dominio productivo:** se usará inicialmente la URL/subdominio
   temporal de Hostinger; dominio propio queda para más adelante.
3. **Confirmación de email en Auth de producción:** ya decidida
   (DESACTIVADA para V1, decisión explícita del Product Owner, ver
   `MDs/14` sección 7.3.15) — no volver a preguntar.
4. **Método de deploy en Hostinger** (subida manual de `dist/` vs. Git
   deployment): depende del plan de Hostinger contratado, todavía sin
   confirmar.

Ver `MDs/14_DEPLOYMENT_PLAN.md` (secciones "7.3", "7.4A" y "7.4B") para
el detalle completo, y
`Contexto/03_DEPLOYMENT/04_PRODUCTION_ENVIRONMENT_CONTEXT.md` /
`Contexto/03_DEPLOYMENT/05_SUPABASE_PRODUCTION_CONTEXT.md` para el
resumen breve de arranque de sesión.

## Actualización post-QA (7.9A/7.9B/7.10A) — nuevo Release Candidate

Tras el cierre de Production Smoke (bloque QA, no Deployment) existe un
**nuevo Release Candidate frontend-only** con los 8 `BUG-PROD-00X`
corregidos y retesteados manualmente (8/8 PASSED). Detalle completo,
manifest y auditoría del artefacto en `MDs/14_DEPLOYMENT_PLAN.md`,
sección "7.10A — Controlled Redeployment Preparation". Resumen:

- Sin cambios de schema/migraciones (15/15 sin cambios).
- Build generado y auditado (`MSYS_NO_PATHCONV=1 npx vite build
  --base=/habitos/`), sin referencias reales a Local/QA.
- **NO desplegado todavía** — Production sigue en el build de 7.7C.
- Working tree local sigue sin commitear (mezcla los cambios
  deployed-but-uncommitted de 7.7A con los 8 fixes nuevos) — decisión
  de commit pendiente del Product Owner.

No se erasa ni se reemplaza el historial de 7.1-7.8 de este documento
— esta sección es aditiva.

## Actualización 7.10B — Release commiteado, deployment pendiente de ejecución manual

**LOCAL FIX VALIDATED → COMMITTED → DEPLOYMENT PENDING.**

El Product Owner autorizó explícitamente el commit del Release
Candidate. Estado actual:

- **Release SHA: `3eaa0af`** (sobre `e452fef`). `git push`: **NO
  ejecutado** — pendiente de autorización separada.
- Build re-generado y re-auditado desde ese SHA exacto: mismo resultado
  que 7.10A (hashes de contenido idénticos, sin referencias reales
  Local/QA, URL de Production correctamente embebida).
- **Producción sigue sin actualizar.** Este entorno no tiene
  herramienta de acceso a Hostinger ni de navegador (mismo bloqueo ya
  documentado en 7.7C/7.8) — backup, subida, y Production Smoke
  quedan pendientes de ejecución manual del Product Owner. Detalle
  completo y checklist exacto en `MDs/14_DEPLOYMENT_PLAN.md`, sección
  "7.10B — Controlled Redeployment".

No se erasa ni se reemplaza ningún historial anterior — esta sección
es aditiva.

## Actualización 7.10B (cierre) — Desplegado, Production Smoke PASSED

**Cadena final: LOCAL FIX VALIDATED → COMMITTED → DEPLOYED → PRODUCTION
SMOKE PASSED.**

- **Release SHA: `3eaa0af`.**
- **Deployment: SUCCESS.** Ejecutado manualmente por el Product Owner
  vía Hostinger File Manager (método manual, no automatizado desde este
  entorno — sin herramienta de acceso a Hostinger). Los 7 archivos del
  release quedaron correctamente ubicados en `public_html/habitos/`
  tras corregir un incidente de extracción anidada (detalle completo en
  `MDs/14_DEPLOYMENT_PLAN.md`, sección "7.10B").
- **Production DB:** limpiada de datos funcionales de Smoke/QA antes
  del redeploy (7.10B-1) — estado limpio funcional: `auth.users=1`,
  `profiles=1`, `categories=habits=habit_categories=habit_schedules=
  habit_logs=goals=0`. Usuario y perfil de Production preservados.
- **Production Smoke (post-deploy): PASSED.** Los 8 `BUG-PROD-00X`
  confirmados como resueltos en Production real por el Product Owner.
- **Rollback: NOT REQUIRED.**
- **`git push`: pendiente de este mismo bloque de cierre (7.10C).**

No se erasa ni se reemplaza ningún historial anterior — esta sección es
aditiva.
