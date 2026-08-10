# Release Candidate Manifest — Habit Tracker V1

**Fecha:** 2026-08-10. **Bloque:** 7.2 — Git & Release Preparation.
**Rol:** Principal Release Engineer / Senior DevOps Engineer / Senior Git
Engineer / QA Release Manager. **Alcance:** auditoría de solo lectura +
plan de commits. **No se ejecutó `git add`/`commit`/`push`.**

## Estado del release

Release Candidate **hardened y técnicamente preparado para commits**
(bloque 7.2A completado). Working tree auditado completo en 7.2, cero
secretos reales, build/tsc/lint en verde, 0 vulnerabilidades npm tras
7.2A, PII de `mockUser.ts` reemplazada. Pendiente autorización del
Product Owner para pasar a `git add`/`commit` (7.2B).

## Baseline QA

Paso 6 — QA/E2E: **COMPLETADO**. Veredicto (`MDs/13_E2E_QA_TEST_PLAN.md`,
"Re-ejecución del Cierre Final del Paso 6"): **GO PARA PASO 7 —
DEPLOYMENT**. BUG-001 a BUG-007: 7/7 Fixed — Retest Passed, cero bugs
Críticos/Altos abiertos. 15 migraciones, `tsc`/`lint`/`build`/`db reset`
en verde, `.env.local` restaurado a `mock`. No se repitió la batería
completa de QA en esta tarea — solo las verificaciones mínimas de
Release Preparation (sección "Validación técnica" más abajo).

## Branch

`main`. Sincronizado con `origin/main`
(`https://github.com/Gardo04Code/habit-tracker.git`) — `git status`
reporta "up to date", ningún commit local ni remoto pendiente.

## Commit base

`7e204a7` — "feat: redesign full app with Oxford Blue design system and
Framer Motion" (`HEAD` actual, último commit real en `main`).

## Inventario de cambios

- **35 archivos modificados** (`M`): `.gitignore`, `eslint.config.js`,
  `package.json`, `package-lock.json`, `src/App.tsx`, más 30 componentes
  /páginas/hooks/utils bajo `src/`.
- **68 archivos untracked** (`??`), incluyendo directorios completos:
  `.env.example`; 21 archivos bajo `Contexto/`; `MDs/09` a `MDs/15`
  (7 documentos, incluido este manifest); `src/components/settings/CategoriesSection.tsx`;
  `src/contexts/AuthContext.tsx`; 5 hooks nuevos
  (`useAuth`, `useCategories`, `useDashboard`, `useGoals`, `useHabits`);
  4 archivos bajo `src/lib/`; `src/pages/LoginPage.tsx`;
  `src/routes/ProtectedRoute.tsx`; 8 archivos bajo `src/services/`;
  `src/types/database.types.ts`, `src/types/entities.ts`,
  `src/vite-env.d.ts`; y `supabase/` completo (`.gitignore`,
  `config.toml`, 15 migraciones).
- **0 archivos eliminados.** **0 archivos renombrados** (confirmado con
  `git diff --name-status`, solo códigos `M`, ningún `D`/`R`).
- Diff de los 35 `M`: **2221 inserciones / 420 eliminaciones** (`git diff --stat`).

## Clasificación completa del working tree

### A — Código funcional necesario para V1

`src/App.tsx` (M — agrega rutas `/login`, `AuthProvider`, `ProtectedRoute`),
`src/hooks/useAuth.ts`, `src/hooks/useCategories.ts`,
`src/hooks/useDashboard.ts`, `src/hooks/useGoals.ts`,
`src/hooks/useHabits.ts`, `src/hooks/useDailyChecklist.ts` (M),
`src/hooks/useHistoryLogs.ts` (M), `src/hooks/useStatistics.ts` (M),
`src/contexts/AuthContext.tsx`, `src/pages/LoginPage.tsx`,
`src/routes/ProtectedRoute.tsx`, `src/utils/habitSchedule.ts` (M),
`src/utils/exportHistory.ts` (M).

### B — UI / rediseño necesario para V1

Los 24 componentes/páginas `M` restantes (Oxford Blue + Framer Motion +
fixes BUG-001..007, mezclados en el mismo diff porque se desarrollaron en
la misma sesión sobre los mismos archivos): `HabitMissionCard.tsx`,
`StreakTimeline.tsx`, `TodaySummary.tsx`, `GoalFormModal.tsx`,
`GoalGeneralHero.tsx`, `GoalListRow.tsx`, `DeleteHabitModal.tsx`,
`HabitCard.tsx`, `HabitFilters.tsx`, `HabitFormModal.tsx`,
`HabitListRow.tsx`, `HistoryCalendar.tsx`, `HistoryFilters.tsx`,
`HistoryTable.tsx`, `TopHeader.tsx`, `StatisticsFilters.tsx`,
`OverflowMenu.tsx`, `DailyChecklistPage.tsx`, `DashboardPage.tsx`,
`GoalsPage.tsx`, `HabitsPage.tsx`, `HistoryPage.tsx`, `SettingsPage.tsx`,
`StatisticsPage.tsx`. Más `src/components/settings/CategoriesSection.tsx`
(nuevo, consumido por `SettingsPage.tsx`).

### C — Integración Supabase necesaria para V1

`src/lib/supabase.ts`, `src/lib/dataSource.ts`, `src/lib/errors.ts`,
`src/lib/supabaseHealth.ts`, `src/services/auth.service.ts`,
`src/services/profiles.service.ts`, `src/services/categories.service.ts`,
`src/services/habits.service.ts`, `src/services/goals.service.ts`,
`src/services/habitLogs.service.ts`,
`src/services/habitSchedules.service.ts`, `src/services/index.ts`.

### D — Migraciones necesarias para V1

Las 15 migraciones en `supabase/migrations/` + `supabase/config.toml` +
`supabase/.gitignore`.

### E — Tipos / contratos / utilidades necesarias

`src/types/database.types.ts` (generado desde Supabase Local),
`src/types/entities.ts`, `src/types/goal.ts` (M), `src/vite-env.d.ts`.

### F — Documentación técnica necesaria

`MDs/09_DATABASE_AUDIT.md`, `MDs/10_DATABASE_DECISIONS.md`,
`MDs/11_DATABASE_VALIDATION_REPORT.md`,
`MDs/12_BACKEND_INTEGRATION_SETUP.md`, `MDs/13_E2E_QA_TEST_PLAN.md`,
`MDs/14_DEPLOYMENT_PLAN.md`, `MDs/15_RELEASE_CANDIDATE_MANIFEST.md`
(este archivo, creado en 7.2).

### G — Contextos de trabajo candidatos a versionarse

Los 21 archivos bajo `Contexto/` (`00_GLOBAL`, `01_DISCOVERY`,
`02_DEVELOPMENT/*`, `03_DEPLOYMENT/*`). Auditados en esta tarea (ver
sección "Auditoría de secretos" y "Estado de Contexto/") — **sin
secretos ni credenciales**. Quedan como candidatos confirmados a
versionarse, pendiente de la decisión final del Product Owner (ya
indicada como "sí, si están limpios" en el encargo de esta tarea).

### H — Configuración necesaria

`.gitignore` (M — agrega `.mcp.json`, `.env`, `.env.local`),
`eslint.config.js` (M — excluye `supabase/` del lint de frontend),
`package.json` (M — agrega `@supabase/supabase-js`, `supabase` CLI),
`package-lock.json` (M, coherente con el anterior), `.env.example`
(nuevo, sin valores reales).

