# Regression — Contexto QA (7.9A → 7.10B, cierre de release)

## 0. Estado final — RELEASE CLOSED

**7.9B: PASSED.** **7.10B Production: PASSED.** Ciclo completo cerrado:
los 8 `BUG-PROD-00X` confirmados en Production Smoke fueron corregidos
(7.9A), retesteados manualmente en local (7.9B, 8/8 PASSED — uno de
ellos, BUG-PROD-003, requirió un segundo ciclo: REOPENED → nueva causa
raíz → nuevo fix → PASSED; ver sección 4), commiteados y desplegados a
Production (7.10B, release SHA `3eaa0af`), y reconfirmados con
Production Smoke real post-deploy.

**Resumen:**
- Confirmed bugs: **8**
- Production validation: **8/8 PASSED**
- Open confirmed Production bugs: **0**
- Pending Product Rule findings: **4** (sin cambios, ver sección 5 —
  ninguno se marca resuelto solo porque el deployment fue exitoso)

**No existe todavía una suite de regresión automatizada (Playwright).**
Todo lo anterior — 7.9B y el Production Smoke de 7.10B — fue validado
manualmente por el Product Owner. La automatización sigue siendo un
bloque futuro (7.11+), no iniciado.

**Distinción de baseline — no confundir:**
- **CURRENT PRODUCTION** (`https://codgoli.com/habitos/`): sigue
  ejecutando el build ya desplegado en 7.7C. Los 8 fixes de 7.9A/7.9B
  **NO están desplegados ahí todavía** — los 8 bugs originales de
  Production Smoke siguen presentes en el sitio en vivo hasta que se
  ejecute un redeployment controlado.
- **LOCAL QA CANDIDATE** (este entorno): contiene los 8 fixes,
  validados con retest manual completo. Es el candidato para el
  siguiente redeployment, no un estado ya reflejado en producción.

Redacción correcta: *"Fix validado localmente, listo para
redeployment controlado."* — **nunca** *"bug de Production corregido"*
hasta que se despliegue y se repita el Production Smoke.

**Cadena final (7.10A → 7.10C):** LOCAL FIX VALIDATED → **COMMITTED**
(release SHA `3eaa0af`, sobre `e452fef`) → build re-generado y
re-auditado desde ese SHA (sin referencias Local/QA, URL de Production
correcta) → **DEPLOYED** (subida manual vía Hostinger File Manager,
detalle e incidente de path anidado en
`MDs/14_DEPLOYMENT_PLAN.md`, sección "7.10B") → **PRODUCTION SMOKE
PASSED** (verificado manualmente por el Product Owner contra
`https://codgoli.com/habitos/` real, con Production DB ya limpiada de
datos de Smoke/QA en 7.10B-1). Production ya refleja los 8 fixes.

### Ambiente de 7.9B (preparado, sin credenciales aquí)

- Preparado: 2026-08-20 (fecha real del servidor de Supabase Local).
- Frontend: `npm run dev` (Vite), local, sin `--base` (dev no usa el
  flag de build) → `basename` efectivo `/`.
- Supabase: **Local** (`http://127.0.0.1:54321`) — `.env.local` cambiado
  de `VITE_DATA_SOURCE=mock` a `VITE_DATA_SOURCE=supabase` para que el
  retest ejercite las rutas de código reales que 7.9A corrigió (la URL
  siguió apuntando a local en todo momento, nunca a
  `xgasncrztfwotjlghlfg.supabase.co`). `.env.local` no está versionado
  (`.gitignore`), este cambio es exclusivamente local.
- `db reset --local`: 15/15 migraciones, sin migración nueva.
- Usuario QA creado vía Auth Admin API local (`email_confirm: true`,
  sin flujo de confirmación por correo) — `auth.users = 1`,
  `profiles = 1` (trigger `handle_new_user` verificado). Credenciales
  temporales: ver checkpoint de la sesión, no almacenadas en este
  archivo ni en ningún otro archivo versionado.
- Dataset QA Local creado vía REST/RPC reales de Supabase (mismas rutas
  que usaría el frontend: `POST /rest/v1/categories`,
  `POST /rest/v1/habits`, RPC `create_habit_schedule`,
  `POST /rest/v1/habit_categories`, `POST /rest/v1/goals`) — no vía SQL
  directo, y sin ningún UUID/PII de Production. Detalle completo en la
  sección 10.

## 1. Propósito

Handoff de **7.9A — Production Smoke Bug Fixes** hacia **7.9B — Manual
Retest**. Documenta, para cada `BUG-PROD-00X` confirmado en
`Contexto/04_QA/01_PRODUCTION_SMOKE_CONTEXT.md`: causa raíz real,
archivos modificados, estrategia del fix, validación ejecutada y estado
final. Todo el trabajo de 7.9A fue **local únicamente** — cero cambios en
Production (Supabase ni Hostinger), cero `git add`/`commit`/`push`.

## 2. Alcance de esta sesión

- Bloque activo: **7.9A — Production Smoke Bug Fixes**.
- Entorno: local. `.env.local` confirmado apuntando a Supabase Local
  (`http://127.0.0.1:54321`, `VITE_DATA_SOURCE=mock`) — nunca a Production.
- Docker Desktop/Supabase Local: disponible durante la sesión (containers
  ya activos), usado únicamente para `db reset` y una reproducción SQL
  read/write **local** de BUG-PROD-005 (dataset `QA Local — ...`, sin IDs
  ni PII reales). Reseteado al finalizar — sin datos residuales.
- Ningún archivo de `supabase/migrations/` fue creado ni modificado — los
  8 bugs resultaron ser defectos de frontend, no de schema/RPC. Migraciones
  locales: **15/15, sin cambios**. Migraciones Production: **15/15, sin
  cambios** (no se tocó Production en ningún punto).

## 3. Archivos con cambios (nuevos en 7.9A — distintos de los heredados de Deployment)

