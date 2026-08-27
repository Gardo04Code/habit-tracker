# Production Smoke — Contexto QA (Handoff Deployment → QA)

## 1. Purpose

Este documento es el **handoff formal** entre la sesión de Deployment
(Paso 7, ya cerrada) y una nueva sesión dedicada a **QA funcional,
corrección de bugs, retest, regresión y automatización (Playwright)**.

Es el **punto de entrada principal** para cualquier sesión nueva de QA
sobre Habit Tracker. Una sesión que no haya visto ninguna conversación
anterior debe poder leer este archivo y entender el estado real del
proyecto sin depender del historial conversacional de Deployment.

## 2. Application

| Campo | Valor |
|---|---|
| Project | Habit Tracker |
| Production frontend | `https://codgoli.com/habitos/` |
| Parent site (no tocar) | `https://codgoli.com/` |
| Production Supabase Project Ref | `xgasncrztfwotjlghlfg` |
| Region | `us-east-1` |
| Hosting | Hostinger (`public_html/habitos/` dentro del sitio Codgoli existente) |

## 3. Production Deployment Baseline

Estado validado al cierre de Deployment (Paso 7), confirmado con
lecturas read-only directas contra Production en esta misma sesión de
handoff (no solo heredado de documentación anterior):

- **Migraciones:** 15/15 aplicadas, 0 pendientes.
- **Tablas:** 7/7 (`profiles`, `categories`, `habits`,
  `habit_categories`, `habit_schedules`, `habit_logs`, `goals`).
- **RLS:** habilitada en 7/7 tablas.
- **Policies:** 19 (granulares, `rls_hardening.sql` — sin policies
  `ALL` amplias).
- **Constraints:** 36 (incluye `EXCLUDE` de no-solapamiento en
  `habit_schedules`).
- **Triggers:** 20 en `public` + `on_auth_user_created` en `auth.users`.
- **Functions:** 25 (24 propias + `rls_auto_enable`, función de
  plataforma Supabase, inocua).
- **Grants:** `authenticated` con privilegios exactos de
  `table_privileges.sql`; `anon` sin privilegios sobre tablas de
  aplicación (confirmado de nuevo en esta sesión: `401 permission
  denied` sobre `habits` con la Publishable Key pública).

**Frontend:**
- Base path: `/habitos/` (Vite `--base=/habitos/`, `vite.config.ts`
  sin `base` hardcodeado — se pasa por flag de CLI en build time).
- React Router: `<BrowserRouter basename={import.meta.env.BASE_URL}>`
  (`src/main.tsx`) — `BASE_URL` es `/` en desarrollo local, sin impacto.
- SPA fallback: `public/.htaccess` (se bundlea a `dist/.htaccess`),
  aislado con `RewriteBase /habitos/` — nunca toca el `.htaccess` raíz
  de Codgoli (que además no existe/no es visible en el listado).
- Deploy: contenido de `dist/` subido manualmente a
  `public_html/habitos/` (sin carpeta `dist/` anidada).

**Auth:**
- Site URL: `https://codgoli.com/habitos/` (exacta).
- Redirect URL: `https://codgoli.com/habitos/` (exacta, sin wildcard,
  sin `localhost`).
- Email Provider: ENABLED.
- Allow new users to sign up: ENABLED.
- Confirm Email: DISABLED (decisión V1 explícita del Product Owner).
- Custom SMTP: NOT CONFIGURED (fuera de alcance V1).
- OAuth: no configurado, no usado por el código (`signInWithOAuth`/
  `signInWithOtp`: cero referencias en todo `src/`).

Fuente de detalle completo: `MDs/14_DEPLOYMENT_PLAN.md` (secciones
"7.5B", "7.6", "7.7A"–"7.7C", "7.8" y "7.8 (cierre)").

## 4. Git Baseline