### I — Archivos locales que NO deben versionarse

`.env.local` (ya ignorado, confirmado con `git check-ignore`), `dist/`
(ya ignorado; generado y eliminado dos veces durante esta auditoría y la
anterior, nunca comiteado), `node_modules/` (ignorado),
`supabase/.temp/` y `supabase/.branches/` (ignorados por
`supabase/.gitignore`, incluye `supabase/.temp/project-ref` →
`xgasncrztfwotjlghlfg`, el vínculo remoto no autorizado).

### J — Temporales / scratch / evidencia QA que NO debe versionarse

Ninguno encontrado en el working tree. Los scripts de prueba de QA
(p. ej. `block-6-3i.mjs`, mencionado en `MDs/13`) se mantuvieron
deliberadamente **fuera del repositorio** según su propia documentación
— no hay artefactos Playwright, `test-results/`, `coverage/` ni
capturas QA en el árbol de trabajo actual (`find`/`git status --ignored`
sin resultados).

### K — Dudosos / requieren decisión

Ninguno de los archivos `??`/`M` actuales — la clasificación A-J cubre
el 100% del working tree sin ambigüedad. El único punto "dudoso"
detectado es el hallazgo de la sección "Auditoría de secretos" sobre
`src/data/mockUser.ts` (archivo **ya trackeado**, sin cambios en este
diff — ver esa sección).

## Archivos que deben versionarse

Todos los de las categorías **A, B, C, D, E, F, H**, y **G** (Contexto/)
condicionado a la confirmación final del Product Owner sobre
versionamiento de documentación (ya orientada a "sí" en el encargo,
sección "Estado de Contexto/" confirma que está limpio).

## Archivos que NO deben versionarse

Categoría **I** completa: `.env.local`, `dist/`, `node_modules/`,
`supabase/.temp/`, `supabase/.branches/`. Ya cubiertos correctamente por
`.gitignore`/`supabase/.gitignore` — ninguna acción requerida.

## Archivos dudosos

Ninguno pendiente de clasificar. Ver nota sobre `mockUser.ts` en
"Auditoría de secretos" — no es parte del Release Candidate actual (ya
está en `main` desde un commit anterior), se documenta como hallazgo
para que el Product Owner decida si amerita una tarea correctiva
separada.

## Código huérfano encontrado

Revalidado por búsqueda de imports/consumidores reales (no solo texto):

| Archivo | Consumidores reales | Estado |
|---|---|---|
| `src/hooks/useHabitsManager.ts` | Ninguno (las 2 coincidencias de texto en `useHabits.ts`/`habits.service.ts` son comentarios que lo mencionan como código previo, no imports) | **Huérfano, confirmado** (ya conocido por QA) |
| `src/hooks/useGoalsManager.ts` | Ninguno | **Huérfano, confirmado** (ya conocido por QA) |
| `src/lib/supabaseHealth.ts` (`checkSupabaseConnection`) | Ninguno — cero archivos importan `checkSupabaseConnection` en todo `src/` | **Huérfano, hallazgo nuevo de esta auditoría** (no estaba en la lista de QA) |

No se eliminó ni modificó ninguno de los tres. Quedan documentados para
una eventual tarea de limpieza post-release, fuera de 7.2.

## Auditoría de secretos

`grep` recursivo sobre `src/`, `Contexto/`, `MDs/`, `supabase/config.toml`,
`supabase/migrations/`, `.env.example` con los patrones solicitados
(`service_role`, `SUPABASE_SERVICE_ROLE`, `JWT_SECRET`, `DATABASE_URL`,
`DB_PASSWORD`, `password=`, `apikey`, `api_key`, `secret`, `token`,
`Bearer`, `PRIVATE_KEY`, `BEGIN PRIVATE KEY`, `access_token`,
`refresh_token`) + búsqueda dedicada de literales `sb_secret_*` y JWT
(`eyJ...`) en el bundle de producción: **cero secretos reales
encontrados.** Todas las coincidencias de `service_role` son texto
documental/comentarios que explican por qué NO se usa en el frontend
(ya auditado exhaustivamente por QA en `MDs/13`, SEC-019).
`.env.local` no está trackeado; `.env.example` no tiene valores.

**Hallazgo no-secreto, PII:** `src/data/mockUser.ts` (archivo **ya
trackeado desde un commit anterior a esta sesión**, sin cambios en el
diff actual) contiene un correo electrónico real hardcodeado como dato
mock (`isc***@g***.com`, dominio gmail.com), consumido por `Sidebar.tsx`,
`TopHeader.tsx`, `useDashboard.ts`, `useSettingsForm.ts` y
`DailyChecklistPage.tsx`. No es una credencial ni un secreto técnico,
pero es información personal identificable ya presente en el historial
de `main` (y por tanto, si el remoto es público, ya expuesta con
independencia de lo que se decida en este bloque 7.2). **No se modificó**
(fuera del alcance de un archivo ya commiteado sin relación con el
Release Candidate actual). Se reporta para que el Product Owner decida
si amerita una tarea correctiva separada (reemplazar por un dato
ficticio) — no bloquea 7.2 porque no es parte de los cambios a preparar
para commit.

**Veredicto de esta sección: sin hallazgos que detengan la tarea** (el
único hallazgo es PII pre-existente y ya en el historial, no un secreto
nuevo en los cambios a preparar).

## Dependencias

- `package-lock.json` presente y coherente con `package.json` (diff
  revisado: agrega únicamente `@supabase/supabase-js` y `supabase` CLI
  como entradas nuevas, sin cambios de versión en dependencias
  preexistentes).
- Scripts relevantes sin cambios: `dev`, `build` (`tsc -b && vite build`),
  `lint`, `preview`.
- `npm audit` (solo lectura, sin `fix`): **5 vulnerabilidades — 4 High,
  1 Moderate**:
  - `brace-expansion` (High, DoS por expansión no acotada) — dependencia
    transitiva de tooling, `fix available`.
  - `nanoid` (High, generador puede loopear indefinidamente con
    `size=0`) — transitiva, `fix available`.
  - `postcss` (Moderate, lectura de `.map` arbitrario si `from` no está
    definido) — transitiva (Tailwind), `fix available`.
  - `react-router` / `react-router-dom` (High, CSRF bypass en modo RSC)
    — **dependencia directa**, `7.12.0-pre.0 - 7.18.1` instalada,
    `fix available`. Este proyecto no usa RSC (SPA cliente puro), por lo
    que el vector específico de la CVE no aplica al uso actual, pero es
    la única vulnerabilidad sobre una dependencia directa y con mayor
    severidad — candidata a actualizar antes de producción.
  - No se ejecutó `npm audit fix` (prohibido en 7.2). Reportado para
    decisión en un bloque posterior (7.3 o antes del deploy real).

## Build

- `npx tsc --noEmit`: **Passed** (sin salida).
- `npm run lint`: **Passed** (sin salida).
- `npm run build`: **Passed** — mismo warning conocido de chunk-size
  (`index-*.js` ~1.23 MB / 350 kB gzip, `StatusDonut3D-*.js` ~1.0 MB /
  277 kB gzip), no tratado como bug nuevo, deuda técnica ya aceptada por
  QA.
- `dist/` generado y verificado (sin secretos: 0 coincidencias de
  `service_role`/`JWT_SECRET`/`PRIVATE_KEY`/`xgasncrztfwotjlghlfg`; solo
  las URLs esperadas `127.0.0.1`/`localhost` provenientes de
  `.env.local`) y **eliminado** tras la inspección — confirmado
  ignorado por `.gitignore`, no se agregó a Git.