```
src/components/goals/GoalFormModal.tsx
src/components/goals/GoalGeneralHero.tsx
src/components/goals/GoalListRow.tsx
src/components/habits/HabitCard.tsx
src/components/habits/HabitFormModal.tsx
src/components/ui/Modal.tsx
src/components/ui/PageTransition.tsx
src/components/ui/Toggle.tsx
src/data/referenceDate.ts
src/index.css
src/pages/GoalsPage.tsx
src/pages/HabitsPage.tsx
src/utils/habitStats.ts
```

**Cambios heredados de Deployment, NO atribuibles a 7.9A** (ver
`Contexto/04_QA/01_PRODUCTION_SMOKE_CONTEXT.md`, sección 4 — preservados
sin tocar, son el `basename`/`.htaccess` que generaron el `dist/`
realmente desplegado en 7.7C):
```
src/main.tsx                (basename={import.meta.env.BASE_URL})
public/.htaccess             (SPA fallback /habitos/)
Contexto/00_GLOBAL/00_README_CONTEXTOS.md
Contexto/03_DEPLOYMENT/03_DEPLOYMENT_MASTER_CONTEXT.md
MDs/14_DEPLOYMENT_PLAN.md
Contexto/03_DEPLOYMENT/04_PRODUCTION_ENVIRONMENT_CONTEXT.md  (untracked)
Contexto/03_DEPLOYMENT/05_SUPABASE_PRODUCTION_CONTEXT.md     (untracked)
Contexto/03_DEPLOYMENT/06_FRONTEND_PRODUCTION_CONTEXT.md     (untracked)
Contexto/03_DEPLOYMENT/07_HOSTINGER_CONTEXT.md               (untracked)
```

## 4. Bugs — causa raíz, fix y estado

### BUG-PROD-005 — Discrepancia de unidad en Goal Progress (prioridad máxima)

- **Causa raíz real (contraria a la hipótesis inicial del handoff):**
  `compute_goal_habit_logs_progress()` (`20260731004632_goal_progress_source.sql`)
  hace exactamente lo que su propia documentación aprobada especifica:
  `current_value` = SUMA de `habit_logs.value` para hábitos
  `quantity`/`duration`/`repetitions`, homogeneizado por
  `goal_type_snapshot`/`target_unit_snapshot`. **No es un conteo de días.**
  Confirmado empíricamente contra Supabase Local (no solo por lectura de
  código): hábito `quantity` con target=8, un log de `value=8`, meta
  vinculada con `target_value=7`, `unit="días"` → `current_value` resultante
  = **8** (`8/7 = 114%`), reproduciendo EXACTAMENTE el número visto en
  Production. El backend está haciendo su trabajo correctamente per D-05.
  El defecto real: `goals.unit` es texto libre (`GoalFormModal.tsx`, campo
  "Unidad", placeholder "%, días, litros...") **sin ninguna relación** con
  la unidad real que el backend suma (la del hábito vinculado) — nada en
  frontend ni backend impedía que un usuario etiquetara con "días" una
  meta cuyo progreso real se mide en "vasos", produciendo una lectura sin
  sentido con un número matemáticamente correcto.
- **Archivos:** `src/components/goals/GoalFormModal.tsx`,
  `src/pages/GoalsPage.tsx` (agrega `unit` a `GoalHabitOption`).
- **Fix:** cuando la meta está vinculada a un hábito, el campo "Unidad" se
  deriva automáticamente del `targetUnit` del hábito y queda bloqueado
  (no editable a mano) — ya no puede quedar desincronizado. Sin metas
  general/manuales (sin hábito), el campo sigue siendo texto libre, sin
  cambios. Ningún cambio en SQL/RPC/migraciones — el cálculo del servidor
  no se tocó porque ya era correcto.
- **Regresión ejecutada:**
  - SQL directo contra Supabase Local (repro exacta del caso reportado):
    `current_value = 8` confirmado — comportamiento correcto y estable, no
    regresión.
  - `tsc -b`/`eslint`/`vite build`: verdes.
  - Casos NO recreados con navegador (sin herramienta disponible): que el
    campo "Unidad" se autocomplete/bloquee visualmente al elegir un hábito
    en el modal de Crear/Editar Meta — **MANUAL RETEST REQUIRED**.
  - No se tocó el dato ya existente en Production
    (`Smoke — Constancia inicial`, `unit = "días"`) — el fix es hacia
    adelante; ese registro seguirá mostrando "días" hasta que se edite y
    se guarde de nuevo (momento en el que tomará la unidad real del
    hábito). No se recomienda ninguna migración de datos para esto.
- **7.9B — Manual Retest: PASSED**, con dos incidentes de entorno
  detectados y resueltos durante la ejecución (ver `ENV-7.9B-001` y
  `ENV-7.9B-002` en la sección "7.9B Environment Incidents" — ninguno es
  un bug de producto):
  - A) Meta asociada a `QA Local — Vasos de agua` derivó automáticamente
    unidad `vasos`. **PASSED.**
  - B) La unidad quedó bloqueada mientras la meta estuvo asociada a ese
    hábito — no permitió cambiar manualmente a `días`/`%`/otra unidad
    incompatible. **PASSED.**
  - C) Tras registrar `8/8 vasos` en Checklist, `QA Local — Constancia
    vasos` mostró `8 de 40 vasos, 20%`. **PASSED** (requirió corregir
    `ENV-7.9B-001`/`ENV-7.9B-002` primero — ambos incidentes de dataset,
    no de código).
  - Validado además en vivo: editar el log de `8` a `5` y de vuelta a
    `8` recalculó `current_value` como `8 → 5 → 8`, nunca acumulado
    (nunca `13`). El log de `QA Local — Vasos alternativa` (hábito
    distinto) no se sumó a la meta mientras esta apuntaba a `Vasos de
    agua`.