**DEPLOYED BASELINE** (lo que está realmente en producción, tanto
frontend en Hostinger como schema en Supabase Production):
- Branch `main`, commit `e452fef` ("docs: record release staging
  results and manifest") — este es el SHA sobre el que se generó el
  `dist/` desplegado en 7.7C.

**CURRENT LOCAL WORKTREE** (al momento de este handoff — NO
desplegado, NO commiteado):
- `git status --short` (verificado en esta misma sesión):
  ```
  M Contexto/03_DEPLOYMENT/03_DEPLOYMENT_MASTER_CONTEXT.md
  M MDs/14_DEPLOYMENT_PLAN.md
  M src/main.tsx
  ?? Contexto/03_DEPLOYMENT/04_PRODUCTION_ENVIRONMENT_CONTEXT.md
  ?? Contexto/03_DEPLOYMENT/05_SUPABASE_PRODUCTION_CONTEXT.md
  ?? Contexto/03_DEPLOYMENT/06_FRONTEND_PRODUCTION_CONTEXT.md
  ?? Contexto/03_DEPLOYMENT/07_HOSTINGER_CONTEXT.md
  ?? public/.htaccess
  ```
- **`src/main.tsx` modificado localmente** (`basename={import.meta.env.BASE_URL}`)
  y **`public/.htaccess` nuevo (untracked)** — **estos SÍ son los
  archivos que efectivamente se usaron para generar el `dist/`
  desplegado en 7.7C** (el build se generó desde este working tree, no
  desde un commit). El resto de cambios (`Contexto/`, `MDs/14`) es
  documentación de Deployment, no código.
- **Ninguno de estos cambios está commiteado ni pusheado.** Cualquier
  sesión de QA que modifique código deberá decidir, junto al Product
  Owner, si estos cambios (el `basename` y el `.htaccess`) se
  commitean como parte del primer commit de la sesión de QA, ya que
  son requisito para reproducir el build de Production.

**No asumir que el HEAD de git refleja lo desplegado en Hostinger** —
lo desplegado depende del working tree en el momento del build, no
solo del commit.

## 5. Production Test User / Security

- Existe **1 usuario Production**, creado durante 7.8/7.9 vía la UI
  real de signup.
- Existe **1 fila en `public.profiles`**, con `id` idéntico al `id`
  de `auth.users` (trigger `handle_new_user()` verificado
  funcionando correctamente en Production, confirmado con `JOIN`
  directo: `matched_uuid_count = 1`).
- `anon` sigue sin poder leer `profiles`/`habits`/ninguna tabla de
  aplicación (`401 permission denied`, reconfirmado en esta sesión de
  handoff).

**No se documenta ni se debe documentar en ningún archivo:** email,
password, access token, refresh token, JWT, session data, ni ningún
otro secreto. Este usuario se referencia únicamente como
**PRODUCTION USER A**.

## 6. Production Smoke Data

**Todos estos datos son REALES en Production** — fueron creados
exclusivamente a través de la UI pública (`https://codgoli.com/habitos/`)
por el Product Owner con PRODUCTION USER A. Confirmado por lectura
read-only directa en esta sesión de handoff (no solo por reporte
verbal):

| Tipo | Nombre | Detalle verificado en DB |
|---|---|---|
| Category | `Smoke Producción` | `lifecycle_status = active` |
| Habit | `Smoke — Beber agua` | `goal_type = boolean`, `lifecycle_status = active` |
| Habit | `Smoke — Vasos de agua` | `goal_type = quantity`, `target_value = 8`, `lifecycle_status = active` |
| Habit | `Prueba de despliegue` | `goal_type = quantity`, `target_value = 6`, `lifecycle_status = active` — este es el **tercer hábito auxiliar** mencionado durante la prueba de compatibilidad de metas (BUG-PROD-008); su nombre real, confirmado por consulta directa a la base de datos, es **`Prueba de despliegue`** (no tiene prefijo "Smoke —") |
| Goal | `Smoke — Constancia inicial` | asociada a `Smoke — Vasos de agua`, `target_value = 10`, `current_value = 8`, `unit = "días"`, `progress_source = habit_logs`, `status = active` |
| Goal | `Smoke — Meta general` | sin hábito asociado (meta general), `target_value = 100`, `current_value = 80`, `unit = "%"`, `progress_source = manual`, `status = active` |
| Habit log | (sin nombre, 2 filas) | `Smoke — Beber agua` → `2026-08-12`, `completed`, `value = null` (boolean); `Smoke — Vasos de agua` → `2026-08-12`, `completed`, `value = 8` |
| Habit schedules | 3 filas, una por hábito | ver sección 8 — 2 de las 3 tienen `valid_from = 2026-07-21` (evidencia de BUG-PROD-004, ver más abajo) |

**Conteo total verificado en esta sesión de handoff (read-only,
Production real):**

```
auth.users:         1
profiles:            1
categories:          1
habits:              3
habit_categories:    3
habit_schedules:     3
habit_logs:           2
goals:                2
```

**Estos datos NO deben borrarse sin autorización del Product Owner.**
Son evidencia de QA hasta que se autorice explícitamente un cleanup.
Ver sección 12.

## 7. Smoke Test Results

Resultados reportados directamente por el Product Owner tras ejecutar
el smoke en Production (no ejecutados ni observados por el asistente,
que no dispone de navegador en el entorno de Deployment — ver
limitación documentada en `MDs/14_DEPLOYMENT_PLAN.md`, bloque 7.9).

| Test | Result | Evidence/Notes |
|---|---|---|
| SMOKE-01 Login | PASSED | PRODUCTION USER A, login correcto |
| SMOKE-02 Category create | PASSED | `Smoke Producción` creada, visible sin reload |
| SMOKE-03 Habit create | PASSED | `Smoke — Beber agua` creado, visible en Mis Hábitos |
| SMOKE-04 Schedule | PASSED (estructuralmente) | `habit_schedules` verificado 3/3, pero ver BUG-PROD-004 (fecha de inicio incorrecta) |
| SMOKE-05 Checklist visibility | PASSED | Hábito visible en Checklist según schedule |
| SMOKE-06 Complete habit (habit log) | PASSED | Registro creado correctamente |
| SMOKE-07 Checklist persistence | PASSED | Persiste tras refresh y navegación |
| SMOKE-08 Goal creation | PASSED | `Smoke — Constancia inicial` creada y asociada |
| SMOKE-09 Goal progress | **FAILED** | Ver BUG-PROD-005 — discrepancia de unidad/porcentaje |
| SMOKE-10 History | PASSED | Registro visible con fecha/estado correctos |
| SMOKE-11 Statistics | PASSED | Carga sin `NaN`/`Infinity`/crash con el dataset mínimo |
| SMOKE-12 Dashboard | PASSED (parcial) | Ver BUG-PROD-006 (métricas de Mis Hábitos inconsistentes con otros módulos) |
| SMOKE-13 My Habits persistence | PASSED (parcial) | Ver BUG-PROD-006 |
| SMOKE-14 Logout/Login | PASSED | Logout real vía TopHeader, redirect a `/habitos/login`, login exitoso |
| SMOKE-15 Cross-session persistence | PASSED | Categoría/hábito/log/meta/historial presentes tras re-login |
| SMOKE-16 Authenticated deep link | PASSED | `/habitos/checklist` directo + refresh sin perder sesión |
| SMOKE-17 Responsive | UNKNOWN / REQUIRES CONFIRMATION | No reportado explícitamente con detalle suficiente para clasificar Pass/Fail/Limited |
| SMOKE-18 Console | UNKNOWN / REQUIRES CONFIRMATION | No reportado explícitamente |
| SMOKE-19 Network | UNKNOWN / REQUIRES CONFIRMATION | No reportado explícitamente, pero confirmado indirectamente: todo el dataset vive en el Project Ref correcto (`xgasncrztfwotjlghlfg`), sin evidencia de otro proyecto |
| SMOKE-20 Codgoli regression | PASSED | `https://codgoli.com/` intacto |

**Pruebas adicionales realizadas más allá del script original de 20
tests** (goal editing, lifecycle de metas, compatibilidad de hábitos —
ver secciones 8 y 9):

| Test adicional | Result | Evidence/Notes |
|---|---|---|
| Goal edit — pause | PASSED (con hallazgo) | Ver BUG-PROD-007 |
| Goal edit — soft delete (trash) | PASSED (con hallazgo) | Ver BUG-PROD-007 |
| Goal reactivation / restoration | PASSED | Funcionó correctamente |
| Goal edit — habit selector con alternativa compatible | **FAILED** | Ver BUG-PROD-008 |
| Modal transparency (varios flujos) | **FAILED** | Ver BUG-PROD-001 |
| Settings tras navegación SPA | **FAILED** (visual) | Ver BUG-PROD-002 |
| Switch/toggle alignment | **FAILED** (visual) | Ver BUG-PROD-003 |
| Default date en formularios de creación | **FAILED** | Ver BUG-PROD-004 — **confirmado también de forma independiente por lectura directa de `habit_schedules.valid_from`** (ver sección 8) |

## 8. Confirmed Production Bugs

Todos con estado **OPEN en Production** al cierre de este handoff
(evidencia original de esta sección preservada sin modificar). **Ciclo
completo 7.9A → 7.9B ya cerrado localmente:** los 8 recibieron un fix
candidato en 7.9A y **retest manual PASSED en 7.9B contra Supabase
Local** (8/8 — uno de ellos, BUG-PROD-003, requirió reapertura y un
segundo fix antes de pasar) — ver
`Contexto/04_QA/02_REGRESSION_CONTEXT.md` para causa raíz, archivos,
retest manual y estado final de cada uno.

**Importante — no confundir "retest local PASSED" con "corregido en
Production":** ninguno de los 8 fixes está desplegado en
`https://codgoli.com/habitos/` todavía. Production sigue ejecutando el
build de 7.7C, con los 8 bugs originales tal como se describen abajo,
hasta que se ejecute un redeployment controlado y se repita el
Production Smoke. IDs estables `BUG-PROD-00X`, no reutilizar
numeración.

### BUG-PROD-001 — Transparencia excesiva de modales
- **Severidad sugerida:** Media (UX/legibilidad).
- **Reproducción:** Crear Hábito, Crear Meta, Editar Meta.
- **Esperado:** Fondo del modal suficientemente opaco para legibilidad.
- **Actual:** Transparencia excesiva.
- **Módulo afectado:** UI compartida de modales.
- **Estado:** OPEN.

### BUG-PROD-002 — Settings puede renderizar en blanco tras navegación SPA
- **Severidad sugerida:** Media.
- **Reproducción:** Navegar a Configuración vía SPA (sin refresh) desde otra
  página.
- **Esperado:** Contenido visible inmediatamente.
- **Actual:** Puede aparecer en blanco; tras refresh manual se ve
  correctamente.
- **IMPORTANTE:** Settings **sí tiene contenido implementado** — este
  bug es sobre el renderizado tras navegación SPA, **no** sobre
  ausencia de funcionalidad. No documentar como "no implementado".
- **Módulo afectado:** `SettingsPage`, posible problema de
  montaje/remontaje de componente o de datos cargados de forma
  asíncrona sin estado de carga.
- **Estado:** OPEN.

### BUG-PROD-003 — Switch/toggle con overflow o desalineación
- **Severidad sugerida:** Baja-Media (visual).
- **Reproducción:** Configuración → Notificaciones; Crear Hábito →
  "Permitir registros parciales".
- **Módulo afectado:** Componente de switch/toggle compartido.
- **Estado:** OPEN.

### BUG-PROD-004 — Fecha de inicio por defecto incorrecta
- **Severidad sugerida:** Media (integridad de datos de schedule).
- **Reproducción:** Reportada por el Product Owner en múltiples flujos
  de creación (hábitos/metas), observando una fecha antigua/por
  defecto como `21/07/2026` mientras la fecha real del smoke era
  `12/08/2026`.
- **Confirmado de forma independiente en esta sesión de handoff**
  mediante lectura read-only de `public.habit_schedules`:
  - `Smoke — Beber agua` (creado `2026-08-12`): `valid_from = 2026-07-21`.
  - `Prueba de despliegue` (creado `2026-08-13`): `valid_from = 2026-07-21`.
  - `Smoke — Vasos de agua` (creado `2026-08-12`): `valid_from = 2026-08-12`
    (correcto) — **el bug no es 100% consistente**, ocurrió en 2 de 3
    hábitos creados, no en el tercero. Esto es un dato relevante para
    quien investigue la causa raíz (posible condición de carrera en el
    valor por defecto del formulario, o un estado de fecha no
    reinicializado entre aperturas del formulario).
- **NO recomendar** hardcodear `12/08/2026` como fix — la fecha debe
  derivarse dinámicamente de la fecha actual real, no de un literal.
- **Módulo afectado:** Formulario de creación de hábito
  (`HabitFormModal` u equivalente) y su valor por defecto de fecha.
- **Estado:** OPEN.

### BUG-PROD-005 — Discrepancia de unidad en Goal Progress automático
- **ACTUALIZADO en 7.9A (ver `Contexto/04_QA/02_REGRESSION_CONTEXT.md` para
  el detalle completo):** investigación y reproducción directa contra
  Supabase Local confirmaron que el backend (`compute_goal_habit_logs_progress()`,
  `20260731004632_goal_progress_source.sql`) hace exactamente lo que su
  propia documentación especifica — `current_value` = SUMA de
  `habit_logs.value` para hábitos `quantity`/`duration`/`repetitions`, NUNCA
  un conteo de días. **No es un bug de backend — es Expected Behavior por
  diseño ya aprobado (D-05).** El defecto real es de frontend: `goals.unit`
  era texto libre sin relación con la unidad real que se suma (el Product
  Owner pudo escribir "días" para una meta ligada a un hábito de "vasos"),
  produciendo una lectura sin sentido ("8 de 7 días") aunque el número fuera
  matemáticamente correcto. Fix aplicado en
  `src/components/goals/GoalFormModal.tsx`: la "Unidad" de una meta ligada a
  un hábito ahora se deriva automáticamente del `targetUnit` del hábito
  (campo bloqueado, ya no editable a mano) — no se tocó ninguna migración
  ni la función SQL. **Estado: Fixed — Retest Passed** (ver checkpoint de
  7.9A). El dato ya existente en Production (`Smoke — Constancia inicial`,
  `unit = "días"`) no se modificó — el fix es hacia adelante, no una
  migración de datos.
- **ACTUALIZADO en 7.9B:** Manual Retest **PASSED** contra Supabase
  Local (unidad derivada/bloqueada en `vasos`; tras registrar `8/8
  vasos` la meta mostró `8 de 40 vasos, 20%`; recalculo `8→5→8`
  verificado sin acumulación). Aún **NO desplegado a Production**. Ver
  `Contexto/04_QA/02_REGRESSION_CONTEXT.md`, sección 4, para el detalle
  completo incluyendo los dos incidentes de dataset (`ENV-7.9B-001`/
  `ENV-7.9B-002`) que aparecieron durante la ejecución.
- **Severidad sugerida (histórica, previa a 7.9A):** **Alta — candidato a
  regresión funcional crítica.**
- **Reproducción exacta reportada:**
  - Hábito: `Smoke — Vasos de agua`, objetivo diario: 8 vasos,
    cumplimiento diario: 8/8.
  - Meta asociada: `Smoke — Constancia inicial`, objetivo de meta: 7
    días.
  - Esperado: `1/7 días` ≈ 14%.
  - Observado en el momento del reporte: `8/7 días`, 114%, "Meta
    superada".
- **Confirmado de forma independiente en esta sesión de handoff**
  mediante lectura read-only: la meta `Smoke — Constancia inicial`
  tiene `unit = "días"` y `progress_source = habit_logs`, pero
  `current_value` **coincide exactamente con el valor crudo (`value = 8`)
  del único `habit_log` asociado**, en vez de con el **conteo de días
  con registro completado** (que debería ser `1`, ya que solo existe
  un `habit_log` para ese hábito). Esto confirma estructuralmente el
  mecanismo del bug: el cálculo automático de progreso está sumando/
  usando el valor de cantidad (`value`, en "vasos") como si fuera un
  conteo de días, sin conversión de unidad.
  - **Nota:** el `target_value` observado ahora en la base de datos es
    `10`, no `7` — esto es consistente con que el Product Owner editó
    la meta durante las pruebas de BUG-PROD-008 (edición de metas). El
    mecanismo del bug (unidad de cantidad usada como conteo de días)
    sigue siendo el mismo independientemente del valor de `target_value`
    en el momento de la lectura — **no se debe interpretar el cambio de
    `7` a `10` como que el bug se resolvió.**
- **Relación con reglas de negocio conocidas** (`Contexto/01_DISCOVERY/02_BUSINESS_RULES_CONTEXT.md`):
  "`habit_logs` se recalcula en DB", "boolean/deadline/accumulated_days
  no soportan progreso `habit_logs`" — sugiere que el `goal_type`/
  `progress_source` de esta meta específica podría estar usando una
  función de cálculo pensada para un tipo de meta distinto
  (posiblemente `accumulated_days`) mientras el hábito asociado es
  `quantity`. Requiere revisión de
  `compute_goal_habit_logs_progress()`/`sync_goal_progress_from_habit_log()`.
- **Módulo afectado:** Backend (función SQL de cálculo automático de
  progreso de metas) — no es un bug de frontend.
- **Estado:** OPEN.

### BUG-PROD-006 — Métricas de Mis Hábitos inconsistentes con registros persistidos
- **Severidad sugerida:** Media-Alta (integridad de UI derivada).
- **Reproducción:** Otros módulos (Checklist, Historial, Dashboard)
  mostraban correctamente: 2 completados, 100%, racha 1. La vista "Mis
  Hábitos" mostraba: racha activa 0, cumplimiento promedio 0%, últimos
  14 días 0%, 0 sesiones, 2 hábitos "en riesgo".
- **Módulo afectado:** Cálculo de métricas en la vista Mis Hábitos
  (posiblemente un hook/cálculo distinto al usado por Dashboard/
  Estadísticas, con una fuente de datos o ventana de fechas diferente).
- **Estado:** OPEN.

### BUG-PROD-007 — Representación de lifecycle de metas inconsistente
- **Severidad sugerida:** Media.
- **Reproducción:**
  - Al pausar una meta: el estado de nivel superior mostraba
    correctamente "Pausada", pero la tarjeta/filtros internos seguían
    considerándola "Activa".
  - Al enviarla a papelera: el estado de nivel superior mostraba
    correctamente "Papelera", pero la tarjeta/filtros internos seguían
    considerándola "Activa".
  - La reactivación/restauración funcionó correctamente en ambos casos.
- **Módulo afectado:** Filtrado/derivación de estado en la UI de
  tarjetas de meta — probable lectura de un campo de estado distinto
  (o desactualizado) al que sí se actualiza correctamente a nivel
  superior.
- **Estado:** OPEN.

### BUG-PROD-008 — No se puede seleccionar un hábito compatible al editar la meta asociada
- **Severidad sugerida:** Media-Alta (bloquea un flujo funcional).
- **Reproducción:** Al editar la meta `Smoke — Constancia inicial` para
  cambiar el hábito asociado, inicialmente solo existía una alternativa
  incompatible. Se creó deliberadamente un hábito adicional compatible
  (`Prueba de despliegue`, `goal_type = quantity`, igual que
  `Smoke — Vasos de agua`) específicamente para esta prueba. El
  selector de hábitos **seguía sin abrir/mostrar alternativas** incluso
  después de que el hábito compatible existía.
- **Módulo afectado:** Selector de hábito en el formulario de edición
  de meta (`GoalFormModal` u equivalente) — posible filtro de
  compatibilidad que no se recalcula, o el selector no se refresca con
  hábitos creados después de montar el formulario.
- **Estado:** OPEN.

## 9. Findings Pending Product Rule Confirmation

**NO clasificar todavía como bugs** — requieren que el Product Owner
confirme la semántica de negocio esperada antes de decidir si son
defectos o comportamiento intencional.

### A. Meta vencida permanece Activa
Probado con fecha límite pasada: tanto `100/100` como `80/100`
permanecieron en estado `Active`. Falta confirmar la semántica de
lifecycle esperada — ¿debería una meta vencida transicionar
automáticamente a `completed`/`expired` según el enum
`goal_status` (`active`/`completed`/`expired`, ya definido en el
schema), o el diseño actual delega esa transición exclusivamente a
acción manual del usuario?

### B. Meta al 100% permanece Activa
Relacionado con el hallazgo A — falta distinguir explícitamente entre
`lifecycle_status` (`active`/`paused`/`deleted`, ciclo de vida de la
meta como registro) y el estado de logro/progreso (`status`:
`active`/`completed`/`expired`, el enum `goal_status` ya existente en
el schema). Confirmar si alcanzar el 100% debería mover `status` a
`completed` automáticamente.

### C. Consejo de IA/insight puede quedar desactualizado
Ejemplo observado: recomendación de "racha en riesgo" persistiendo
pese a que el día ya estaba completado. Requiere revisión técnica de
`insightsEngine.ts` (o equivalente) y de sus reglas de recencia antes
de clasificarlo como bug — podría ser un problema de invalidación de
caché/recálculo, o un comportamiento de ventana de tiempo intencional.

### D. Rankings con dataset disperso
El mismo día/hábito puede aparecer simultáneamente como "más fuerte" y
"más débil" con muy pocos datos. No clasificar como bug sin más datos
— es esperable que un ranking con 1-2 puntos de datos produzca
resultados poco significativos; requiere definir una regla de mínimo
de datos antes de mostrar rankings, no necesariamente un fix de lógica.

## 10. Validated Behaviors — Protect Against Regression

Comportamientos verificados como correctos en Production — **no deben
romperse** durante la corrección de los bugs de la sección 8:

- Login/signup/logout en Production.
- Persistencia de sesión (`getSession`/`AuthContext`).
- `ProtectedRoute` (bloqueo sin sesión, acceso con sesión).
- Deep links autenticados (`/habitos/checklist` directo + refresh).
- Protección de rutas sin sesión (redirect a `/habitos/login`).
- Creación de categoría.
- Creación de hábito (booleano y de cantidad).
- Schedule diario generado automáticamente al crear el hábito.
- Checklist: visibilidad del hábito según schedule.
- Registro de cumplimiento (booleano y de cantidad).
- Persistencia del registro tras refresh y navegación.
- Historial: visualización del registro con fecha/estado correctos.
- Estadísticas: carga sin `NaN`/`Infinity`/crash con dataset mínimo.
- Dashboard: carga sin errores fatales.
- Creación de meta general (sin hábito asociado, progreso manual).
- Creación de meta asociada a hábito.
- Edición de meta (título/parámetros, salvo el bug puntual de
  selector de hábito — BUG-PROD-008).
- Pausado de meta (persiste al nivel superior, ver BUG-PROD-007 para
  el matiz de filtros internos).
- Reactivación de meta pausada.
- Soft delete (papelera) de meta.
- Restauración de meta desde papelera.
- Validación de fechas (rechaza fechas futuras — comportamiento ya
  extensamente validado en QA local, Paso 6).
- SPA routing bajo `/habitos/` (rutas, deep links, refresh).
- Regresión de `https://codgoli.com/` (sitio Codgoli intacto).
- Aislamiento del proyecto Supabase Production (`anon` sin acceso,
  confirmado repetidamente incluyendo en este handoff).

## 11. Known Production State After Smoke

**Estado verificado por lectura read-only directa en el momento de
este handoff** (no una cifra heredada de una sesión anterior):

```
auth.users:          1
profiles:             1
categories:           1
habits:               3
habit_categories:     3
habit_schedules:      3
habit_logs:            2
goals:                 2

Migrations:           15/15 (0 pending)
RLS tables:            7/7
Policies:              19
Constraints:           36
Triggers:              20
Functions:             25
```

**No usar declaraciones obsoletas como "0 usuarios"/"0 filas de
aplicación"** — esas eran ciertas antes del smoke (7.5B-7.8), pero ya
no reflejan el estado actual. Production contiene ahora datos reales
de Smoke QA (sección 6) y debe tratarse en consecuencia. Antes de
cualquier cleanup, revalidar estos conteos de nuevo con una consulta
read-only — pueden haber cambiado si el Product Owner siguió
explorando la aplicación después de este handoff.

## 12. QA Safety Rules

- **No borrar los datos de Smoke sin aprobación explícita del Product
  Owner.**
- No modificar la base de datos de Production mientras se corrigen
  bugs localmente — los fixes se desarrollan y validan en local
  (Supabase Local) primero.
- No ejecutar `db push` sin el mismo procedimiento controlado ya usado
  en Deployment (dry-run, auditoría, autorización explícita separada).
- No modificar migraciones ya aplicadas — cualquier corrección de
  schema es una migración nueva y aditiva.
- No modificar Auth de Production durante la corrección local de bugs.
- No desplegar a Hostinger durante la corrección local de bugs — un
  nuevo deploy requiere su propio bloque con autorización explícita.
- No tocar `https://codgoli.com/` (raíz de Codgoli) bajo ninguna
  circunstancia.
- No exponer secretos (nunca `service_role`, DB password, JWT secret
  en frontend, commits, ni documentación).
- No usar `service_role` en el frontend.
- No hacer `git commit`/`push` salvo autorización explícita y separada.

## 13. Next Recommended Block

- **7.9A — Production Smoke Bug Fixes:** análisis y corrección
  **local** de los bugs de la sección 8, con validación de regresión
  contra la sección 10. Sin deployment a Production.
- **7.9B — Manual Retest:** tras 7.9A, retest manual de cada
  `BUG-PROD-00X` corregido.
- Tras retest estable: **redeployment controlado** (mismo procedimiento
  ya usado: build auditado, upload manual, verificación post-deploy).
- **7.10 — Automated Testing Foundation:** una vez Production esté
  estable, introducir Playwright como framework E2E principal.
  Frameworks complementarios potenciales: Vitest, React Testing
  Library, Pytest (si aplica a alguna herramienta auxiliar).

## 14. Future QA Context Architecture

Estructura prevista (documental, no crear archivos vacíos todavía):

```
Contexto/04_QA/
├── 01_PRODUCTION_SMOKE_CONTEXT.md   (este archivo)
├── 02_REGRESSION_CONTEXT.md
├── 03_PLAYWRIGHT_CONTEXT.md
└── 04_AUTOMATED_TESTING_CONTEXT.md
```

Solo se crea `01_PRODUCTION_SMOKE_CONTEXT.md` en este bloque. Los
demás se crearán cuando el trabajo correspondiente exista realmente.

---

## NEW QA SESSION — READ FIRST

Antes de modificar cualquier código, lee en este orden:

1. **Este archivo primero** (`Contexto/04_QA/01_PRODUCTION_SMOKE_CONTEXT.md`).
2. `Contexto/00_GLOBAL/01_PROJECT_CONTEXT.md` (contexto global).
3. `Contexto/02_DEVELOPMENT/01_FRONTEND/01_FRONTEND_CONTEXT.md` (frontend).
4. `Contexto/02_DEVELOPMENT/03_DATABASE/01_DATABASE_CONTEXT.md` (database).
5. `Contexto/03_DEPLOYMENT/03_DEPLOYMENT_MASTER_CONTEXT.md` (Deployment
   maestro).
6. `Contexto/03_DEPLOYMENT/04_PRODUCTION_ENVIRONMENT_CONTEXT.md`.
7. `Contexto/03_DEPLOYMENT/05_SUPABASE_PRODUCTION_CONTEXT.md`.
8. `Contexto/03_DEPLOYMENT/06_FRONTEND_PRODUCTION_CONTEXT.md`.
9. `Contexto/03_DEPLOYMENT/07_HOSTINGER_CONTEXT.md`.
10. Reglas de negocio relevantes:
    `Contexto/01_DISCOVERY/02_BUSINESS_RULES_CONTEXT.md`, y las
    secciones aplicables de `MDs/14_DEPLOYMENT_PLAN.md` (bloques 7.5B
    en adelante) para el detalle exhaustivo de cada bloque de
    Deployment.

**El historial conversacional de la sesión de Deployment NO debe
tratarse como contexto requerido.** Los archivos de contexto del
repositorio son la fuente de continuidad — este documento y los
listados arriba contienen todo lo necesario para retomar el trabajo.

**Primera tarea activa: 7.9A — Production Smoke Bug Fixes.**

**Este contexto NO autoriza ningún deployment a Production.** Cualquier
redeployment futuro requiere su propio bloque con autorización
explícita del Product Owner, siguiendo el mismo procedimiento ya
documentado en `MDs/14_DEPLOYMENT_PLAN.md`.