## Deuda técnica aceptada

Heredada de QA (`MDs/13`, sección 17), sin cambios: warning de
chunk-size, consultas duplicadas por `React.StrictMode` en desarrollo,
perfil de Configuración mock-only, segundo control de logout decorativo,
`useHabitsManager`/`useGoalsManager` huérfanos (reconfirmados en esta
tarea), hallazgos de accesibilidad menores ya documentados, riesgo
residual bajo del desfase de reloj Docker (específico de entorno local).
**Nuevo en 7.2:** `checkSupabaseConnection` (`supabaseHealth.ts`)
huérfano; 5 vulnerabilidades de `npm audit` (detalladas arriba); PII de
`mockUser.ts` (pre-existente, no nueva).

## Riesgos conocidos

- Vulnerabilidad High en `react-router`/`react-router-dom` (dependencia
  directa) — bajo impacto real dado que el proyecto no usa RSC, pero
  recomendable resolver antes del deploy productivo.
- PII (`mockUser.ts`) ya en el historial de `main` — si el repositorio
  llegara a hacerse público sin haberlo corregido, el correo queda
  expuesto independientemente de las decisiones de este bloque.
- El build productivo real deberá generarse con las variables de
  Hostinger, nunca reutilizando un `dist/` local (ya documentado desde
  7.1).
- `Contexto/`/`MDs/` son grandes (documentan todo el proceso, incluidas
  transcripciones de pruebas) — versionarlos aumenta el tamaño del repo
  pero no representa riesgo de seguridad tras esta auditoría.

## Supabase remoto

`xgasncrztfwotjlghlfg` permanece **NO AUTORIZADO / DESCONOCIDO** para el
Product Owner. Confirmado en esta tarea únicamente por inspección de
archivos locales (`supabase/.temp/project-ref`, ignorado por Git, no
trackeado, no se tocó ni se consultó el proyecto remoto en ningún
momento). **Cero operaciones remotas ejecutadas** (`link`, `db push`,
`migration up`, SQL, MCP, Auth, Storage, Edge Functions, usuarios,
secretos): ninguna. El futuro proyecto de producción se creará o
identificará explícitamente en un bloque posterior del Paso 7 (7.4).

## Hosting

**Hostinger**, confirmado por el Product Owner como destino de
producción (decisión ya tomada, no se vuelve a preguntar). Sin dominio
propio para el primer release — se usará el subdominio/dominio
disponible en Hostinger inicialmente. Sin staging. Flujo previsto:
Supabase Local → Release Candidate → Supabase Production → Hostinger
Production. Ninguna acción de despliegue ni configuración de Hostinger
se ejecutó en este bloque.

## Plan de commits

Basado en el diff real (no en una plantilla genérica). 8 commits
propuestos, en orden de dependencia:

### 1. `chore: ignore Supabase CLI artifacts and local env files`
- **Objetivo:** preparar la base de configuración antes de introducir
  código que dependa de ella.
- **Archivos:** `.gitignore`, `eslint.config.js`.
- **Dependencias:** ninguna (primer commit).
- **Riesgo:** ninguno — cambios de configuración puros, ya verificados
  (`.env.local` sigue ignorado, `supabase/` excluido del lint).

### 2. `feat(db): add Supabase schema and 15 migrations`
- **Objetivo:** introducir el esquema de base de datos versionado.
- **Archivos:** `supabase/config.toml`, `supabase/.gitignore`,
  `supabase/migrations/*.sql` (15 archivos).
- **Dependencias:** ninguna técnica; lógicamente después del commit 1
  (para que el lint ya las excluya desde el primer momento en que
  aparecen en el índice).
- **Riesgo:** bajo — son archivos SQL estáticos, sin ejecución
  implicada por el commit en sí; ya auditados sin secretos, sin
  referencias a `localhost` embebidas como configuración operativa, sin
  IDs de proyecto remoto.

### 3. `feat: add typed Supabase client and data-source layer`
- **Objetivo:** introducir el cliente Supabase tipado y el switch
  mock/supabase.
- **Archivos:** `src/lib/supabase.ts`, `src/lib/dataSource.ts`,
  `src/lib/errors.ts`, `src/lib/supabaseHealth.ts`,
  `src/types/database.types.ts`, `src/types/entities.ts`,
  `src/vite-env.d.ts`, `.env.example`, `package.json`,
  `package-lock.json`.
- **Dependencias:** conceptualmente depende del commit 2 (los tipos se
  generaron desde ese esquema), sin dependencia técnica de Git.
- **Riesgo:** bajo — capa de infraestructura sin efectos secundarios en
  UI todavía.

### 4. `feat: add Supabase service layer`
- **Objetivo:** introducir los servicios de acceso a datos.
- **Archivos:** `src/services/auth.service.ts`,
  `src/services/profiles.service.ts`,
  `src/services/categories.service.ts`, `src/services/habits.service.ts`,
  `src/services/goals.service.ts`, `src/services/habitLogs.service.ts`,
  `src/services/habitSchedules.service.ts`, `src/services/index.ts`.
- **Dependencias:** commit 3 (usa `src/lib/supabase.ts`).
- **Riesgo:** bajo — sin UI todavía; ya validado por QA extensivamente
  (RLS, aislamiento, ausencia de `service_role`).

### 5. `feat: add authentication (context, hook, login page, guarded routes)`
- **Objetivo:** habilitar Auth real end-to-end.
- **Archivos:** `src/contexts/AuthContext.tsx`, `src/hooks/useAuth.ts`,
  `src/pages/LoginPage.tsx`, `src/routes/ProtectedRoute.tsx`,
  `src/App.tsx`.
- **Dependencias:** commit 4 (`authService`).
- **Riesgo:** medio — es el primer commit que cambia el comportamiento
  observable de la app (rutas protegidas); ya cubierto extensamente por
  QA (`MDs/13`, signup/login/logout/persistencia de sesión/aislamiento
  A-B).

### 6. `feat: wire habits, categories and goals to Supabase`
- **Objetivo:** conectar hooks de Hábitos/Categorías/Metas al backend
  real, manteniendo el modo mock disponible.
- **Archivos:** `src/hooks/useHabits.ts`, `src/hooks/useCategories.ts`,
  `src/hooks/useGoals.ts`, `src/hooks/useDashboard.ts`,
  `src/components/settings/CategoriesSection.tsx`,
  `src/pages/SettingsPage.tsx`.
- **Dependencias:** commit 4.
- **Riesgo:** medio — lógica de negocio real (concurrencia de Goal
  Progress, BUG-002); ya retesteado por QA.

### 7. `feat: wire checklist, history and statistics to Supabase`
- **Objetivo:** conectar Checklist/Historial/Estadísticas.
- **Archivos:** `src/hooks/useDailyChecklist.ts`,
  `src/hooks/useHistoryLogs.ts`, `src/hooks/useStatistics.ts`,
  `src/utils/habitSchedule.ts`, `src/utils/exportHistory.ts`,
  `src/types/goal.ts`.
- **Dependencias:** commit 4 (y conceptualmente 6, por el schedule
  histórico de BUG-004).
- **Riesgo:** medio — mismo perfil que el commit 6, ya retesteado por
  QA (BUG-003/004/005).