- **Estado final: FIXED / EXPECTED BACKEND SEMANTICS — MANUAL RETEST
  PASSED.** El comportamiento de suma del backend es el diseño aprobado
  (D-05) — el defecto de producto real era la inconsistencia de unidad
  permitida por el frontend; el flujo final mantiene la unidad
  compatible en todo momento.
- **Baseline: DEPLOYED TO PRODUCTION — PRODUCTION SMOKE PASSED**
  (release SHA `3eaa0af`, verificado manualmente por el Product Owner
  contra `https://codgoli.com/habitos/` real).

### BUG-PROD-008 — Selector de hábito compatible no abre

- **Causa raíz:** `GoalFormModal.tsx` calculaba correctamente las
  opciones del selector para una meta ya vinculada (`habitSelectOptions`
  ya filtraba a hábitos compatibles), pero el `<select>` se dejaba
  `disabled={lockedToGeneral || lockedToHabit}` — es decir, **siempre**
  disabled para una meta vinculada a un hábito, sin importar si existían
  alternativas. Un `<select>` disabled no abre en ningún navegador —
  coincide exactamente con "el selector seguía sin abrir/mostrar
  alternativas incluso después de que el hábito compatible existía".
- **Archivos:** `src/components/goals/GoalFormModal.tsx`.
- **Fix:** el selector solo queda disabled cuando no existe **ningún**
  otro hábito compatible (`goalType` en `quantity`/`duration`/`repetitions`)
  además del ya vinculado; si existe al menos uno, el selector queda
  habilitado y solo muestra alternativas compatibles (antes mostraba
  TODOS los hábitos activos, dejando que `validate()` rechazara uno
  incompatible recién al guardar). El hint también se ajusta según haya o
  no alternativa disponible.
- **Regresión ejecutada:** `tsc -b`/`eslint`/`vite build`: verdes. Lógica
  de habilitación cubierta por revisión de código (memo/derivación
  correcta, sin condición de carrera nueva).
- **7.9B — Manual Retest: PASSED.** Al editar `QA Local — Constancia
  vasos`, el selector "Asociada a" abrió correctamente y mostró como
  compatibles `QA Local — Vasos de agua` y `QA Local — Vasos
  alternativa` — `QA Local — Beber agua` (boolean, no soportado) NO se
  presentó como opción. Se seleccionó `Vasos alternativa` y se guardó
  con éxito: la asociación cambió, la unidad se mantuvo en `vasos`, y el
  progreso se mantuvo en `8 de 40 vasos (20%)`.
- **Estado final: FIXED — MANUAL RETEST PASSED.**
- **Baseline: DEPLOYED TO PRODUCTION — PRODUCTION SMOKE PASSED**
  (release SHA `3eaa0af`, verificado manualmente por el Product Owner
  contra `https://codgoli.com/habitos/` real).

### BUG-PROD-004 — Fecha de inicio por defecto incorrecta

- **Causa raíz:** `src/data/referenceDate.ts` exporta `TODAY = "2026-07-21"`
  — un literal fijo que ancla los datos MOCK (comentario del propio
  archivo lo confirma). `HabitFormModal.tsx` y `GoalFormModal.tsx` usaban
  ese mismo literal como valor por defecto de "fecha de inicio" al CREAR,
  incluso en modo Supabase real — sin ninguna rama por fuente de datos.
  Coincide exactamente con la fecha reportada (`21/07/2026`) y con la
  inconsistencia (2 de 3 hábitos, no 3 de 3): el literal solo aparece si
  el usuario no toca manualmente el campo de fecha antes de guardar.
- **Ya existía en el propio código base el patrón correcto** para este
  problema exacto, sin usarse aquí:
  `DailyChecklistPage.tsx:32` — `isSupabaseDataSource ? toDateOnly(new Date()) : TODAY`.
- **Archivos:** `src/data/referenceDate.ts` (nueva función
  `getFormDefaultDate()`), `src/components/habits/HabitFormModal.tsx`,
  `src/components/goals/GoalFormModal.tsx`.
- **Fix:** `getFormDefaultDate()` centraliza exactamente el patrón ya
  usado en `DailyChecklistPage.tsx` — en modo Supabase usa la fecha real
  del sistema; en modo mock preserva `TODAY` (sin tocar el anclaje de los
  mocks). Ambos formularios ahora lo usan para su valor por defecto de
  "fecha de inicio" al crear. No se hardcodeó ninguna fecha nueva.
- **Regresión ejecutada:** `tsc -b`/`eslint`/`vite build`: verdes. Lectura
  de código confirma: cerrar y reabrir "Crear" genera un `FormState` nuevo
  (el componente se desmonta/remonta, `toFormState()` se re-ejecuta) →
  fecha siempre recalculada, nunca stale.
- **7.9B — Manual Retest: PASSED.** Crear hábito mostró la fecha real
  del entorno (`19/08/2026`); cerrar y reabrir el modal volvió a mostrar
  `19/08/2026`; Crear meta también mostró `19/08/2026`. El literal viejo
  (`21/07/2026`) no volvió a aparecer en ningún caso.
- **Estado final: FIXED — MANUAL RETEST PASSED.**
- **Baseline: DEPLOYED TO PRODUCTION — PRODUCTION SMOKE PASSED**
  (release SHA `3eaa0af`, verificado manualmente por el Product Owner
  contra `https://codgoli.com/habitos/` real).

### BUG-PROD-006 — Métricas de Mis Hábitos inconsistentes

- **Causa raíz:** `HabitsPage.tsx` (KPIs + orden) y `HabitCard.tsx`
  (racha actual/mejor racha/sesiones/promedio en cada tarjeta) llamaban
  directamente a `utils/streaks.ts`/`utils/habitStats.ts`/
  `utils/recentCompletion.ts` — los tres leen **siempre**
  `data/mockHabitLogs.ts` (array estático), sin ninguna rama por fuente
  de datos. En Production (modo Supabase), con hábitos reales cuyos IDs
  no existen en ese array mock, esas funciones devuelven consistentemente
  0/—, exactamente los síntomas reportados (racha 0, cumplimiento 0%,
  0 sesiones, hábitos "en riesgo"). Confirmado como brecha ya conocida y
  documentada, no solo inferida: el comentario de
  `src/hooks/useStatistics.ts` (líneas ~116-123) dice textualmente que
  `utils/streaks.ts` "es compartido con el módulo de Hábitos ya
  congelado... modificarlo excede el alcance de esta tarea" — es decir,
  quedó fuera de alcance deliberadamente en un bloque anterior, y el
  Production Smoke de 7.9 ahora lo confirma como bug real.
  Checklist/Historial/Estadísticas/Dashboard no tienen este problema
  porque ya son data-source-aware (branch `isSupabaseDataSource` vía
  `useStatistics()`/`useDashboard()`).
- **Archivos:** `src/pages/HabitsPage.tsx`,
  `src/components/habits/HabitCard.tsx`, `src/utils/habitStats.ts`
  (ancla `TODAY` de `calculateHabitCountTrend` corregida, misma familia
  de causa).
- **Fix:** `HabitsPage.tsx` reutiliza `useStatistics(30)` (misma fuente ya
  validada por Dashboard/Estadísticas — no se reimplementa el fetch) y
  construye un mapa por hábito (`recentCompletionRate` en ventana real de
  14 días con la misma fórmula que `dayRate()`, `currentStreak`/
  `bestStreak` vía `computeCurrentStreakReal`/`computeBestStreakReal` ya
  exportadas por `useStatistics.ts`, sesiones/promedio derivados de
  `dbLogs`). En modo mock el comportamiento es exactamente el mismo de
  siempre (mismas funciones, sin cambios). `HabitCard.tsx` ya no calcula
  nada internamente — recibe los valores ya resueltos como props.
- **Regresión ejecutada:** `tsc -b`/`eslint`/`vite build`: verdes (incluyó
  corregir un error real de tipos: `useStatistics()` solo admite períodos
  7/30/90, no 14 — se pidió 30 y la ventana de 14 días se calcula
  directamente sobre `dbLogs`, independiente del período pedido). Modo
  mock: código de HabitsPage/HabitCard no cambia de rama, mismo resultado
  esperado que antes.
- **7.9B — Manual Retest: PASSED.** Con datos reales de Supabase Local:
  `QA Local — Vasos alternativa` y `QA Local — Vasos de agua` mostraron
  100%, 8 vasos promedio, 1 día de mejor racha cada uno; `QA Local —
  Beber agua` mostró 0% (sin registro). El resumen superior mostró
  Cumplimiento promedio = 67% (consistente con `(100+100+0)/3 ≈ 67%`),
  Racha activa = 1 día, Hábitos en riesgo = 1. La vista dejó de mostrar
  las métricas mock/0 inconsistentes con Supabase.
- **Estado final: FIXED — MANUAL RETEST PASSED.**
- **Baseline: DEPLOYED TO PRODUCTION — PRODUCTION SMOKE PASSED**
  (release SHA `3eaa0af`, verificado manualmente por el Product Owner
  contra `https://codgoli.com/habitos/` real).

### BUG-PROD-007 — Lifecycle de metas inconsistente