### 8. `feat(ui): redesign app with Oxford Blue design system and Framer Motion`
- **Objetivo:** aplicar el rediseño visual completo, incluidas las
  correcciones de layout de BUG-001/005/006/007 (mismos archivos que el
  rediseño, no separables sin reescribir el diff).
- **Archivos:** los 23 componentes/páginas de la categoría B no listados
  ya en los commits 3-7 (`HabitMissionCard.tsx`, `StreakTimeline.tsx`,
  `TodaySummary.tsx`, `GoalFormModal.tsx`, `GoalGeneralHero.tsx`,
  `GoalListRow.tsx`, `DeleteHabitModal.tsx`, `HabitCard.tsx`,
  `HabitFilters.tsx`, `HabitFormModal.tsx`, `HabitListRow.tsx`,
  `HistoryCalendar.tsx`, `HistoryFilters.tsx`, `HistoryTable.tsx`,
  `TopHeader.tsx`, `StatisticsFilters.tsx`, `OverflowMenu.tsx`,
  `DailyChecklistPage.tsx`, `DashboardPage.tsx`, `GoalsPage.tsx`,
  `HabitsPage.tsx`, `HistoryPage.tsx`, `StatisticsPage.tsx`).
- **Dependencias:** commits 5-7 (usa los hooks ya conectados).
- **Riesgo:** medio-alto por volumen (mayor diff de todos), pero ya
  100% retesteado por QA (Cierre Final + Re-ejecución, responsive,
  accesibilidad básica, BUG-001..007).

### 9. `docs: add database, backend integration, QA and deployment documentation`
- **Objetivo:** versionar la documentación técnica del proyecto.
- **Archivos:** `MDs/09_DATABASE_AUDIT.md`, `MDs/10_DATABASE_DECISIONS.md`,
  `MDs/11_DATABASE_VALIDATION_REPORT.md`,
  `MDs/12_BACKEND_INTEGRATION_SETUP.md`, `MDs/13_E2E_QA_TEST_PLAN.md`,
  `MDs/14_DEPLOYMENT_PLAN.md`, `MDs/15_RELEASE_CANDIDATE_MANIFEST.md`.
- **Dependencias:** ninguna técnica; lógicamente al final porque
  documenta todo lo anterior.
- **Riesgo:** ninguno — ya auditado sin secretos en esta tarea.

### 10. `docs: add session context files for Discovery, Development and Deployment`
- **Objetivo:** versionar `Contexto/` (pendiente de confirmación final
  del Product Owner, ya auditado como limpio en esta tarea).
- **Archivos:** los 21 archivos bajo `Contexto/`.
- **Dependencias:** ninguna.
- **Riesgo:** ninguno técnico — único punto abierto es si el Product
  Owner prefiere mantener `Contexto/` fuera del repositorio público por
  preferencia editorial, no por seguridad (ya descartado ningún
  secreto).

No se propone un único commit gigantesco (el diff cubre capas
claramente separables: config → DB → cliente → servicios → auth →
features → UI → docs) ni se fragmentan artificialmente los archivos de
UI que comparten el mismo cambio interdependiente (commit 8).

## Checklist previo a staging

- [x] Inventario completo del working tree (35 `M` + 68 `??`, 0 `D`/`R`).
- [x] Cero secretos reales en el Release Candidate (PII pre-existente en
      `mockUser.ts` documentada aparte, no bloquea).
- [x] 15 migraciones coherentes, sin duplicados, sin secretos, sin
      referencias operativas a `localhost` ni a `xgasncrztfwotjlghlfg`.
- [x] `tsc`/`lint`/`build` en verde.
- [x] `.env.local` no trackeado, termina en `VITE_DATA_SOURCE=mock`.
- [x] `dist/` ignorado y no comiteado.
- [x] `supabase/.temp/` (incluido el `project-ref` no autorizado)
      ignorado y no trackeado.
- [x] Código huérfano identificado y documentado (no eliminado).
- [x] Plan de commits diseñado, sin ejecutar.
- [ ] Autorización explícita del Product Owner para iniciar `git add`/
      `commit` (pendiente — este es el único paso que falta para pasar
      a staging).

## Decisión 7.2

**GO PARA PREPARAR COMMITS.**

El Release Candidate está íntegramente inventariado, sin secretos reales,
con build/tsc/lint en verde, con las 15 migraciones esperadas intactas,
y con un plan de commits basado en el diff real. El único hallazgo
material (PII en `mockUser.ts`) es pre-existente, ya está en el
historial de `main`, y no forma parte de los cambios que este bloque
prepararía para commit — no constituye un NO-GO de 7.2, pero se
recomienda que el Product Owner decida si amerita una tarea correctiva
independiente. La vulnerabilidad High de `react-router` (dependencia
directa) tampoco bloquea 7.2 (no se instalan ni actualizan dependencias
en este bloque) pero se recomienda resolverla antes del deploy real
(candidata para 7.3 o una tarea de mantenimiento previa).

**No se ejecuta `git add`/`commit`/`push` en esta tarea.** Queda a la
espera de autorización explícita del Product Owner para el siguiente
bloque (staging real de estos commits).

---

## Security & Privacy Hardening — 7.2A

**Fecha:** 2026-08-10. **Rol:** Principal Application Security Engineer
/ Senior React-TypeScript Engineer / Senior Release Engineer / QA
Regression Engineer. **Alcance:** resolver los dos hallazgos de 7.2
(vulnerabilidades npm + PII de `mockUser.ts`) antes de preparar los
commits definitivos. **No se ejecutó `git add`/`commit`/`push`.**

### Estado inicial (antes de tocar nada)

`git status --short` idéntico al estado documentado en 7.2 (35 `M` + 68
`??`, `MDs/15` presente). `.env.local` en `VITE_DATA_SOURCE=mock`.
Baseline técnico reconfirmado **antes** de modificar dependencias:
`npx tsc --noEmit` limpio, `npm run lint` limpio, `npm run build`
correcto (mismo warning de chunk-size). Los tres en verde antes de
empezar, según exige la tarea.

### A. Vulnerabilidades — análisis exacto

`npm audit --json` inicial + `npm ls`/`npm view` para cada paquete:

| Paquete | Directa/Transitiva | Instalada | Vulnerable | Fix mínimo | Severidad | Runtime/Dev | Impacto Habit Tracker | Acción |
|---|---|---|---|---|---|---|---|---|
| `react-router-dom` | **Directa** | 7.18.1 | 7.12.0-pre.0 – 7.18.1 | 7.18.2 (patch) | High | Runtime | Depende de `react-router` vulnerable | Actualizar |
| `react-router` | Transitiva (vía `react-router-dom`) | 7.18.1 | ≥7.12.0 <7.18.2 | 7.18.2 (patch) | High | Runtime | GHSA-qwww-vcr4-c8h2 — CSRF bypass **exclusivo de modo RSC** | Actualizar |
| `brace-expansion` | Transitiva (vía `eslint`→`minimatch`) | 5.0.7 | 4.0.0 – 5.0.8 | 5.0.9 (patch) | High | Dev/tooling (lint) | No alcanzable por el runtime de la app | Actualizar |
| `nanoid` | Transitiva (vía `vite`→`postcss`) | 3.3.16 | <3.3.17 | 3.3.17+ (patch) | High | Build-time (Vite/PostCSS) | No alcanzable por el runtime de la app | Actualizar |
| `postcss` | Transitiva (vía `vite`) | 8.5.19 | ≤8.5.22 | 8.5.23+ (patch) | Moderate | Build-time | Requiere `from` sin definir para ser explotable; no es el patrón de uso de Vite en este proyecto | Actualizar |