- **Causa raíz:** `goal.status` (logro: `active`/`completed`/`expired`) y
  `goal.lifecycleStatus` (ciclo de vida: `active`/`paused`/`deleted`) son
  ejes independientes por diseño (documentado explícitamente en
  `20260731004632_goal_progress_source.sql`: "goal_status: sin cambios
  automáticos... no hay ningún punto en esta migración que lea o modifique
  goals.status ni goals.goal_lifecycle_status"). `GoalListRow.tsx` y
  `GoalGeneralHero.tsx` mostraban SIEMPRE el badge de logro
  (`STATUS_META[goal.status]`, literalmente "Activa" cuando
  `status==='active'`) junto al badge de lifecycle ("Pausada"/"En
  papelera") — dos badges simultáneos que comparten la misma palabra
  "Activa" para dos conceptos distintos. Adicionalmente, `GoalsPage.tsx`
  contaba metas bajo el sub-filtro "Activas" (`GoalStatusTabs`) usando
  solo `goal.status`, sin considerar `lifecycleStatus` — una meta pausada
  seguía apareciendo como "Activas: 1" dentro de la pestaña "Pausadas".
- **Archivos:** `src/components/goals/GoalListRow.tsx`,
  `src/components/goals/GoalGeneralHero.tsx`, `src/pages/GoalsPage.tsx`.
- **Fix:** el badge de logro "Activa" ahora se oculta específicamente
  cuando `status==='active'` pero `lifecycleStatus!=='active'` (redundante
  y engañoso en ese caso) — "Cumplida"/"Vencida" siguen mostrándose
  siempre, son información real independiente del lifecycle. El conteo y
  el filtro de `GoalStatusTabs` ahora excluyen explícitamente las metas
  pausadas/en papelera del bucket "Activas": una meta con
  `lifecycle: paused` nunca se cuenta ni se lista como "Activa". No se
  tocó `goal_status`/`goal_lifecycle_status` en DB — es puramente
  presentación.
- **Regresión ejecutada:** `tsc -b`/`eslint`/`vite build`: verdes.
  Reactivar/restaurar (ya funcionaban correctamente per el reporte
  original) no se tocó.
- **7.9B — Manual Retest: PASSED.** Ciclo completo ejecutado
  manualmente: `Active → Paused → Active → Trash → Restored`.

  | Fase | Activas/Pausadas/Papelera | Badge meta | Todas/Activas/Cumplidas/Vencidas |
  |---|---|---|---|
  | A — Initial | 2/0/0 | Activa | 1/1/0/0 |
  | B — Paused | 1/1/0 | Pausada (sin "Activa" simultánea) | 1/0/0/0 |
  | C — Reactivated | 2/0/0 | Activa | 1/1/0/0 |
  | D — Trash | 1/0/1 | En papelera (sin "Activa" simultánea) | 1/0/0/0 |
  | E — Restored | 2/0/0 | Activa | 1/1/0/0 |

  Progreso se mantuvo en `8/40 vasos = 20%` durante todo el ciclo — el
  lifecycle nunca afectó el cálculo de progreso (ejes independientes,
  como se documentó).
- **Estado final: FIXED — MANUAL RETEST PASSED.**
- **Baseline: DEPLOYED TO PRODUCTION — PRODUCTION SMOKE PASSED**
  (release SHA `3eaa0af`, verificado manualmente por el Product Owner
  contra `https://codgoli.com/habitos/` real).

### BUG-PROD-002 — Settings en blanco tras navegación SPA

- **Causa raíz (plausible, no confirmada visualmente — sin navegador
  disponible en este entorno):** `PageTransition.tsx` usa
  `<AnimatePresence mode="wait">` — este modo mantiene montada la página
  SALIENTE y NO monta la ENTRANTE hasta que la salida termina su
  animación. Es un footgun conocido de Framer Motion: si esa espera queda
  interrumpida, `AnimatePresence` puede quedar sin ningún hijo montado
  hasta que algo fuerce un remount completo (F5) — coincide con el
  síntoma exacto reportado (blanco tras SPA nav, se arregla con refresh).
  Se revisaron también `SettingsPage.tsx` y sus secciones
  (`CategoriesSection`, `SessionSection`, `useSettingsForm`,
  `useTheme`): ninguna tiene guardas de carga faltantes ni lanza
  excepciones de render evidentes por sí misma — el origen más probable
  es el layer de transición compartido, no `SettingsPage` (consistente
  con "Settings SÍ tiene contenido implementado").
- **Archivos:** `src/components/ui/PageTransition.tsx`.
- **Fix:** se quita `mode="wait"` (vuelve al modo por defecto de
  `AnimatePresence`) — la página entrante se monta de inmediato mientras
  la saliente termina de desvanecerse, eliminando la ventana en la que
  puede no haber ningún hijo montado. Cambio en el componente compartido,
  no en `SettingsPage.tsx` (afecta a todas las rutas por igual, no solo
  Configuración).
- **Regresión ejecutada:** `tsc -b`/`eslint`/`vite build`: verdes.
  **Confianza del diagnóstico (previa al retest): media** — mecanismo
  real y conocido, pero no se había podido reproducir ni confirmar
  visualmente sin navegador.
- **7.9B — Manual Retest: PASSED.** Configuración cargó correctamente
  vía navegación SPA desde Dashboard, Mis hábitos, Checklist y Metas —
  sin F5 y sin navegación directa por URL. El problema original de
  página en blanco no se reprodujo tras el fix.
- **Estado final: FIXED — MANUAL RETEST PASSED.**
- **Baseline: DEPLOYED TO PRODUCTION — PRODUCTION SMOKE PASSED**
  (release SHA `3eaa0af`, verificado manualmente por el Product Owner
  contra `https://codgoli.com/habitos/` real).

### BUG-PROD-003 — Switches desbordados

**Ronda 1 (7.9A):**
- **Causa raíz:** `Toggle.tsx` (componente compartido, usado por
  `NotificationsSection.tsx` y `HabitFormModal.tsx` — ambos puntos de
  reproducción reportados) envolvía icono+label+hint en un `<div
  className="flex items-center gap-3">` sin `min-w-0`. Por el
  comportamiento por defecto de flexbox (`min-width: auto` en los hijos),
  un label/hint largo (p. ej. "Permitir registros parciales") no podía
  encogerse por debajo de su ancho intrínseco — la fila completa
  desbordaba el contenedor, empujando el switch (`shrink-0`, 44×24px)
  fuera del área visible en viewports angostos.
- **Archivos:** `src/components/ui/Toggle.tsx`.
- **Fix:** `min-w-0` en el contenedor flex y en el bloque de
  texto — permite que el texto se ajuste (wrap) dentro del espacio real
  en vez de forzar el desborde. El switch conserva `shrink-0`. Sin
  `overflow-x-hidden` ni ningún parche que oculte el síntoma en vez de
  corregir el layout.
- **Regresión ejecutada:** `tsc -b`/`eslint`/`vite build`: verdes.

**RETEST-07 (ronda 1) — FAILED / REOPENED:** el Product Owner reprodujo
el desborde de nuevo en Configuración → Notificaciones (los cuatro
toggles) — el fix de `min-w-0`/`shrink-0` era necesario pero
**insuficiente**: resolvía el desborde causado por texto largo, pero no
un segundo defecto independiente en el propio thumb del switch.

**Ronda 2 (7.9B, tras REOPEN) — nueva causa raíz:**
- El thumb (`<span>`) tenía `position: absolute` **sin `left`
  explícito**, dependiendo del fallback de "posición estática" del
  navegador. Medido empíricamente (inyectando
  `getBoundingClientRect()`/`getComputedStyle()` contra el CSS
  compilado real): esa posición estática caía en el **borde derecho del
  track**, no en `left:0` como asumía el código — probablemente por el
  `text-align:center` por defecto de `<button>` (Tailwind Preflight no
  lo resetea). El `translate-x-[22px]`/`translate-x-0.5` se aplicaba
  ENCIMA de esa base ya incorrecta, empujando el thumb completo (20px)
  fuera del track de 44px.
  - Track: 44×24px. Thumb: 20×20px. ON translate: 22px (el valor de
    translate en sí siempre fue matemáticamente correcto — el problema
    era el ancla faltante, no el offset).
  - Verificado antes del fix: `thumb overflows track by px=20.0`
    (thumb completo fuera). Después: `px=-2.0` (2px correctamente
    dentro, tal como se diseñó).
- **Archivos:** `src/components/ui/Toggle.tsx` (único cambio: se agrega
  `left-0` al `className` del thumb).
- **Regresión ejecutada (ronda 2):** `tsc -b`/`eslint`/`vite build`:
  verdes. Verificación empírica con Edge headless contra el CSS
  compilado real en 496/614/768(exacto)/1280px — sin desborde en
  ninguno. No se pudo confirmar 320/375/430px con esta herramienta (piso
  de ~496px del navegador headless en este equipo, no relacionado con
  el producto) — quedó marcado explícitamente como pendiente de
  confirmación manual.
- **7.9B — Manual Retest (tras el segundo fix): PASSED.**
  - RETEST-07A (Configuración → Notificaciones): PASSED — validado por
    el Product Owner en desktop y anchos responsivos, incluyendo
    320/375/430px (la confirmación manual que el análisis automático no
    pudo cubrir).
  - RETEST-07B (Crear Hábito → Cantidad → Permitir registros
    parciales): PASSED — el switch permaneció dentro del modal/track
    sin desborde.
- **Estado final: FIXED — MANUAL RETEST PASSED AFTER REOPEN.**
- **Baseline: DEPLOYED TO PRODUCTION — PRODUCTION SMOKE PASSED**
  (release SHA `3eaa0af`, verificado manualmente por el Product Owner
  contra `https://codgoli.com/habitos/` real).

### BUG-PROD-001 — Transparencia excesiva de modales

- **Causa raíz:** `Modal.tsx` usaba la clase compartida `.glass-surface`
  (`background: rgba(19,27,44,0.6)` en dark — 60% de opacidad, con
  `backdrop-filter: blur(20px)`) — la MISMA clase que usan overlays
  efímeros (`TopHeader`, `OverflowMenu`, `Tooltip`, `MobileNavigation`),
  donde 60% de opacidad es apropiado por ser contenido de vistazo rápido.
  Para un modal de formulario (contenido que se lee/escribe durante un
  tiempo, apilado sobre un backdrop ya translúcido `bg-black/60`), la
  misma transparencia deja el texto difícil de leer.
- **Archivos:** `src/index.css`, `src/components/ui/Modal.tsx`.
- **Fix:** nueva variable `--glass-bg-modal` (97% de opacidad, dark y
  light) y clase `.glass-surface-modal` — mismo blur/saturate/borde
  "premium" que `.glass-surface`, pero con superficie casi opaca. `Modal.tsx`
  la usa en vez de `.glass-surface`, sin tocar la clase compartida
  original (`TopHeader`/`OverflowMenu`/`Tooltip`/`MobileNavigation` no se
  modificaron — siguen usando `.glass-surface` sin cambios, cero riesgo de
  regresión ahí). Un solo cambio en el componente `Modal` compartido cubre
  Crear Hábito, Crear Meta y Editar Meta (los tres pasan por el mismo
  `<Modal>`) sin tocarlos individualmente.
- **Regresión ejecutada:** `tsc -b`/`eslint`/`vite build`: verdes.
- **7.9B — Manual Retest: PASSED.** Modal de Crear Hábito: superficie
  suficientemente opaca, fondo correctamente atenuado, la página de
  fondo ya no compite visualmente con el formulario, se conserva el
  aspecto "premium" oscuro, legibilidad mejorada. El fix de superficie
  específica para modales se da por aceptado visualmente.
- **Estado final: FIXED — MANUAL RETEST PASSED.**
- **Baseline: DEPLOYED TO PRODUCTION — PRODUCTION SMOKE PASSED**
  (release SHA `3eaa0af`, verificado manualmente por el Product Owner
  contra `https://codgoli.com/habitos/` real).

## 5. Hallazgos pendientes de regla de negocio (sección 9 del handoff) — clasificación con evidencia

**Ninguno de los cuatro se corrigió** — según instrucción explícita, solo
se clasifican con evidencia de código, sin cambiar comportamiento.

### A. Meta vencida permanece Activa / B. Meta al 100% permanece Activa

- **Clasificación: Pending Product Rule (confirmado, no reclasificado).**
- **Evidencia:** `20260731004632_goal_progress_source.sql`, sección final,
  dice textualmente: "goal_status: sin cambios automáticos...
  `recalculate_goal_current_value()` únicamente escribe
  `goals.current_value`. No hay ningún punto en esta migración que lea o
  modifique `goals.status` ni `goals.goal_lifecycle_status`... el encargo
  lo excluye explícitamente". Es una exclusión de alcance **documentada y
  deliberada**, no un olvido — refuerza que la decisión pendiente es
  legítimamente del Product Owner (¿debe una meta vencida o al 100%
  transicionar `status` automáticamente?), no un bug a corregir en 7.9A.

### C. Consejo de IA/insight puede quedar desactualizado ("racha en riesgo")

- **Clasificación: NOT CONFIRMED AS PRODUCTION BUG** (no "cerrado" — no
  descartar silenciosamente; requiere más revisión/aclaración del
  Product Owner antes de archivarse).
- **Evidencia:** `generateStreakRiskInsight()` (con ese texto exacto,
  `insightsEngine.ts`) solo se invoca en modo mock —
  `useDashboard.ts`: `const insights = isSupabaseDataSource ? [] : getInsights();`
  — en Supabase (Production) `insights` es **siempre `[]`**, por diseño
  explícito y documentado ("no se reimplementa el motor de insights
  completo... presentaría reglas deterministas como si fueran una IA
  real, algo que este encargo prohíbe explícitamente"). El motor de
  `recommendations` que SÍ corre en Production (mismo archivo, más abajo)
  no tiene ningún mensaje de tipo "racha en riesgo" hoy. Si el hallazgo se
  observó en modo mock (QA local previo a Deployment), es comportamiento
  mock preexistente fuera de alcance de un Production Smoke; si se
  esperaba verlo en Production, no puede ocurrir con el código actual.
  Sin cambios aplicados — requiere que el Product Owner aclare en qué
  modo/momento se observó antes de decidir cualquier acción. **No
  reclasificar a "cerrado"/"no bug" hasta esa aclaración** — el estado
  correcto hoy es "no confirmado", no "resuelto".

### D. Rankings con dataset disperso (hábito "más fuerte" y "más débil" a la vez)

- **Clasificación: Pending Product Rule (confirmado, mecanismo
  identificado).**
- **Evidencia:** `useDashboard.ts` — `strongestHabits =
  stats.habitComparison.slice(0, 2)`, `weakestHabits =
  [...stats.habitComparison].reverse().slice(0, 2)`. Con ≤4 hábitos
  elegibles, ambos slices se solapan — el mismo hábito puede caer en las
  dos listas simultáneamente. No existe ningún umbral mínimo de muestra
  antes de mostrar el ranking. Confirma el mecanismo exacto reportado; la
  regla de mínimo de datos sigue pendiente de definición por el Product
  Owner, no se inventó ninguna aquí.

## 6. Base de datos

```
Local migrations:       15/15 (sin cambios, sin migración nueva)
Production migrations:  15/15 (sin cambios — no se tocó Production)
Nueva migración creada: NO — los 8 bugs fueron defectos de frontend
Production DB modificada: NO
```

## 7. Validación técnica (final, tras todos los fixes)

```
npx tsc -b        → limpio (0 errores)
npm run lint      → limpio (0 errores, 0 warnings)
npm run build     → build correcto (mismo warning preexistente de chunk
                    size >500kB, ya documentado como deuda técnica, no
                    relacionado con 7.9A)
npm audit         → 0 vulnerabilidades
npx supabase db reset --local → 15/15 migraciones, sin errores
```

## 8. Comportamientos protegidos — no se tocaron

Ninguno de los fixes de 7.9A modificó: login/auth, `ProtectedRoute`, el
`basename`/`.htaccess` heredados de Deployment, creación de categoría/
hábito/meta, schedules, Checklist, registro de cumplimiento (booleano y
cantidad), Historial, Estadísticas, Dashboard, progreso manual
(25/100=25%, 80/100=80%, 100/100=100%, 120/100=120%), pausar/reactivar/
papelera/restaurar (a nivel de mecanismo — solo cambió cómo se
*muestran* los badges), validación de fechas, modo mock, ni ninguna
migración. Revisión de código confirma que estos flujos no fueron
tocados por ningún diff de esta sesión.

## 9. Siguiente paso

**7.9B — Manual Retest: COMPLETADO, 8/8 PASSED** (ver secciones 4, 11 y
12 para el detalle completo). Las 4 clasificaciones de la sección 5
siguen pendientes de regla de negocio — ninguna requiere acción de
código hasta que el Product Owner decida.

**Próximo bloque: redeployment controlado** de los 8 fixes hacia
Production, bloque separado con autorización explícita propia (no
autorizado por este documento) — build auditado, subida manual,
verificación post-deploy, siguiendo el mismo procedimiento ya usado en
7.7B/7.7C. Tras el redeploy: repetir el Production Smoke para confirmar
los 8 fixes también en vivo antes de darlos por cerrados a nivel de
producto.

## 10. Dataset QA Local — detalle exacto (7.9B)

Todo creado en Supabase Local (`127.0.0.1:54321`), usuario QA local,
2026-08-20 (fecha real del servidor). Cero datos/IDs copiados de
Production.

**Categoría (1):**
- `QA Local — Producción`

**Hábitos (3), todos con schedule diario (`valid_from = 2026-08-20`,
la fecha real de hoy — confirma en sí mismo el fix de BUG-PROD-004) y
vinculados a la categoría anterior:**
- `QA Local — Beber agua` — Sí/No (`boolean`), sin registrar hoy.
- `QA Local — Vasos de agua` — Cantidad, objetivo diario 8, unidad
  `vasos`, sin registrar hoy.
- `QA Local — Vasos alternativa` — Cantidad, objetivo diario 8, unidad
  `vasos`, sin registrar hoy. Existe específicamente para BUG-PROD-008
  (alternativa compatible al editar la meta asociada a "Vasos de agua").

**Metas (2):**
- `QA Local — Constancia vasos` — vinculada a `QA Local — Vasos de
  agua`, `progress_source = habit_logs`, `target_value = 40`,
  `unit = "vasos"` (deliberadamente **no** "días" — la unidad ya
  coincide con la del hábito vinculado, conforme a la semántica
  corregida en BUG-PROD-005: el backend suma el valor real del hábito,
  nunca cuenta días), `current_value = 0` (todavía sin logs),
  `status = active`, `goal_lifecycle_status = active` (punto de partida
  correcto para probar `active → paused → active → trash → restore` en
  BUG-PROD-007).
- `QA Local — Meta general` — sin hábito asociado, `progress_source =
  manual`, `current_value = 25`, `target_value = 100`, `unit = "%"`.

**Habit logs de hoy: 0** (deliberado — Checklist debe abrirse con los 3
hábitos pendientes para que el Product Owner los complete en vivo
durante el retest y así generar datos reales para BUG-PROD-005/006).

**Conteo verificado en Supabase Local en el momento de la preparación:**
```
auth.users:        1
profiles:           1
categories:         1
habits:              3
habit_categories:    3
habit_schedules:     3
habit_logs:          0
goals:               2
```

## 11. 7.9B Environment Incidents

Cuatro incidentes de **entorno de QA** ocurrieron durante la ejecución
de 7.9B. Ninguno es un bug de producto — se documentan aquí para que
una futura sesión no los confunda con hallazgos funcionales.

### ENV-7.9B-001 — Desfase UTC/hora local en la preparación del dataset

- **Causa:** al preparar el dataset QA se usó `current_date` del
  contenedor Postgres (UTC) como referencia de "hoy" en vez de la fecha
  real del navegador/app (zona horaria local) — el contenedor ya
  marcaba `2026-08-20` mientras el navegador marcaba `2026-08-19`.
- **Impacto:** `habits.start_date`/`habit_schedules.valid_from` de los 3
  hábitos QA quedaron un día adelantados, excluyéndolos del Checklist de
  hoy (bloqueó el inicio de RETEST-03).
- **Resolución:** corrección directa, solo en el dataset LOCAL
  (`UPDATE` de `start_date`/`valid_from` a `2026-08-19`).
- **Producto afectado:** NO. **Datos borrados:** NO. **Production
  afectada:** NO.

### ENV-7.9B-002 — `goal.start_date` con el mismo desfase

- **Causa:** el mismo error de referencia horaria (ver
  `ENV-7.9B-001`) también afectó `goals.start_date` de `QA Local —
  Constancia vasos`, dejado en `2026-08-20`.
- **Impacto:** `compute_goal_habit_logs_progress()` excluía el
  `habit_log` real de `2026-08-19` por caer un día antes del inicio del
  rango de la meta — `current_value` permanecía en `0` pese a existir un
  log válido (bloqueó RETEST-03C, "BUG-PROD-005 REOPENED" temporal).
- **Resolución:** `UPDATE goals SET start_date = '2026-08-19'` — un solo
  `UPDATE` de una columna, solo en el dataset LOCAL. El propio trigger
  `sync_goal_progress_from_goal_change_trg` (ya existente, sin tocar)
  recalculó `current_value` automáticamente al guardar el cambio.
- **Producto afectado:** NO. **Datos borrados:** NO. **Production
  afectada:** NO.

### ENV-7.9B-003 — Docker Desktop/Supabase Local detenidos tras suspensión de la máquina

- **Causa:** la máquina entró en suspensión entre turnos de la sesión;
  Docker Desktop (y con él, todo el stack de Supabase Local) quedó
  detenido al reanudar.
- **Impacto:** Auth/DB/REST locales no disponibles temporalmente; el
  frontend local tampoco respondía en un momento posterior (mismo
  origen).
- **Resolución:** se reinició Docker Desktop; los contenedores volvieron
  a levantar reutilizando sus volúmenes persistentes existentes (no
  `db reset`, no recreación de datos). Se confirmó por lectura read-only
  que el dataset QA y el usuario QA seguían intactos tras el reinicio.
- **Pérdida de datos:** NO. **Producto afectado:** NO. **Production
  afectada:** NO.

### ENV-7.9B-004 — Estado de `AuthContext` obsoleto tras la caída temporal de Auth local

- **Causa:** la pestaña del navegador que ya estaba abierta durante el
  incidente `ENV-7.9B-003` intentó verificar su sesión mientras Auth
  local no respondía, y quedó con ese estado de error en memoria.
- **Impacto:** la UI mostraba "No pudimos verificar tu sesión. Inicia
  sesión nuevamente." incluso después de que Auth local ya estaba sano
  de nuevo — una llamada directa `signInWithPassword` confirmó
  `HTTP 200` contra el backend ya recuperado, aislando el problema al
  estado obsoleto de esa pestaña específica, no al backend.
- **Resolución:** recarga completa de la pestaña (hard refresh) — sin
  ningún cambio de credenciales, usuario, ni backend.
- **Producto afectado:** NO. **Production afectada:** NO.

**Los cuatro incidentes están clasificados como Product Bug: NO** — son
fricciones del entorno de QA local (reloj del contenedor, sueño de la
máquina, estado de sesión del navegador), no defectos de la aplicación.

## 12. Regression Status — comportamientos validados durante 7.9B

Confirmados manualmente por el Product Owner contra Supabase Local
durante la ejecución de 7.9B (además de los 8 retests dirigidos de la
sección 4):

- Login/Auth local.
- Recuperación de sesión tras el reinicio de entorno (`ENV-7.9B-003`/
  `ENV-7.9B-004`, una vez refrescada la pestaña).
- Navegación SPA de Configuración (RETEST-01).
- Crear hábito (booleano y cantidad).
- Tipo de meta por cantidad (`quantity`).
- Fecha actual por defecto en formularios (RETEST-02).
- Checklist (registro de cumplimiento en vivo durante el retest).
- Registro de cantidad (`8/8 vasos`).
- Progreso automático de metas (RETEST-03).
- Asociación de meta a hábito, incluyendo cambio de asociación
  (RETEST-06).
- Lifecycle de metas completo: pausar/reactivar/papelera/restaurar
  (RETEST-05).
- Estadísticas de Mis Hábitos con datos reales (RETEST-04).
- Componente compartido Toggle (RETEST-07, tras el segundo fix).
- Componente compartido Modal (RETEST-08).

Se conserva también la validación técnica ya cerrada en 7.9A/7.9B:
TypeScript, lint, build, `npm audit` (0 vulnerabilidades), migraciones
locales 15/15.

**No existe todavía una suite de regresión automatizada** — todo lo
anterior fue validado manualmente en esta sesión. La automatización
(Playwright) es un bloque futuro (7.10), no ejecutado ni instalado en
7.9B.

## 13. Cierre — origen → fix → retest (traza completa)

Para cada bug, la cadena completa está documentada en la sección 4:
**observación original de Production** → **causa raíz y fix de 7.9A**
→ **resultado de retest manual de 7.9B** (incluyendo la reapertura y
segundo fix de BUG-PROD-003). Ningún hallazgo original de Production se
sobrescribió — `Contexto/04_QA/01_PRODUCTION_SMOKE_CONTEXT.md` conserva
la evidencia original tal como se registró en el handoff de Deployment
→ QA.