### B. Advisory de cada vulnerabilidad (fuente: GitHub Security Advisory)

- **`react-router` — GHSA-qwww-vcr4-c8h2** ("React Router: RSC Mode CSRF
  Bypass Allows Action Execution Before 400 Response"): afecta
  exclusivamente al **modo RSC** (React Server Components) de React
  Router. Confirmado por lectura directa de
  `node_modules/react-router/CHANGELOG.md`: el único cambio de la
  versión `7.18.2` es *"Harden RSC CSRF codepaths"* (PR #15353) — no hay
  ningún otro cambio de comportamiento entre `7.18.1` y `7.18.2`.
- **`brace-expansion` — GHSA-mh99-v99m-4gvg / GHSA-rgw5-rvv9-x895**: DoS
  por expansión no acotada (out-of-memory), CVSS 7.5. Dependencia de
  `minimatch`, usada internamente por `eslint` — herramienta de
  desarrollo, nunca se ejecuta en el bundle de producción ni es
  alcanzable por un usuario final de la SPA.
- **`nanoid` — GHSA-2v37-7h3g-55p8**: un generador personalizado con
  `size=0` puede loopear indefinidamente. Este proyecto no crea
  generadores personalizados de `nanoid` ni lo importa directamente —
  llega como dependencia interna de `postcss`, usada solo en build-time
  por Vite/Tailwind.
- **`postcss` — GHSA-fxqj-rqcc-2cmp**: lectura de rutas `.map`
  arbitrarias controladas por atacante cuando la opción `from` no está
  definida. Vite siempre invoca PostCSS con `from` definido (el archivo
  fuente real) durante el build; no es el patrón de uso vulnerable.
  Además, PostCSS se ejecuta solo en build-time local, nunca en el
  navegador del usuario final.

### C. Aplicabilidad real a Habit Tracker

Ninguna de las 5 vulnerabilidades es explotable en el contexto real de
esta aplicación (SPA cliente puro, sin RSC, sin servidor propio, sin
generación dinámica de IDs con `nanoid` a partir de input de usuario, sin
build remoto con `from` indefinido). Clasificación (sección 8 del
encargo):

| Vulnerabilidad | Clasificación | Justificación |
|---|---|---|
| `react-router`/`react-router-dom` | **D** (no aplicable al contexto de ejecución) — pero corregida igualmente | Solo aplica a modo RSC, no usado; se corrige de todas formas por ser dependencia directa y fix trivial sin riesgo |
| `brace-expansion` | **C** (solo tooling, no alcanzable en producción) | Vía `eslint`, dependencia de desarrollo |
| `nanoid` | **C** (solo build-time) | Vía `postcss`/Vite, no ejecuta en el cliente final |
| `postcss` | **C** (solo build-time, patrón de uso seguro) | Vite siempre define `from` |

Aun con clasificación C/D, **todas se corrigieron** porque el fix
disponible es patch-level, sin breaking changes, sin coste de
compatibilidad — no había razón técnica para aceptarlas.

### D. Estrategia de actualización seleccionada

Conjunto mínimo: los 5 paquetes de la tabla, todos **patch** (ningún
minor ni major). Verificado con `npm audit fix --dry-run` **antes** de
ejecutar nada — la salida mostró exactamente estos 5 cambios, ninguno
más:

```
react-router-dom 7.18.1 => 7.18.2
react-router     7.18.1 => 7.18.2
postcss          8.5.19 => 8.5.26
nanoid           3.3.16 => 3.3.18
brace-expansion  5.0.7  => 5.0.9
```

(`postcss`/`nanoid` resolvieron a versiones ligeramente más nuevas que
el mínimo exigido por el advisory — `8.5.26`/`3.3.18` — por resolución
normal de rango semver de npm, siguen siendo patch dentro del mismo
minor/major, sin breaking changes).

Ningún fix requirió major version upgrade de una dependencia directa —
por lo tanto **no fue necesario detenerse a pedir autorización** del
Product Owner (regla de la sección 9 del encargo). Se ejecutó
`npm audit fix` (sin `--force`, sin `npm update` global, sin instalar
paquetes adicionales).

### E. Versiones antes/después

| Paquete | Antes | Después | Tipo |
|---|---|---|---|
| `react-router-dom` | 7.18.1 | 7.18.2 | patch |
| `react-router` | 7.18.1 | 7.18.2 | patch (transitiva) |
| `postcss` | 8.5.19 | 8.5.26 | patch (transitiva) |
| `nanoid` | 3.3.16 | 3.3.18 | patch (transitiva) |
| `brace-expansion` | 5.0.7 | 5.0.9 | patch (transitiva) |

### F. Archivos de dependencias modificados

- `package-lock.json`: actualizado por `npm audit fix`. Verificado con
  `git diff` que **únicamente** las resoluciones de estos 5 paquetes
  cambiaron — el resto del diff del lockfile (bloques `@supabase/*`,
  `jose`, `eciesjs`, `iceberg-js`, `@noble/*`, binarios de la CLI de
  Supabase) es **pre-existente de 7.2** (adición de
  `@supabase/supabase-js` y `supabase` CLI), no producido por 7.2A.
- `package.json`: **sin cambios adicionales** — los rangos `^7.18.1`,
  etc. ya declarados en el `package.json` de 7.2 permitían estas
  versiones patch sin modificar el archivo. `git diff package.json`
  muestra exactamente el mismo diff que en el manifiesto original de
  7.2 (adición de `@supabase/supabase-js`/`supabase`), nada nuevo de
  7.2A.

### Re-auditoría (npm audit final)

```
found 0 vulnerabilities
```

**0 vulnerabilidades residuales.** No quedó ninguna High aplicable sin
resolver.

### PII — `src/data/mockUser.ts`

**Hallazgo confirmado:** el campo `email` contenía un correo real
(dominio `gmail.com`, prefijo coincidente con el nombre del Product
Owner) hardcodeado como dato mock. **No se reproduce el valor completo
en esta documentación** (ya estaba enmascarado en el manifiesto de 7.2:
`isc***@g***.com`).

**Cambio realizado:** se reemplazó únicamente el campo `email` por
`lidio@example.com` (dominio reservado para documentación/ejemplos,
RFC 2606). **Sin cambios** en `id`, `name`, `timezone`, `weekStartsOn`
ni en ningún otro campo o comportamiento del mock — diff de una sola
línea, confirmado con `git diff src/data/mockUser.ts`.

**Búsqueda de reaparición del correo real:** `grep -rn` del valor
original sobre `src/`, `Contexto/`, `MDs/` tras el cambio → **cero
coincidencias**. El correo real **no aparece en ningún archivo del
estado actual del Release Candidate**.

**Nota sobre el historial:** el correo real permanece en commits
anteriores de `main` (pre-existente, ya documentado en 7.2). Conforme a
la instrucción explícita de esta tarea, **no se intentó reescribir el
historial de Git** (`filter-branch`/`filter-repo`/`BFG`/`rebase` — nada
de esto se ejecutó). Se documenta como: *pre-existing historical PII;
removed from current release state.*

### Auditoría de PII adicional

Búsqueda de patrones de email (`[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}`)
sobre `src/`, `Contexto/`, `MDs/`, excluyendo dominios de prueba ya
conocidos (`@habitos.test`, `@example.com`): **cero coincidencias**
adicionales. Búsqueda heurística de patrones de teléfono sobre
`src/data/`: sin resultados. No se encontraron direcciones, tokens
personales ni nombres de usuario sensibles adicionales. No se realizó
(ni era necesaria) una auditoría masiva — el barrido fue dirigido al
Release Candidate actual, consistente con el alcance pedido.

### Regresión técnica después de dependencias y PII

- `npx tsc --noEmit`: **Passed** (sin salida), ejecutado después de
  `npm audit fix` y después del cambio de `mockUser.ts`.
- `npm run lint`: **Passed** (sin salida).
- `npm run build`: **Passed** — mismo warning conocido de chunk-size
  (`index-*.js` ~1.23 MB / 350 kB gzip, `StatusDonut3D-*.js` ~1.0 MB /
  277 kB gzip), no corregido en esta tarea, deuda técnica ya aceptada.
- `dist/` inspeccionado: contiene `lidio@example.com` (1 coincidencia,
  esperado — el mock se usa en la UI) y **cero** coincidencias del
  correo real. `dist/` eliminado tras la inspección, no comiteado.

### Regresión de routing

`react-router-dom`/`react-router` cambiaron (patch `7.18.1`→`7.18.2`).
Regresión ejecutada:

- **Análisis de changelog oficial** (`node_modules/react-router/CHANGELOG.md`):
  el único cambio de `7.18.2` es el hardening de CSRF en modo RSC — cero
  cambios de API, cero cambios de comportamiento en modo Data/Framework
  cliente (el modo que usa este proyecto).
- **Verificación de servidor:** con `npm run dev` activo, las 8 rutas de
  la app más una ruta inexistente devolvieron `200` desde el servidor de
  desarrollo (`/`, `/login`, `/checklist`, `/habits`, `/history`,
  `/statistics`, `/goals`, `/settings`, `/this-route-does-not-exist`) —
  confirma que el fallback SPA del dev server sigue funcionando y que no
  hay errores de arranque tras la actualización.
- **Verificación estática:** `App.tsx`, `ProtectedRoute.tsx`,
  `LoginPage.tsx` y `NotFoundPage` **no fueron tocados** por 7.2A (el
  único diff de `src/App.tsx` es pre-existente de la sesión de
  rediseño, ya QA-aprobado) — no hay ningún cambio de código de
  aplicación que pudiera interactuar con el patch de la librería.
- **Limitación explícita:** este entorno no cuenta con una herramienta
  de automatización de navegador (Playwright/browser) disponible para
  esta tarea, por lo que la verificación interactiva completa (clic a
  clic: login → ruta protegida, logout → `/login`, back/forward del
  navegador, loops de redirect) **no se ejecutó en vivo** en 7.2A. El
  riesgo residual de esto se considera **muy bajo**, dado que (a) cero
  código de aplicación cambió, (b) el changelog oficial confirma que el
  único cambio de la librería es específico de RSC (no usado), y (c)
  `tsc` (que valida los tipos públicos de `react-router-dom` usados en
  todo el código) pasó sin errores, lo que habría fallado ante cualquier
  cambio de API. Se recomienda que la próxima sesión con acceso a
  navegador (o el propio Product Owner) confirme visualmente el flujo de
  Auth end-to-end antes del GO final de producción (7.12), como parte
  del smoke ya planeado en `MDs/14`.

### Regresión mock

Con `VITE_DATA_SOURCE=mock` (sin cambios, `.env.local` no tocado): build
de producción generado y verificado sin errores; el bundle contiene el
nuevo correo ficticio donde antes contenía el real, sin ningún otro
cambio de contenido o comportamiento (diff de un solo campo). No se
detectó mezcla con Supabase (no se modificó `dataSource.ts` ni ningún
servicio). Verificación interactiva completa de las 7 páginas en
navegador: misma limitación de herramienta que en routing — no
disponible en este entorno; mitigada por el hecho de que el único
archivo de datos/UI tocado es `mockUser.ts` (un campo de texto), sin
tocar ningún componente que renderiza Dashboard/Checklist/Hábitos/
Metas/Historial/Estadísticas/Configuración.

### Control de bugs QA (BUG-001 a BUG-007)

Ningún archivo relacionado con los 7 bugs fue modificado por 7.2A —
confirmado con `git diff --stat` dirigido a cada archivo relevante
(`HabitListRow.tsx`, `OverflowMenu.tsx`, `DailyChecklistPage.tsx`,
`HabitsPage.tsx`, `HistoryTable.tsx`, `useDailyChecklist.ts`): todos
muestran el mismo diff pre-existente de la sesión de rediseño/QA
(346-373 líneas de diff cada uno, ya evidenciados en `MDs/13`), **cero
líneas adicionales** atribuibles a 7.2A.

- **BUG-001** (`OverflowMenu` dentro del viewport): archivo no tocado
  por 7.2A; `react-router` no interviene en el cálculo de colisión de
  viewport (lógica puramente de CSS/DOM). Sin regresión esperada.
- **BUG-002** (concurrencia de Goal Progress): ninguna migración fue
  modificada (`supabase/migrations/` sin cambios, confirmado). Basta
  esta confirmación según el encargo — no se repitieron las 170
  iteraciones.
- **BUG-003** (motivo del candado en Historial): `HistoryTable.tsx` no
  tocado por 7.2A. Sin regresión esperada.
- **BUG-004** (schedule histórico / navegación por fecha): la
  actualización de `react-router` no cambia el manejo de query params
  (confirmado por el changelog — el único cambio es RSC CSRF, no
  parsing de URL). `useDailyChecklist.ts` no tocado por 7.2A.
- **BUG-005** (`/checklist` 1440×900 sin overflow): `DailyChecklistPage.tsx`
  no tocado por 7.2A. Sin regresión esperada.
- **BUG-006** (`/habits` 320px sin overflow): `HabitsPage.tsx` no tocado
  por 7.2A. Sin regresión esperada.
- **BUG-007** (`/habits` Lista 768×1024 sin overflow): `HabitListRow.tsx`
  no tocado por 7.2A. Sin regresión esperada.

**Ninguno de los 7 bugs se reabrió.** No se ejecutó verificación visual
interactiva en navegador por la misma limitación de herramienta ya
documentada en "Regresión de routing" — el análisis estático (cero
cambios en los archivos involucrados, cero cambios de comportamiento de
librería fuera de RSC) sustenta la conclusión de que no hay mecanismo
plausible de regresión.

### Estado de las 15 migraciones

Sin cambios. `ls supabase/migrations/` → 15 archivos, última
`20260806162035_goal_progress_concurrency.sql`, coincide con el
baseline. `git status --short supabase/` → sin diferencia respecto al
estado de 7.2 (todo sigue `??`, ningún archivo modificado).

### Auditoría final de secretos

`grep` sobre los archivos efectivamente tocados por 7.2A
(`package.json`, `package-lock.json`, `src/data/mockUser.ts`) con los
patrones de la sección 19 del encargo (`service_role`, `JWT_SECRET`,
`PRIVATE_KEY`, `DATABASE_URL`, `DB_PASSWORD`, `access_token`,
`refresh_token`, `apikey`, `api_key`, `password=`): **cero
coincidencias.** Sin secretos nuevos introducidos por la actualización
de dependencias ni por el cambio de PII.

### Archivos modificados exclusivamente por 7.2A

- `package-lock.json` — resolución de 5 paquetes (`react-router-dom`,
  `react-router`, `postcss`, `nanoid`, `brace-expansion`) a versiones
  patch seguras. El resto del diff del lockfile es pre-existente de 7.2.
- `src/data/mockUser.ts` — un solo campo (`email`), reemplazo de PII
  real por `lidio@example.com`.
- `MDs/15_RELEASE_CANDIDATE_MANIFEST.md` — esta sección.

`package.json` **no cambió** por 7.2A (verificado, ver sección F).
Ningún otro archivo del working tree fue tocado.

### Regresiones detectadas

Ninguna. `tsc`/`lint`/`build` en verde antes y después. `npm audit`
pasó de 5 vulnerabilidades (4 High, 1 Moderate) a 0. Ningún archivo de
UI/lógica de negocio fue modificado.

### Riesgos residuales

- **Verificación interactiva en navegador no ejecutada** (routing y
  regresión mock/BUG) por ausencia de herramienta de automatización de
  navegador en este entorno — mitigado por análisis estático y de
  changelog oficial, pero queda como una verificación recomendada antes
  del GO final de producción (7.12) o en cuanto se disponga de un
  entorno con navegador.
- El resto de la deuda técnica y riesgos ya documentados en 7.1/7.2
  (warning de chunk-size, `useHabitsManager`/`useGoalsManager`/
  `checkSupabaseConnection` huérfanos — sin tocar, fuera de alcance)
  permanecen sin cambios.

### Documentación actualizada/creada

- `MDs/15_RELEASE_CANDIDATE_MANIFEST.md` — actualizado con esta sección
  "Security & Privacy Hardening — 7.2A" (evidencia previa de 7.2
  conservada sin modificar).
- No fue necesario crear `MDs/16_SECURITY_RELEASE_AUDIT.md` — el
  análisis de advisories, aunque detallado, cupo con claridad dentro de
  este manifiesto sin comprometer su mantenibilidad.

### Estado del proyecto Supabase remoto desconocido

Sin cambios. `xgasncrztfwotjlghlfg` permanece **NO AUTORIZADO /
DESCONOCIDO**. Cero operaciones ejecutadas contra él en esta tarea (no
se intentó conectar, no se intentó descubrir su contenido, no se usó
para validar nada — toda validación de Auth/Supabase que se mencionó en
el encargo no fue necesaria porque ninguna dependencia de esta tarea
afecta a Supabase).

### Decisión 7.2A

**GO PARA COMMITS.**

Las 5 vulnerabilidades fueron entendidas individualmente (advisory,
alcance, aplicabilidad real). Las 4 High se corrigieron con
actualizaciones patch sin breaking changes (confirmado por changelog
oficial y por `tsc` en verde); no quedó ninguna High aplicable sin
resolver — `npm audit` final: **0 vulnerabilidades**. No hubo major
upgrade de ninguna dependencia directa. `tsc`/`lint`/`build` en verde.
La PII real fue eliminada del estado actual del Release Candidate (queda
como historial pre-existente, fuera del alcance de esta tarea por
prohibición expresa de reescribir Git). Cero secretos. Cero regresiones
detectables por análisis estático — el único punto abierto es la
verificación interactiva en navegador, no disponible en este entorno,
documentada como riesgo residual bajo y recomendación para una sesión
posterior con esa capacidad. Migraciones intactas (15, sin cambios).
Supabase remoto no autorizado permanece completamente intacto.

**No se ejecuta `git add`/`commit`/`push` en esta tarea.** Queda a la
espera de autorización explícita del Product Owner para 7.2B — Release
Staging, Commits & Push.

---

## Release Staging & Commit Results — 7.2B

**Fecha:** 2026-08-10. **Rol:** Principal Release Engineer / Senior Git
Engineer / QA Release Manager. **Alcance:** convertir el Release
Candidate aprobado (7.2/7.2A, GO) en una secuencia de commits limpia y
subirla a `origin/main`.

### Baseline pre-commit

`git branch --show-current` → `main`. `git status --short` idéntico al
estado final de 7.2A (35 `M` + 68 `??`, sin diferencias). `git diff --check`
sin conflictos. Validación técnica antes de tocar nada:
`npx tsc --noEmit` **Passed**, `npm run lint` **Passed**, `npm run build`
**Passed** (mismo warning de chunk-size), `npm audit` → **0
vulnerabilidades**. Los cuatro en verde antes de iniciar staging, según
exige el encargo.

### Auditoría de seguridad pre-staging

`git check-ignore -v` confirmó que `.env.local`, `dist`, `node_modules`,
`.claude`, `.mcp.json`, `supabase/.temp`, `supabase/.branches` están
correctamente ignorados. Barrido de patrones sensibles
(`service_role`, `JWT_SECRET`, `PRIVATE_KEY`, `DB_PASSWORD`,
`DATABASE_URL`, `access_token`, `refresh_token`) sobre todo el contenido
a versionar: 141 coincidencias, **las mismas ya auditadas y explicadas
en 7.2/7.2A** (comentarios documentales, ninguna credencial real).
Búsqueda dedicada de literales `sb_secret_*`/JWT (`eyJ...`): **cero
resultados**. `src/data/mockUser.ts` confirmado con únicamente el correo
ficticio.

### Plan final de commits aplicado

Se usó como baseline el plan de `MDs/15` (sección "Plan de commits" de
7.2), verificando el diff real de cada grupo con
`git diff --cached --name-status`/`--stat`/`--check` antes de cada
commit. Ningún `git add .`/`git add -A`/`git commit -a`. Cada `git add`
enumeró rutas explícitas. Se agregó un commit adicional no previsto en
7.2 (`fix(privacy)`) para aislar el hallazgo de PII de 7.2A como un
cambio atómico y trazable, en vez de diluirlo dentro del commit de UI.

### Commits creados

| # | SHA corto | Mensaje | Objetivo |
|---|---|---|---|
| 1 | `7feeb63` | `chore: prepare project configuration and dependencies` | `.gitignore`, `eslint.config.js`, `package.json`, `package-lock.json`, `.env.example`, `src/vite-env.d.ts` |
| 2 | `caef69c` | `feat(database): add versioned habit schema` | `supabase/config.toml`, `supabase/.gitignore`, 15 migraciones |
| 3 | `7d635ef` | `feat: add Supabase client and data services` | `src/lib/*`, `src/services/*`, `src/types/database.types.ts`, `src/types/entities.ts` |
| 4 | `fc2a21b` | `feat(auth): add Supabase authentication and protected routing` | `AuthContext`, `useAuth`, `LoginPage`, `ProtectedRoute`, `App.tsx` |
| 5 | `291ffc9` | `feat(habits): connect habits, categories and goals to Supabase` | `useHabits`, `useCategories`, `useGoals`, `useDashboard`, `CategoriesSection`, `SettingsPage` |
| 6 | `a5aedac` | `feat(checklist): connect daily checklist, history and statistics to Supabase` | `useDailyChecklist`, `useHistoryLogs`, `useStatistics`, `habitSchedule.ts`, `exportHistory.ts`, `types/goal.ts` |
| 7 | `8f608a1` | `feat(ui): apply Oxford Blue responsive interface and viewport fixes` | 23 componentes/páginas del rediseño + fixes BUG-001/003/005/006/007 (inseparables del mismo diff) |
| 8 | `3f152f2` | `fix(privacy): replace real email with fictitious placeholder in mock user data` | `src/data/mockUser.ts` (1 línea) |
| 9 | `e7e27b3` | `docs: add database, backend integration, QA and deployment documentation` | `MDs/09` a `MDs/14` |
| 10 | `5711047` | `docs: add project context packs for discovery, development and deployment` | `Contexto/` completo (20 archivos) |

**Total: 10 commits.**

### Archivos excluidos correctamente

`.env.local`, `dist/`, `node_modules/`, `.claude/`, `.mcp.json`,
`supabase/.temp/` (incluido `project-ref` →
`xgasncrztfwotjlghlfg`, no autorizado), `supabase/.branches/` — ninguno
apareció en ningún `git diff --cached --name-status` de los 10 commits
(verificado individualmente en cada paso de staging antes de cada
commit).

### Confirmaciones

- **`.env.local` no versionado:** confirmado, `git check-ignore -v`
  antes de empezar y `git status` tras el último commit no lo muestra
  bajo ningún estado distinto de ignorado.
- **`supabase/.temp/` no versionado:** confirmado, `git status --short --ignored`
  lo marca `!!` (ignorado); el commit 2 (`caef69c`) solo incluyó
  `config.toml`, `.gitignore` y las 15 migraciones — cero archivos de
  `.temp`/`.branches`.
- **PII eliminada del estado actual:** confirmado — el commit 8
  (`3f152f2`) reemplaza el correo real por `lidio@example.com`;
  `git diff origin/main..HEAD` muestra explícitamente la línea removida
  (`-  email: "isc...@g...com"`) y la añadida
  (`+  email: "lidio@example.com"`) — el push de este bloque **corrige
  el estado del correo real en `origin/main`**, no solo en el working
  tree local.

### Validación post-commits

- `npx tsc --noEmit`: **Passed**.
- `npm run lint`: **Passed**.
- `npm run build`: **Passed** (mismo warning de chunk-size, deuda
  técnica ya aceptada, no corregida en esta tarea).
- `npm audit`: **0 vulnerabilidades**.
- `npx supabase db reset --local --no-seed`: **NO EJECUTADO** — Docker
  Desktop no está corriendo en este entorno de ejecución
  (`docker version` responde desde el cliente pero falla al conectar
  con `dockerDesktopLinuxEngine`; `npx supabase status` confirma el
  mismo fallo de conexión). Esta es una **limitación del entorno de
  esta sesión, no un fallo atribuible a los commits**. Mitigación
  aplicada en su lugar: verificación estática de que el contenido
  commiteado de `supabase/migrations/` es **exactamente** el mismo
  conjunto de 15 archivos (mismos nombres, mismo contenido, sin edición
  alguna) que QA ya validó exhaustivamente con múltiples `db reset`
  exitosos en 7.1/7.2/7.2A (`git ls-tree -r --name-only HEAD --
  supabase/migrations/` → 15 archivos, última
  `20260806162035_goal_progress_concurrency.sql`). Riesgo residual: bajo
  pero no nulo — se recomienda ejecutar `npx supabase db reset --local
  --no-seed` en la próxima sesión con Docker Desktop activo, antes del
  GO final de producción (7.12).
- **Total de migraciones:** 15 (commiteadas en `caef69c`, verificado con
  `git ls-tree`).

### Smoke pre-push

Con `VITE_DATA_SOURCE=mock` y `npm run dev` activo: las 7 rutas
(`/`, `/checklist`, `/habits`, `/goals`, `/history`, `/statistics`,
`/settings`) respondieron `200` desde el servidor de desarrollo, sin
errores en el log del proceso Vite. **Limitación explícita:** este
entorno no dispone de una herramienta de automatización de navegador
para esta tarea, por lo que la verificación clic-a-clic (carga visual
real, navegación por UI, ausencia de pantallas en blanco) **no se
ejecutó de forma interactiva** — no se declara "Passed" de esa parte,
solo la respuesta a nivel de servidor/proceso. `tsc`/`lint`/`build`
siguen siendo la validación obligatoria y están en verde.

### Revisión final de commits antes del push

`git log origin/main..HEAD --oneline` → **10 commits**, orden
correcto (config → DB → cliente → servicios → auth → dominio habits →
dominio checklist → UI → privacidad → docs técnicas → docs contexto),
mensajes en Conventional Commits, sin commits accidentales, sin merges.
`git diff origin/main..HEAD --stat` → 104 archivos, 20694
inserciones, 439 eliminaciones. `git diff origin/main..HEAD --check` →
2 notas de estilo (espacio en blanco al final de una línea de tabla en
`MDs/13`, línea en blanco final en `database.types.ts`) — ninguna es un
marcador de conflicto, no bloqueante. Búsqueda final de secretos sobre
el diff completo a pushear: **cero coincidencias reales** (0 patrones
sensibles con valor, 0 literales `sb_secret_`/JWT, cero reaparición del
correo real fuera de la línea removida esperada).

### Resultado del push

```
git push origin main
To https://github.com/Gardo04Code/habit-tracker.git
   7e204a7..5711047  main -> main
```

**Push exitoso, sin `--force`, sin conflicto.** `origin/main` avanzó de
`7e204a7` a `5711047` de forma fast-forward.

### SHA final

`5711047` (`5711047 80f604e5cc763464ed5988627ced8fd91` completo:
`571104780f604e5cc763464ed5988627ced8fd91`).

### Estado post-push

`git status -sb` → `## main...origin/main` (sin `ahead`/`behind`) —
**`main` completamente alineado con `origin/main`**. Único elemento
restante en el working tree: `MDs/15_RELEASE_CANDIDATE_MANIFEST.md`
(este archivo, en edición — se commitea y pushea por separado a
continuación, según lo autorizado explícitamente en la sección 16 del
encargo: *"Si por orden de commits el manifiesto ya fue commiteado
antes de conocer los SHA finales... crea al final un commit documental
adicional: docs: record release staging results"*).

### Riesgos/observaciones

- `db reset` no ejecutado por indisponibilidad de Docker Desktop en este
  entorno — mitigado por verificación estática, recomendado repetir en
  cuanto se disponga de Docker antes del GO de producción.
- Verificación interactiva de navegador (routing, smoke, BUG-001..007)
  no ejecutada en 7.2A ni en 7.2B por la misma limitación de
  herramienta — mismo riesgo residual ya documentado, acumulado, no
  nuevo.
- El resto de deuda técnica/riesgos de 7.1/7.2/7.2A (chunk-size,
  `useHabitsManager`/`useGoalsManager`/`checkSupabaseConnection`
  huérfanos, vulnerabilidad de dependencias ya resuelta) permanece sin
  cambios — nada de esto se tocó en 7.2B.

### Decisión 7.2B

**GO PARA 7.3.**

Los 10 commits reflejan el inventario real del Release Candidate
aprobado en 7.2/7.2A. Cero secretos, cero `.env.local`, cero `dist/`,
cero `supabase/.temp/` versionados. `npm audit` en 0. `tsc`/`lint`/`build`
en verde antes y después del staging. 15 migraciones commiteadas sin
alteración. `db reset` no pudo ejecutarse por falta de Docker Desktop en
este entorno (limitación de entorno, no del Release Candidate) —
mitigado con verificación estática y documentado como riesgo residual
para la próxima sesión. Push exitoso sin `--force`; `main` = `origin/main`
en `5711047`. Ningún cambio funcional nuevo, ninguna corrección de deuda
técnica, ninguna operación contra Supabase remoto ni Hostinger.

**No se inicia 7.3 en esta tarea.** Queda a la espera de autorización
explícita del Product Owner.
