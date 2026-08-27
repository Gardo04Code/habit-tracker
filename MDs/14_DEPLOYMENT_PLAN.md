# 14 — Plan de Deployment (Paso 7)

**Fecha:** 2026-08-10. **Rol:** Principal DevOps Engineer / Release
Engineer / Senior Supabase Engineer / Cloud Deployment Architect /
Security Reviewer. **Bloque:** 7.1 — Release Audit / Deployment Plan.
**Alcance de esta tarea:** auditoría de solo lectura + diseño del plan.
**No se ejecutó ningún despliegue.**

## 1. Objetivo

Diseñar de forma controlada el Paso 7 (Deployment) del Habit Tracker,
partiendo del GO de QA (`MDs/13_E2E_QA_TEST_PLAN.md`, sección
"Re-ejecución del Cierre Final del Paso 6"), sin ejecutar ninguna acción
irreversible ni tocar sistemas remotos.

## 2. Alcance de esta sesión (7.1)

Incluye: inventario técnico, identificación de dependencias externas,
riesgos, decisiones pendientes, y documentación (`Contexto/03_DEPLOYMENT/03_DEPLOYMENT_MASTER_CONTEXT.md`
y este archivo).

No incluye: elegir proveedor de hosting, crear/vincular proyecto
Supabase, aplicar migraciones remotas, configurar dominio/DNS/HTTPS,
subir variables a un proveedor, cambiar Auth remoto, CI/CD, ni cualquier
`git add/commit/push`.

## 3. Precondiciones (verificadas en esta sesión)

| Precondición | Estado |
|---|---|
| GO de QA | **Sí** — `MDs/13`, "Re-ejecución del Cierre Final del Paso 6", veredicto `GO PARA PASO 7 — DEPLOYMENT`, 20/20 criterios |
| BUG-001..007 | 7/7 Fixed — Retest Passed, cero abiertos |
| `tsc --noEmit` | Passed (según QA; no se repitió en esta sesión, solo se corrió `npm run build`, que incluye `tsc -b`) |
| `npm run lint` | Passed (según QA; no se repitió en esta sesión) |
| `npm run build` | **Passed — reconfirmado en esta sesión**, mismo warning de chunk-size, sin errores nuevos |
| `npx supabase db reset --local --no-seed` | Passed según QA (no se repitió en esta sesión — no era necesario para una auditoría estática) |
| Branch | `main`, sincronizado con `origin/main` |
| Migraciones | **15**, coincide con baseline |
| `.env.local` | `VITE_DATA_SOURCE=mock` |

## 4. Arquitectura de release

```
React 19 + TS + Vite (SPA, client-side routing)
        │  build (tsc -b && vite build) → dist/
        ▼
   Hosting estático (PENDIENTE DE DECISIÓN)
        │  variables VITE_* inyectadas en build time por el proveedor
        ▼
   @supabase/supabase-js (cliente)
        │  HTTPS + anon/publishable key + RLS
        ▼
Supabase (Auth + PostgreSQL + RPC + triggers)  ← PENDIENTE DE DECISIÓN (proyecto remoto)
```

No hay backend propio (API custom, servidor Node, etc.) — el único
backend es Supabase. No hay Edge Functions detectadas en el repo.

## 5. Entornos

### 5.1 LOCAL (existente, en uso)
Supabase Local (Docker, `supabase/config.toml`) + `VITE_DATA_SOURCE=mock`
o `supabase` (apuntando a `127.0.0.1:54321`). Ya operativo, sin cambios
necesarios.

### 5.2 STAGING — PENDIENTE DE DECISIÓN
**Evaluación:** para un proyecto personal de un solo desarrollador, con
Supabase Local ya cumpliendo la función de entorno de pre-producción
(usuarios reales, RLS real, migraciones reales, ya usado exhaustivamente
en QA), un staging remoto separado es **recomendable pero no
obligatorio**. Sería sobreingeniería exigirlo como bloqueante para el
primer deploy, pero si el usuario planea iterar con frecuencia después
del lanzamiento, un proyecto Supabase "staging" barato (free tier)
reduce el riesgo de aplicar una migración rota directamente contra
producción. **Recomendación:** opcional para el primer release;
revaluar si el ritmo de cambios post-lanzamiento aumenta.

### 5.3 PRODUCTION — PENDIENTE DE DECISIÓN
Requiere: proveedor de hosting elegido, proyecto Supabase autorizado
(nuevo o el existente `xgasncrztfwotjlghlfg`), dominio (opcional al
inicio, se puede lanzar con el subdominio gratuito del proveedor).

## 6. Inventario técnico de release

### 6.1 Frontend
- Framework: React 19.2 + TypeScript + Vite 8.1.
- Build: `npm run build` → `tsc -b && vite build`.
- Output: `dist/` (SPA estática: `index.html` + `assets/*.js,*.css` +
  `favicon.svg` + `icons.svg`).
- Routing: `react-router-dom` 7, cliente puro → **requiere fallback SPA**
  (`/* → /index.html`) en el hosting elegido, o recargar cualquier ruta
  distinta de `/` devolverá 404.
- Fuentes externas: Google Fonts vía `<link>` en `index.html`
  (`fonts.googleapis.com`, `fonts.gstatic.com`) — dependencia externa a
  tener en cuenta para CSP/headers si el hosting los impone.
- Warning conocido: 2 chunks > 500 kB (`index-*.js` ~1.23 MB,
  `StatusDonut3D-*.js` ~1.0 MB) — deuda técnica aceptada por QA, no
  bloqueante, candidato a code-splitting futuro.

### 6.2 Supabase
- Auth, PostgreSQL, RLS, RPC y triggers — confirmados en uso extensivo
  según QA (`MDs/13`, secciones de RLS/seguridad) y por la presencia de
  `src/services/auth.service.ts`, `src/contexts/AuthContext.tsx`,
  `src/routes/ProtectedRoute.tsx`.
- 15 migraciones en `supabase/migrations/`, todas aditivas según el
  historial de QA (ninguna reescribe una migración anterior).
- Sin Edge Functions en el repo.
- CLI local vinculado (`supabase/.temp/project-ref` →
  `xgasncrztfwotjlghlfg`) — archivo no trackeado, gitignored. **No es
  autorización de uso**, solo evidencia de que en algún momento se
  ejecutó `supabase link` localmente.

### 6.3 Base de datos
- Baseline: 15 migraciones aditivas, reproducibles (`db reset` limpio
  según QA).
- Sin `seed.sql` (confirmado: no existe en el repo).
- Datos que NO deben migrarse a producción: usuarios/hábitos de prueba
  creados durante QA (`qa.*`, `@habitos.test`, y cualquier dato de
  Supabase Local) — las migraciones llevan solo estructura, nunca datos
  locales.

### 6.4 Entorno / secretos
- `.env.example` trackeado, sin valores (solo nombres de variable).
- `.env.local` NO trackeado (confirmado con `git check-ignore`), sin
  secretos reales — solo URL local y `publishable key` de Supabase
  Local (segura para cliente).
- `.gitignore` cubre `.env`, `.env.local`, `dist`, `node_modules`,
  `.claude/`, `.mcp.json` — correcto.
- `grep -rn "service_role|SECRET_KEY|SERVICE_ROLE" src/` → solo un
  comentario explicativo no ejecutable en `auth.service.ts`. Cero uso
  real en código cliente.
- `dist/` generado en esta auditoría (y luego eliminado) no contenía
  secretos, solo la URL local `127.0.0.1:54321` inlined desde
  `.env.local` — confirma que el build productivo debe generarse con las
  variables del proveedor, no reutilizando un build local.

### 6.5 Git
- Branch `main`, sincronizado con `origin/main`
  (`github.com/Gardo04Code/habit-tracker`).
- 34 archivos `M` (rediseño ya documentado por QA) + `??`: `Contexto/`,
  `MDs/09-13`, `.env.example`, `src/contexts/`, `src/hooks/useAuth.ts`,
  `useCategories.ts`, `useDashboard.ts`, `useGoals.ts`, `useHabits.ts`,
  `src/lib/`, `src/pages/LoginPage.tsx`, `src/routes/ProtectedRoute.tsx`,
  `src/services/`, `src/types/database.types.ts`, `src/types/entities.ts`,
  `src/vite-env.d.ts`, `supabase/`.
- Nada de esto es "material temporal/scratchpad" — todo corresponde a
  trabajo real de integración Backend/Database ya validado por QA. Sin
  archivos sospechosos de contener secretos entre los `??`.

## 7. Variables y secretos — clasificación

| Variable | Tipo | Dónde debe vivir |
|---|---|---|
| `VITE_SUPABASE_URL` | Pública | Variables de entorno del proveedor de hosting (build time) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Pública (segura para cliente por diseño; RLS es la barrera real) | Variables de entorno del proveedor de hosting (build time) |
| `VITE_DATA_SOURCE` | Pública (controla mock vs. supabase) | Variables de entorno del proveedor de hosting; **debe fijarse en `supabase` solo para el build de producción**, sin tocar `.env.local` |
| `service_role` (Supabase) | Secreta | Nunca en frontend/Vite/Git/dist. Solo si algún día existe backend/Edge Function propio, y ahí como secreto de servidor |
| DB password / JWT secret | Secreta | Panel de Supabase únicamente, nunca en el repo |

No se copiaron valores reales a este documento.

## 8. `VITE_DATA_SOURCE` en producción

Decisión a tomar en el proveedor de hosting (variable de entorno del
build), **no editando `.env.local`**: fijar `VITE_DATA_SOURCE=supabase`
únicamente en la configuración de build del proveedor productivo. El
modo `mock` se conserva en `.env.local` para desarrollo/regresión local,
sin cambios.

## 9. Estrategia conceptual — alternativas de hosting (sin contratar nada)

No se asume proveedor. Tres alternativas razonables para una SPA Vite
+ React sin backend propio:

| Proveedor | Ventajas | Desventajas | Notas |
|---|---|---|---|
| **Vercel** | Config casi cero para Vite SPA, fallback SPA automático, preview deployments por PR, rollback a un deploy anterior con un clic, HTTPS/dominio gratis incluido | Vendor lock-in leve, límites de free tier (bandwidth/build minutes) | Probablemente el de menor fricción operativa |
| **Netlify** | Similar a Vercel, fallback SPA vía `_redirects` (`/* /index.html 200`), rollback con un clic, dominio/HTTPS gratis | Config manual del fallback (un archivo, mínimo esfuerzo) | Alternativa casi equivalente a Vercel |
| **Cloudflare Pages** | Red global, HTTPS/dominio gratis, rollback con un clic, límites de free tier generosos | Fallback SPA requiere `_redirects` igual que Netlify; ecosistema ligeramente menos maduro para React que los dos anteriores | Buena opción si ya se usa Cloudflare para DNS |

Los tres: soportan variables de entorno por entorno (production/preview),
HTTPS automático, dominio custom opcional, rollback a un build anterior
sin acción destructiva. Ninguno requiere backend propio porque Supabase
ya cubre esa capa. **Decisión final: PENDIENTE DE DECISIÓN del usuario.**

## 10. Supabase remoto — estrategia conceptual

`xgasncrztfwotjlghlfg.supabase.co` está vinculado localmente (CLI) pero
**no confirmado como destino autorizado**. Tratado como SOLO LECTURA
CONCEPTUAL / NO UTILIZAR hasta que el usuario confirme una de estas
opciones:

- **PENDIENTE DE DECISIÓN:** ¿ese proyecto es nuestro y se usará como
  producción?
- **PENDIENTE DE DECISIÓN:** ¿se usará como staging?
- **PENDIENTE DE DECISIÓN:** ¿se crea un proyecto nuevo para
  producción (y este queda descartado o como staging)?

Ninguna acción (`link`, `db push`, `migration up`, MCP remoto) se
ejecutará hasta esa confirmación explícita.

## 11. Estrategia conceptual de migraciones (futuro, no ejecutado)

1. Backup del proyecto destino (backup automático de Supabase o
   `pg_dump` manual) antes de cualquier migración.
2. Validar que el proyecto destino es el correcto (branch/URL/ref
   confirmados explícitamente por el usuario).
3. Validar migraciones pendientes (`supabase migration list` contra
   remoto, sin aplicar).
4. Dry-run/inspección cuando la herramienta lo permita (revisión manual
   línea por línea de las 15 migraciones, ya hecha parcialmente por QA
   para las 3 más recientes en busca de cambios de RLS).
5. Aplicar migraciones en orden (`supabase db push`, solo tras
   autorización explícita, fuera de esta sesión).
6. Comprobar RLS activa en las tablas esperadas.
7. Comprobar RPC (funciones `SECURITY DEFINER` con `GRANT`/`REVOKE`
   correctos, patrón ya usado en `harden_functions.sql`).
8. Comprobar triggers (creación de perfil en signup, goal progress,
   etc.).
9. Smoke de DB: `SELECT` básico sobre 2-3 tablas clave con `anon`
   (debe fallar con 401 sin sesión) y con un usuario autenticado real.
10. Plan de rollback/recuperación: restaurar desde el backup del paso 1
    si una migración falla o corrompe datos; nunca prometer rollback
    automático de Supabase — es responsabilidad de quien ejecuta.

## 12. Auth — qué depende del dominio (aún no configurable)

Pendientes hasta tener dominio/proveedor de hosting decidido:

- **Site URL** de Supabase Auth → debe apuntar al dominio productivo
  final.
- **Redirect URLs** → deben incluir el dominio productivo y,
  probablemente, mantener `localhost`/`127.0.0.1` para desarrollo
  continuo.
- CORS/origins permitidos → dependen del dominio final.

No dependen del dominio (se pueden revisar antes, conceptualmente):
signup habilitado, confirmación de email (actualmente
`enable_confirmations=false` en local, según QA — decidir si producción
requiere confirmación real), expiración de sesión, política de reset de
password. **Todo esto: PENDIENTE DE DECISIÓN**, sin tocar Auth remoto en
esta sesión.

## 13. SPA routing — requisito registrado

`react-router-dom` en modo cliente. El proveedor de hosting elegido
deberá configurarse con fallback `/* → /index.html` (Vercel: automático
para SPA; Netlify/Cloudflare Pages: archivo `_redirects` con
`/* /index.html 200`). No se implementa hasta elegir proveedor.

## 14. Seguridad pre-deploy — checklist (a verificar antes del GO final, no ejecutado aún)

- [ ] Sin `service_role` en frontend (verificado en `src/` en esta
      sesión; repetir contra el `dist/` del build productivo real).
- [ ] Sin secretos en `dist/` (verificado en esta sesión sobre un build
      local; repetir sobre el build con variables de producción).
- [ ] RLS activa en todas las tablas relevantes (ya auditado
      exhaustivamente por QA en local; reconfirmar en el proyecto
      remoto elegido).
- [ ] `anon` sin acceso indebido (patrón ya validado en local: 401 sin
      `GRANT`).
- [ ] CORS/Auth URLs correctas para el dominio final.
- [ ] HTTPS activo (por defecto en los 3 proveedores evaluados).
- [ ] `.env.local` ignorado por Git (confirmado en esta sesión).
- [ ] Decisión explícita sobre source maps en build productivo —
      **PENDIENTE DE DECISIÓN**.
- [ ] Headers básicos de seguridad según el proveedor elegido.
- [ ] Dependencias auditadas (`npm audit`, no ejecutado en esta sesión
      por no ser requerido para 7.1; recomendable antes del deploy
      real).
- [ ] Ningún endpoint `localhost`/`127.0.0.1` en el build productivo
      (el build local de esta sesión sí lo tenía porque usó
      `.env.local` — el build real deberá usar las variables del
      proveedor).
- [ ] Ningún dato de QA (`qa.*`, `@habitos.test`) en producción.

## 15. Datos de QA / seed

Sin `seed.sql` en el repositorio. Usuarios y datos generados durante QA
(`qa.*`, `@habitos.test`, hábitos/logs de prueba) viven únicamente en
Supabase Local — las migraciones migran estructura, no datos. No hay
riesgo de arrastre porque no existe ningún mecanismo de seed automático
detectado.

## 16. Backup y rollback

| Escenario | Estrategia |
|---|---|
| A. Fallo de migración | Backup previo (sección 11, paso 1) + restauración manual; nunca asumir rollback automático de Supabase |
| B. Frontend roto | Rollback al build/deploy anterior — disponible con un clic en los 3 proveedores evaluados (Vercel/Netlify/Cloudflare Pages), no automático hasta confirmarlo en el proveedor elegido |
| C. Auth mal configurado | Revertir Site URL/Redirect URLs en el panel de Supabase; bajo impacto si se cambia rápido, pero no hay "deshacer" automático — hay que corregir manualmente |
| D. Bug crítico post-deploy | Rollback de frontend (B) +, si aplica, migración correctiva aditiva (nunca editar una migración ya aplicada) |
| E. Migración irreversible | Requiere backup pre-migración (sección 11); sin backup, no hay garantía de recuperación — por eso el backup es obligatorio antes de cualquier migración remota |
| F. Caída de proveedor | Fuera de nuestro control directo; mitigación = elegir proveedor con buen historial de uptime, sin acción adicional posible desde este proyecto |

## 17. Observabilidad — nivel mínimo recomendado

Para un proyecto personal de esta escala, evitar sobreingeniería:
- Logs nativos de Supabase (Auth/DB/API) — ya disponibles sin
  configuración adicional, suficientes para depurar incidentes.
- Errores de navegador — revisión manual tras el deploy (consola +
  Network), sin necesidad de un servicio externo todavía.
- Disponibilidad — el propio proveedor de hosting reporta uptime
  básico.
- **No se recomienda** Sentry/Datadog/similar para el primer release —
  se puede reevaluar si el proyecto gana usuarios reales más allá del
  propio autor.

## 18. Plan de smoke post-deploy (a ejecutar en 7.9, no ahora)

- **AUTH:** signup, login, logout.
- **CATEGORÍAS:** crear una.
- **HÁBITOS:** crear uno.
- **SCHEDULE:** crear uno.
- **CHECKLIST:** registrar una entrada.
- **METAS:** crear una.
- **HISTORIAL:** visualizar.
- **ESTADÍSTICAS:** visualizar.
- **DASHBOARD:** visualizar.
- **RLS:** Usuario B no ve datos de Usuario A.
- **RESPONSIVE:** móvil y escritorio.
- Recarga directa de rutas internas (`/habits`, `/checklist`, etc.) sin
  404 — valida el fallback SPA.
- HTTPS activo, dominio correcto.
- Persistencia de sesión tras reload.
- Logout real (sesión efectivamente terminada, no solo visual).

## 19. Criterios de GO para producción (futuro, no evaluado aún)

Se evaluarán en el bloque 7.12, una vez completados 7.2–7.11:
proveedor elegido y desplegado, Supabase remoto confirmado y con
migraciones aplicadas limpiamente, Auth configurado para el dominio
final, checklist de seguridad (sección 14) 100% verde, smoke post-deploy
(sección 18) 100% passed, backup confirmado antes del primer deploy de
DB.

## 20. Decisiones pendientes (resumen)

1. Proveedor de hosting (Vercel / Netlify / Cloudflare Pages / otro).
2. Destino de Supabase remoto: ¿`xgasncrztfwotjlghlfg` es nuestro y
   autorizado, se usa como staging, o se crea uno nuevo?
3. ¿Staging separado de producción, o solo local + producción?
4. Dominio productivo (o subdominio gratuito del proveedor para el
   primer release).
5. Política de confirmación de email en Auth de producción.
6. Política de source maps en el build productivo.
7. Si `Contexto/` y `MDs/` se versionan en Git o se mantienen fuera del
   repo.

## 21. Roadmap 7.x propuesto

- **7.1** Release Audit / Deployment Plan — **esta sesión, completada**.
- **7.2** Git & Release Preparation (decidir qué se commitea, orden de
  commits, sin push todavía).
- **7.3** Production Environment Definition (con las decisiones de la
  sección 20 ya tomadas por el usuario).
- **7.4** Supabase Remote Preparation (proyecto confirmado, sin aplicar
  migraciones aún).
- **7.5** Database Migration (backup + aplicar las 15 migraciones al
  remoto elegido).
- **7.6** Frontend Production Configuration (variables en el proveedor,
  `VITE_DATA_SOURCE=supabase`).
- **7.7** Frontend Deployment (primer deploy real).
- **7.8** Auth / Domain / HTTPS (Site URL, Redirect URLs, dominio).
- **7.9** Post-Deployment Smoke (sección 18).
- **7.10** Security Validation (sección 14, contra el entorno real).
- **7.11** Observability / Backup / Rollback (confirmar que lo diseñado
  en las secciones 16-17 funciona en la práctica).
- **7.12** Final Production GO.

## 22. Confirmación expresa — no ejecutado en esta sesión

No se modificó código funcional. No se modificaron ni crearon
migraciones. No se ejecutó `db push`. No se tocó Supabase remoto. No se
usó el MCP remoto de Supabase. No se hizo `git add`, `commit` ni `push`.
No se desplegó nada. No se inició el bloque 7.2. El único cambio
temporal fuera de documentación fue un `npm run build` local (para
verificar el build productivo) seguido de la eliminación de `dist/`
(gitignored, nunca commiteado).

---

## 7.3 — Production Environment Definition

**Fecha:** 2026-08-10. **Rol:** Principal DevOps Engineer / Cloud
Architect / Senior Supabase Engineer / Release Engineer / Security
Reviewer. **Alcance:** definir de forma completa el entorno de
producción antes de crear o tocar cualquier recurso remoto. **No se
desplegó nada, no se creó ningún recurso remoto.**

### Baseline confirmado al iniciar

Branch `main`, `git status -sb` → `## main...origin/main` (sin
ahead/behind), `HEAD` = `e452fef` — coincide exactamente con el SHA
final aprobado de 7.2B. Working tree limpio.

**Docker:** `docker version` responde desde el cliente pero falla al
conectar con `dockerDesktopLinuxEngine`; `npx supabase status` falla por
el mismo motivo. **Docker sigue sin estar disponible en este entorno.**
`npx supabase db reset --local --no-seed` **no se ejecutó** — se
mantiene como:

> **BLOCKER OPERATIVO ANTES DE 7.4/7.5:** ejecutar
> `npx supabase db reset --local --no-seed` y confirmar 15 migraciones
> aplicadas limpiamente, en cuanto haya un entorno con Docker Desktop
> operativo. No bloquea el cierre de 7.3 (definición de entorno, no
> migración), pero **sí bloquea 7.4/7.5** (cualquier interacción real
> con Supabase Production).

### 7.3.1 Arquitectura de producción

```
USUARIO
  │  HTTPS
  ▼
HOSTINGER (hosting estático)
  │  sirve dist/ (HTML + CSS + JS + assets), SPA fallback → index.html
  ▼
React 19 + Vite SPA (se ejecuta en el navegador del usuario)
  │  @supabase/supabase-js, HTTPS + anon/publishable key
  ▼
Supabase Production — API/Auth/RPC (PostgREST + GoTrue)
  │
  ▼
PostgreSQL Production (RLS + triggers + funciones SECURITY DEFINER)
```

**Qué vive en Hostinger:** únicamente los artefactos estáticos de
`dist/` (`index.html`, `assets/*.js`, `assets/*.css`, `favicon.svg`,
`icons.svg`) y la configuración de fallback SPA (ver 7.3.3). Hostinger
**nunca** contiene DB password, `service_role`, JWT secret, ni ninguna
credencial de PostgreSQL — no hay backend propio que las necesite.

**Por qué `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` sí
pueden vivir en el frontend:** ambas están diseñadas por Supabase para
ejecutarse en un cliente público — la URL es simplemente el endpoint
público de la API, y la `publishable key` (`anon`) solo identifica al
proyecto y a un rol sin privilegios; la barrera de seguridad real es
**RLS en PostgreSQL**, no el secreto de esta clave. Vite además las
incrusta literalmente en el bundle JS en build-time (`import.meta.env`),
por lo que ya serían visibles a cualquiera que inspeccione el código
del navegador — tratarlas como secretas sería una falsa sensación de
seguridad.

### 7.3.2 Hostinger — modalidad de deployment

El frontend es una **SPA estática** (React 19 + Vite, sin SSR, sin
loaders de servidor, `react-router-dom` 100% cliente — confirmado en
7.1/7.2). Por tanto la modalidad correcta es:

**A. Static website / hosting de archivos `dist/`** — confirmado
técnicamente, no se requiere Node en el servidor (Hostinger ofrece
planes de hosting compartido/estático y planes con Node; para esta SPA,
un hosting de archivos estáticos es suficiente y más simple). La
modalidad exacta disponible (hosting compartido con subida de
archivos, File Manager, FTP/SFTP, o un plan con Git deploy) depende del
plan contratado — **PENDIENTE DE CONFIRMAR PLAN**.

- **Build command:** `npm run build` (`tsc -b && vite build`).
- **Output directory:** `dist/`.
- **Archivos que deben subirse:** el contenido completo de `dist/`
  (`index.html`, `assets/`, `favicon.svg`, `icons.svg`).
- **Archivos que NO deben subirse:** `node_modules/`, código fuente
  `src/`, `.env.local`, `package.json`/`package-lock.json`,
  `Contexto/`, `MDs/`, `supabase/` — nada de esto es necesario para
  servir la SPA compilada, y subir código fuente o configuración
  expondría innecesariamente detalles internos.
- **Caché:** recomendable cachear `assets/*.js`/`*.css` de forma
  agresiva (llevan hash en el nombre de archivo, Vite ya lo genera —
  `index-<hash>.js`) y **no** cachear `index.html` (o con TTL corto),
  para que un nuevo deploy se refleje sin que el navegador sirva un
  `index.html` viejo apuntando a assets con hash antiguo. Configuración
  exacta depende de los headers que permita el plan de Hostinger —
  **PENDIENTE DE CONFIRMAR PLAN**.
- **HTTPS:** se espera que Hostinger lo provea automáticamente (Let's
  Encrypt o equivalente) sobre el dominio/subdominio asignado — a
  confirmar en 7.7/7.8 según el plan real.

### 7.3.3 SPA routing en Hostinger

Rutas internas (`/checklist`, `/habits`, `/history`, `/statistics`,
`/goals`, `/settings`) deben recargar sin 404. Como es hosting de
archivos estáticos (típicamente Apache en Hostinger), la estrategia
esperada es un archivo `.htaccess` en la raíz de `dist/` con una regla
de reescritura tipo:

```
fallback de cualquier ruta no encontrada → /index.html
```

**No se crea el archivo en esta tarea** (prohibido modificar código en
7.3). Queda definido como:

- **Necesidad:** obligatoria — sin esto, cualquier recarga de una ruta
  distinta de `/` devuelve 404 real del servidor, rompiendo la
  navegación directa y los enlaces compartidos.
- **Estrategia:** `.htaccess` con `RewriteEngine`/`RewriteRule`
  fallback a `index.html` si Hostinger sirve sobre Apache (lo más
  probable en hosting compartido); alternativa equivalente si el plan
  expone otro mecanismo (panel de configuración de SPA, `_redirects`,
  etc.).
- **Ubicación futura:** `public/.htaccess` en el repo (para que Vite lo
  copie a `dist/.htaccess` en cada build) o subido manualmente junto al
  `dist/` en cada deploy — decisión de implementación para 7.6/7.7.
- **Riesgo:** si se omite, la app solo funcionará navegando desde `/`
  vía clicks internos (el router de React sí funciona en cliente), pero
  cualquier recarga, enlace directo o marcador a una ruta interna
  fallará con 404 del servidor.
- **PENDIENTE DE CONFIRMAR PLAN:** el mecanismo exacto depende de si el
  plan de Hostinger corre sobre Apache (lo esperado) u otra pila.

### 7.3.4 Variables de entorno y estrategia de build productivo

`VITE_DATA_SOURCE=supabase` para producción — Vite incrusta las
variables `VITE_*` en **build time**, no en runtime, por lo que el
build productivo **debe generarse con las variables reales de
producción**, nunca reutilizando un `dist/` generado localmente con
`.env.local` apuntando a `127.0.0.1:54321` (riesgo ya confirmado y
documentado en 7.1/7.2A).

Dos estrategias evaluadas:

| Estrategia | Descripción | Ventaja | Riesgo |
|---|---|---|---|
| **A. Build local controlado, subir `dist/`** | Generar el build en una máquina de confianza con variables de producción exportadas temporalmente (nunca escritas en `.env.local`), y subir manualmente el `dist/` resultante a Hostinger | Simple, no depende de que Hostinger soporte pipelines Git/Node; control total sobre qué exactamente se sube; consistente con el flujo ya usado en 7.1/7.2A/7.2B (build local + inspección de `dist/` antes de cualquier acción) | Manual, requiere disciplina para no mezclar variables ni reutilizar un build viejo |
| **B. Build vía pipeline/deployment de Hostinger (Git)** | Si el plan lo soporta, Hostinger construye desde el repositorio con variables configuradas en su panel | Automatiza el build, reduce pasos manuales | Depende de que el plan contratado soporte Node/build pipelines (no confirmado); mayor superficie de configuración remota antes de tener el primer deploy validado |

**Recomendación para V1:** **Estrategia A (build local controlado)** —
más simple, más segura, y no depende de una capacidad de Hostinger
todavía sin confirmar. Es coherente con cómo se ha operado todo el Paso
7 hasta ahora (builds locales inspeccionados antes de cualquier acción
irreversible). Se puede migrar a la estrategia B más adelante si el
plan lo soporta y se justifica automatizar.

**`npm ci` vs `npm install` para el build productivo:** se recomienda
**`npm ci`**, no `npm install`, porque `package-lock.json` ya está
versionado (commit `7feeb63`) y es la fuente de verdad de las versiones
exactas auditadas en 7.2A (`npm audit` = 0 vulnerabilidades). `npm ci`
instala exactamente lo que dice el lockfile y falla si hay
discrepancia, evitando que una resolución distinta de dependencias
transitorias introduzca versiones no auditadas en el build productivo.
`npm install` podría actualizar silenciosamente el lockfile. No se
ejecuta ninguno de los dos en esta tarea.

**Pipeline conceptual para el futuro deploy (7.6/7.7, no ejecutado
ahora):**

```
1. git status limpio, sobre el commit/tag de release aprobado
2. npm ci
3. exportar variables de producción (VITE_SUPABASE_URL,
   VITE_SUPABASE_PUBLISHABLE_KEY, VITE_DATA_SOURCE=supabase)
   solo para este build, sin tocar .env.local
4. npm run build
5. auditar dist/ (grep de secretos, confirmar ausencia de
   127.0.0.1/localhost, confirmar tamaño esperado)
6. subir dist/ a Hostinger
```

### 7.3.5 Release SHA

El artefacto de producción debe generarse siempre desde un **working
tree limpio sobre un commit/SHA de release explícitamente aprobado**,
nunca desde un working tree con cambios sin commitear. El SHA aprobado
actual es `e452fef` (7.2B). Si entre esta sesión y el deploy real
ocurren más commits documentales o de configuración, el Deployment
deberá registrar explícitamente el **release SHA** exacto usado para
generar el `dist/` que se sube — no asumir que "el HEAD actual" es
automáticamente el aprobado sin verificarlo contra el último GO
documentado.

### 7.3.6 Matriz Local vs. Producción

| Concepto | Local | Producción |
|---|---|---|
| Frontend URL | `http://localhost:5173` (Vite dev) | Subdominio/dominio temporal de Hostinger (PENDIENTE DE CONFIRMAR — ver 7.3.10) |
| Supabase URL | `http://127.0.0.1:54321` | `https://<project-ref>.supabase.co` (proyecto NUEVO, aún no creado) |
| Publishable Key | Publishable key de Supabase Local | Publishable key del proyecto Production (distinta, se obtiene al crear el proyecto) |
| `VITE_DATA_SOURCE` | `mock` (por defecto en `.env.local`) | `supabase` (solo en la config de build productivo, nunca en `.env.local`) |
| DB | PostgreSQL en contenedor Docker local | PostgreSQL gestionado por Supabase Production |
| Auth | GoTrue local, `enable_confirmations = false` (config.toml) | Auth del proyecto Production — configuración independiente, a definir en 7.4/7.8 |
| Email confirmations | Desactivadas (Local) | **PENDIENTE DE DECISIÓN DEL PRODUCT OWNER** — ver 7.3.9 |
| Logs | Logs de contenedores Docker / Supabase Studio local | Logs nativos del panel de Supabase Production |
| Datos QA | Presentes (usuarios `qa.*`/`@habitos.test`, hábitos/logs de prueba) | **No deben existir** — producción arranca vacía |
| Migraciones | 15, aplicadas localmente vía `db reset` | Las mismas 15, aplicadas una sola vez en 7.5, mismo orden, mismo contenido |
| Secrets | Publishable key local únicamente (no secreta) | Publishable key de Production (no secreta) + secretos de plataforma (DB password, JWT secret, `service_role`) que **nunca** salen del panel de Supabase |

Ambos entornos usan URLs, claves y datos completamente distintos — no
existe ningún mecanismo en el código que pueda confundirlos (el switch
es explícito vía `VITE_SUPABASE_URL`/`VITE_DATA_SOURCE`, sin
fallback implícito a producción).

### 7.3.7 Variables públicas y secretas — inventario final

**Públicas (frontend, `VITE_*`, se incrustan en el bundle en build
time):**

| Variable | Dónde vive | ¿Entra a Git? | ¿Entra a `dist`? |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Config de build de Hostinger (futuro) | No (solo el nombre en `.env.example`) | Sí (incrustada, es pública por diseño) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Config de build de Hostinger (futuro) | No (solo el nombre en `.env.example`) | Sí (incrustada, es pública por diseño) |
| `VITE_DATA_SOURCE` | Config de build de Hostinger (futuro), fijada en `supabase` | No (solo el nombre en `.env.example`) | Sí (incrustada) |

**Secretas (plataforma Supabase, nunca en el frontend/repo):**

| Secreto | Dónde vive | Quién puede verla | ¿Entra al build? | ¿Entra a Git? |
|---|---|---|---|---|
| DB password (PostgreSQL Production) | Panel de Supabase / gestor de contraseñas | Solo el Product Owner (o quien administre el proyecto) | No | No |
| JWT secret | Panel de Supabase | Solo administradores del proyecto | No | No |
| `service_role` / secret key | Panel de Supabase | Solo administradores; nunca en código cliente | No | No |
| Otros secretos de Supabase (si se llegaran a usar Edge Functions/Storage con claves propias) | Panel de Supabase → variables de Edge Functions | Solo administradores | No (no aplica, este proyecto no usa Edge Functions hoy) | No |

**Estrategia de almacenamiento:** los secretos de plataforma deben
guardarse en un **gestor de contraseñas** (o el propio panel de
Supabase, que ya los protege) — nunca en `Contexto/`, `MDs/`, `.env.example`,
capturas de pantalla, ni mensajes de chat. Ninguna variable secreta
debe aparecer jamás en Git, `dist/`, `Contexto/` o `MDs/` — esto ya se
verificó exhaustivamente en 7.2/7.2A/7.2B (cero secretos reales en el
Release Candidate) y debe mantenerse igual para cualquier documentación
futura de 7.4 en adelante.

### 7.3.8 Supabase Production — diseño (sin crear nada)

**Debe ser:**
- Un proyecto **nuevo**, creado expresamente para Habit Tracker.
- Explícitamente identificado y distinto del remoto desconocido
  (`xgasncrztfwotjlghlfg`).
- Sin datos QA (arranca vacío salvo estructura de sistema).

**Naming conceptual propuesto** (sin ejecutar): nombre de proyecto
`Habit Tracker Production`, project-ref esperado con un slug similar a
`habit-tracker-prod` (el ref real lo asigna Supabase automáticamente al
crear el proyecto, no es elegible por el usuario — el nombre sí).

**Información que necesitaremos después de crearlo** (a registrar en
7.4, nunca en texto plano fuera de un gestor de contraseñas para lo
secreto):

| Dato | Frontend puede conocerlo | Dónde se registra |
|---|---|---|
| Project Ref | Sí (forma parte de la URL pública) | `Contexto/03_DEPLOYMENT/04_...` (documental, no secreto) |
| Project URL | Sí | Variable `VITE_SUPABASE_URL` en Hostinger |
| Publishable Key | Sí | Variable `VITE_SUPABASE_PUBLISHABLE_KEY` en Hostinger |
| DB password | **No** | Gestor de contraseñas únicamente |
| Región | Informativo, no secreto | Documentación |
| Auth config (Site URL, Redirect URLs, confirmaciones) | Parcialmente (Site URL es pública) | Panel de Supabase, documentado en 7.4/7.8 |

### 7.3.9 Región de Supabase

Criterio: el usuario está en México, el producto es inicialmente
personal (un solo usuario real esperado al inicio). La región debe
elegirse por:

- **Latencia** — cercanía geográfica al usuario reduce el tiempo de
  respuesta de cada request a PostgREST/Auth.
- **Cercanía geográfica** — preferir una región de Norteamérica si está
  disponible entre las opciones vigentes de Supabase al momento de
  crear el proyecto.
- **Disponibilidad del proveedor** — Supabase no garantiza que todas
  las regiones estén siempre disponibles para nuevos proyectos; la
  lista exacta cambia con el tiempo.

**No se inventan regiones específicas disponibles.** La región exacta
se elegirá al crear el proyecto según las opciones vigentes de
Supabase en ese momento — **recomendación: seleccionar la opción más
cercana geográficamente a México disponible en ese momento.**

### 7.3.10 Base de datos — qué migra y qué no

**Sí migra (estructura, vía las 15 migraciones, en 7.5):** schema,
enums, funciones, triggers, RLS, grants, índices.

**No migra (nunca, bajo ninguna circunstancia):** usuarios QA, `habit_logs`
de QA, categorías QA, hábitos QA, metas QA, cualquier dato mock, ningún
dato de Supabase Local.

**Confirmado:** sin `seed.sql` en el repositorio (ya verificado en
7.1/7.2). Producción **comenzará completamente vacía** salvo las
estructuras de sistema que las propias migraciones crean (tablas,
triggers, funciones) — no hay ningún mecanismo de seed automático que
pudiera arrastrar datos de prueba.

### 7.3.11 Estrategia futura de migraciones (predefinición de 7.5, no ejecutada)

1. Validar backup/estado del proyecto Production nuevo (probablemente
   vacío en el primer deploy).
2. Confirmar explícitamente el project ref autorizado (nunca asumirlo).
3. Vincular el CLI de forma controlada (ver salvaguarda, 7.3.12).
4. Comprobar las migraciones locales (15, sin cambios desde 7.2B).
5. Inspeccionar diff contra el proyecto remoto antes de aplicar.
6. Aplicar migraciones en orden.
7. Verificar objetos creados (tablas, enums, funciones).
8. Verificar RLS activa.
9. Verificar grants (patrón ya usado en `harden_functions.sql`/`table_privileges.sql`).
10. Verificar RPC (`SECURITY DEFINER`, `GRANT EXECUTE` correctos).
11. Verificar triggers (incluido el trigger de creación de perfil en
    signup — crítico para que Auth funcione end-to-end).
12. Smoke con un usuario real (signup → login → operación básica →
    logout) contra el proyecto Production recién migrado.
13. Registrar claramente el entorno vinculado (o desvincular el CLI si
    se prefiere no dejarlo persistentemente enlazado) al terminar.

### 7.3.12 Salvaguarda del Supabase CLI

Dado que `supabase/.temp/project-ref` apunta actualmente al remoto
desconocido `xgasncrztfwotjlghlfg` (archivo local, no trackeado,
gitignored), antes de cualquier `supabase link` futuro contra el
proyecto Production real:

1. **Inspeccionar** `supabase/.temp/project-ref` al inicio de 7.4 para
   confirmar qué queda vinculado en ese momento (podría seguir siendo
   el desconocido, o haber cambiado si otra sesión/herramienta lo tocó).
2. **Desvincular la referencia local temporal** si corresponde (borrar
   o sobrescribir `supabase/.temp/project-ref` mediante el propio flujo
   del CLI, nunca editándolo a mano) — solo cuando se vaya a vincular
   el proyecto correcto, no antes.
3. **Confirmar manualmente** el project ref de Production (copiado
   directamente del panel de Supabase por el Product Owner, nunca
   adivinado ni reutilizado del histórico).
4. **Hacer `supabase link` explícito** contra ese ref confirmado.
5. **Verificar inmediatamente** que el ref vinculado (`supabase/.temp/project-ref`
   tras el link) coincide exactamente con el confirmado en el paso 3 —
   una segunda lectura, no asumir que el comando hizo lo correcto.
6. **Nunca ejecutar `db push`** hasta una **segunda confirmación
   explícita** del Product Owner, independiente de la autorización de
   crear el proyecto — crear el proyecto y aplicar migraciones son dos
   decisiones distintas.

Ninguno de estos pasos se ejecuta en 7.3 — quedan documentados para
7.4/7.5.

### 7.3.13 Backup

**Distinción FIRST DEPLOY vs. FUTURE DEPLOYS:**

- **FIRST DEPLOY** (proyecto Production nuevo, presumiblemente vacío,
  sin datos de usuario todavía): el "backup" previo es principalmente
  registrar la versión/estado del proyecto recién creado antes de
  aplicar la primera migración. El rollback más simple en este caso
  específico **podría** ser recrear el proyecto desde cero si sigue
  vacío tras un fallo — pero **no se asume que esto sea siempre
  viable** (podría haber ya un usuario real registrado, límites de
  creación de proyectos en el plan de Supabase, u otra razón que lo
  impida). No se debe depender de "simplemente borrar y recrear" como
  única estrategia.
- **FUTURE DEPLOYS** (con datos de usuario reales ya existentes): backup
  obligatorio antes de cada migración nueva — backup nativo de Supabase
  si el plan lo incluye, o `pg_dump` manual como alternativa; registrar
  la versión/migración aplicada; tener un plan de restauración probado,
  no solo teórico.

### 7.3.14 Auth de producción — requisitos (a configurar en 7.4/7.8, no ahora)

Depende del dominio final (no configurable todavía):
- **Site URL** → debe apuntar a la URL de Hostinger (temporal) y luego
  actualizarse cuando se conecte dominio propio.
- **Redirect URLs** → debe incluir la URL de producción vigente, y
  probablemente mantener `localhost`/`127.0.0.1` para seguir
  desarrollando localmente contra Supabase Local sin interferencia.
- **CORS/origins** → dependen del dominio final.

No depende del dominio (se puede decidir antes, pero no configurar
todavía sin proyecto creado):
- Confirmación de email — ver 7.3.15.
- Política de expiración de sesión — sin cambios respecto al default de
  Supabase salvo necesidad demostrada (no evaluado como bloqueante para
  V1).
- Reset password — funcionalidad estándar de Supabase Auth, requiere
  que el envío de email funcione (ver 7.3.16, SMTP).

### 7.3.15 Recomendación — confirmación de email en producción

**Opción A — confirmación activada:** más segura (evita signups con
correos ajenos/inválidos), pero depende de que el envío de email
funcione de forma confiable (ver SMTP, 7.3.16) y añade fricción de UX
(el usuario debe revisar su correo antes de poder usar la app).

**Opción B — confirmación desactivada inicialmente:** UX inmediata (el
usuario puede usar la app justo después de registrarse, igual que en
Local/QA, donde `enable_confirmations = false`), sin dependencia de
SMTP desde el día uno, pero permite registrar cualquier email sin
verificar que exista.

**Recomendación para V1:** dado que Habit Tracker es, según el propio
contexto del proyecto, una **aplicación personal** (un usuario principal
conocido, no un producto abierto al público en este momento), el riesgo
de signups fraudulentos es bajo. **Opción B (confirmación desactivada
inicialmente)** es razonable para V1, evitando la dependencia de SMTP
day-one, y se puede activar la Opción A más adelante si la app se abre
a más usuarios. **Esta es una recomendación, no una decisión asumida**
— el Product Owner debe confirmarla explícitamente (ver decisiones
pendientes).

### 7.3.16 Email / SMTP

El SMTP por defecto de Supabase (para confirmaciones/reset password)
tiene límites de envío bajos y no está pensado para uso productivo
serio (Supabase lo documenta como apto solo para desarrollo/pruebas).

- **Si se elige Opción A (confirmación activada):** un SMTP propio es
  **recomendable antes del lanzamiento real a más de un usuario**, pero
  para un único usuario personal (el propio Product Owner) el SMTP
  default de Supabase probablemente sea **suficiente para V1** (bajo
  volumen).
- **Si se elige Opción B (confirmación desactivada):** SMTP propio es
  **opcional** — solo se necesitaría para el flujo de reset password,
  que sí seguiría dependiendo de email incluso sin confirmación de
  signup.

**Clasificación para V1:** SMTP propio → **opcional**, no obligatorio,
dado el volumen esperado (uso personal). Recomendable revisarlo si el
proyecto gana usuarios reales adicionales. No se configura nada en esta
tarea.

### 7.3.17 Dominio inicial

Decisión ya tomada: usar inicialmente la URL/subdominio temporal que
provea Hostinger. Qué cambia cuando se conecte un dominio propio más
adelante:

- **Site URL de Supabase Auth** → debe actualizarse al nuevo dominio.
- **Redirect URLs** → debe agregarse (o reemplazarse) la URL del nuevo
  dominio.
- **DNS** → configuración nueva apuntando el dominio al hosting de
  Hostinger (fuera de alcance de este proyecto de código, es
  configuración de infraestructura).
- **HTTPS** → debe reemitirse/confirmarse el certificado para el nuevo
  dominio (normalmente automático vía Hostinger/Let's Encrypt).
- **Variables frontend** → `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`
  no cambian (siguen siendo del mismo proyecto Supabase); no hay
  ninguna variable frontend que codifique el dominio propio del
  frontend.
- **Rebuild** → **no se requiere** rebuild del frontend solo por
  cambiar de dominio (el frontend no tiene el dominio hardcodeado en
  ninguna variable) — pero si el cambio de dominio implica cambiar
  `VITE_SUPABASE_URL` (por ejemplo, si también se migra el proyecto
  Supabase), entonces sí sería necesario un rebuild, porque Vite
  incrusta esa variable en build-time.

### 7.3.18 Source maps

Confirmado: `vite.config.ts` (leído en esta sesión, sin cambios) no
declara `build.sourcemap` — el valor por defecto de Vite es **`false`**,
por lo que el build productivo actual **no genera archivos `.map`**. La
decisión de "no publicar source maps para V1" ya se cumple con la
configuración actual sin necesidad de ningún cambio. **No se modificó**
`vite.config.ts` en esta tarea (ni era necesario). Si en el futuro se
decidiera generar source maps (p. ej. para depurar errores productivos
con más detalle), deberían excluirse explícitamente de lo que se sube a
Hostinger o servirse de forma restringida — pero eso queda fuera de
alcance de V1.

### 7.3.19 Headers de seguridad — evaluación conceptual

| Header | Nivel | Notas |
|---|---|---|
| `X-Content-Type-Options: nosniff` | **Mínimo recomendado** | Sin riesgo de romper nada, previene MIME-sniffing |
| `Referrer-Policy: strict-origin-when-cross-origin` (o similar) | **Mínimo recomendado** | Sin riesgo, reduce fuga de URLs completas a terceros |
| `Strict-Transport-Security` | **Mínimo recomendado**, una vez HTTPS esté confirmado y estable | Solo activar tras confirmar que HTTPS funciona de forma consistente en el dominio final — activarlo prematuramente sobre un dominio con HTTPS inestable puede bloquear el acceso |
| `X-Frame-Options` / `frame-ancestors` (CSP) | **Mínimo recomendado** | La app no necesita ser embebida en iframes de terceros; bajo riesgo de romper algo |
| `Permissions-Policy` | **Avanzado** | Requiere revisar qué APIs del navegador usa la app (ninguna sensible detectada hasta ahora — sin geolocalización, cámara, micrófono) antes de restringir |
| `Content-Security-Policy` | **Avanzado, mayor riesgo** | Esta app carga Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) y se conecta a Supabase (`https://<project-ref>.supabase.co`) — una CSP mal configurada puede romper fuentes, el cliente de Supabase, o WebGL/Three.js (usado en `StatusDonut3D`). Requiere una lista explícita de orígenes permitidos, probada contra la app real, antes de activarse |

**Recomendación:** implementar el nivel mínimo en 7.8 (junto con Auth/
dominio, cuando la URL final ya esté fija), y dejar CSP/Permissions-Policy
como trabajo de 7.10 (Security Validation) con pruebas explícitas contra
el sitio ya desplegado, para no arriesgar romper fuentes/Supabase/WebGL
a ciegas. No se implementa nada en 7.3.

### 7.3.20 CORS / orígenes permitidos

**Distinción importante:** no se configura CORS manualmente en
PostgreSQL — el control de orígenes permitidos para la API de Supabase
(PostgREST/Auth) vive en la configuración de **Auth** del proyecto
Supabase (Site URL + Redirect URLs, sección 7.3.14), no en el hosting
ni en la base de datos directamente.

Orígenes que eventualmente deberán estar permitidos:
- `http://localhost:5173`/`http://127.0.0.1:5173` (desarrollo local,
  ya configurado en `supabase/config.toml` para Local — no aplica
  igual al proyecto remoto, que necesita su propia configuración).
- La URL de producción de Hostinger (temporal, aún no asignada).
- El futuro dominio propio, cuando se conecte.

No se cambia ninguna configuración en esta tarea.

### 7.3.21 Observabilidad mínima (V1, sin herramientas SaaS externas)

- **Logs de Supabase** (Auth/API/DB) — nativos del panel, disponibles
  sin configuración adicional.
- **Logs/errores de Hostinger** — según lo que exponga el plan
  contratado (panel de control, logs de acceso/errores).
- **Consola del navegador durante el smoke** — revisión manual tras
  cada deploy (ya es la práctica seguida en 7.1-7.2B).
- **Uptime manual/inicial** — verificación manual periódica, sin
  herramienta de monitoreo automatizado para V1.
- **Auth logs** — nativos del panel de Supabase.

**Sentry u otra herramienta SaaS de error tracking:** queda como
**opcional futuro**, solo si se demuestra necesidad real (por ejemplo,
errores intermitentes difíciles de reproducir manualmente) — no se
agrega para V1, evitando sobreingeniería para un proyecto personal.

### 7.3.22 Riesgos identificados en 7.3

- **Docker/Supabase Local no disponible en este entorno** — `db reset`
  pendiente, bloquea 7.4/7.5 hasta resolverse (no bloquea el cierre de
  7.3).
- **Plan de Hostinger aún no confirmado** — varias decisiones técnicas
  (modalidad de deploy, mecanismo de fallback SPA, headers disponibles,
  caché) dependen del plan exacto contratado; marcadas explícitamente
  como PENDIENTE DE CONFIRMAR PLAN.
- **CSP mal configurada podría romper Google Fonts/Supabase/Three.js**
  si se implementa sin pruebas — por eso se pospone a 7.10 con
  validación explícita.
- **Confusión Local/Producción** — mitigado por la matriz 7.3.6 y por
  el hecho de que ninguna variable tiene fallback implícito entre
  entornos.
- **Reutilizar un `dist/` viejo o generado con variables incorrectas**
  — mitigado por la estrategia de build local controlado (7.3.4) y el
  registro explícito de release SHA (7.3.5).

### 7.3.23 Prerrequisitos de 7.4

1. Docker Desktop operativo y `npx supabase db reset --local --no-seed`
   ejecutado con éxito (15 migraciones) — **blocker operativo**.
2. Autorización explícita del Product Owner para **crear** un proyecto
   Supabase Production nuevo (no se crea nada hasta esa autorización).
3. Confirmación de si el remoto desconocido
   (`xgasncrztfwotjlghlfg`) debe ignorarse por completo (preferencia
   actual) o si el Product Owner lo reconoce y decide reutilizarlo —
   de no haber respuesta, 7.4 procederá asumiendo que se crea un
   proyecto nuevo, conforme a la preferencia ya expresada.
4. Aplicar la salvaguarda del CLI (7.3.12) antes de cualquier
   `supabase link`.

### 7.3.24 Confirmación expresa — no ejecutado en 7.3

No se creó ningún proyecto Supabase Production. No se usó el remoto
desconocido `xgasncrztfwotjlghlfg` (ni se intentó inspeccionar,
conectar, ni vincular). No se ejecutó `supabase link`. No se ejecutó
`db push` ni migraciones remotas. No se tocó Hostinger. No se desplegó
nada. No se configuró dominio ni DNS. No se modificó código funcional
ni `vite.config.ts` (solo se leyó para confirmar el comportamiento
default de source maps). No se modificaron ni crearon migraciones. No
se instalaron dependencias. No se hizo `git add`, `commit` ni `push`.
No se inició 7.4.

---

## 7.4A — Local Preflight & Supabase Production Creation

**Fecha:** 2026-08-10. **Rol:** Principal DevOps Engineer / Senior
Supabase Engineer / Database Release Engineer / Security Engineer /
Production Readiness Reviewer. **Alcance:** preflight local completo +
intento controlado de creación de Supabase Production. **Resultado:
PAUSED — el preflight de Docker/`db reset` no pudo completarse, por lo
que, conforme a la regla explícita de esta tarea, no se creó ningún
proyecto Supabase Production.**

### Baseline Git

`git branch --show-current` → `main`. `git status -sb` → sin
ahead/behind respecto a `origin/main`. `git rev-parse --short HEAD` →
`e452fef` (coincide con el SHA aprobado de 7.2B). Working tree con
cambios **documentales únicamente**, heredados de 7.3 (que no estaba
autorizada a commitear):
`Contexto/03_DEPLOYMENT/03_DEPLOYMENT_MASTER_CONTEXT.md` (M),
`MDs/14_DEPLOYMENT_PLAN.md` (M, este mismo archivo),
`Contexto/03_DEPLOYMENT/04_PRODUCTION_ENVIRONMENT_CONTEXT.md` (`??`,
creado en 7.3). **Cero cambios funcionales inesperados** — explicable
en su totalidad por el trabajo documental ya reportado al cierre de 7.3.

### Auditoría de migraciones

`supabase/migrations/` → **15 archivos**, orden cronológico correcto,
última `20260806162035_goal_progress_concurrency.sql` (coincide con el
baseline). `git status --short supabase/migrations` → sin salida (cero
modificaciones). Ninguna migración fue editada.

### Docker preflight

```
docker version
Client: Version 29.6.2 ...
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine:
  The system cannot find the file specified.
```

```
npx supabase status
{"_tag":"Error","error":{"code":"LegacyStatusDbInspectError", ...
  failed to connect to the docker API ...}}
```

**BLOCKER 7.4A: Docker Desktop no disponible en este entorno de
ejecución.** El cliente Docker responde, pero no logra conectar con el
daemon (`dockerDesktopLinuxEngine`). Mismo síntoma ya documentado en
7.2B y 7.3. **No se intentó instalar ni reconfigurar Docker** (fuera de
alcance, y explícitamente prohibido).

**Consecuencia directa, conforme a la regla explícita de la sección 5
del encargo:** *"El preflight local debe pasar ANTES de crear
producción"* → `npx supabase db reset --local --no-seed` **no se
ejecutó** (Supabase Local es inalcanzable sin Docker) → **no se creó
ningún proyecto Supabase Production en esta sesión.**

### Validación local independiente de Docker (sí se ejecutó)

- `npx tsc --noEmit`: **Passed** (sin salida).
- `npm run lint`: **Passed** (sin salida).
- `npm run build`: **Passed** (mismo warning de chunk-size, deuda
  técnica ya aceptada, no bloqueante). `dist/` generado, inspeccionado
  como parte del flujo habitual, eliminado tras la verificación.
- `npm audit`: **0 vulnerabilidades.**

### Referencia local al proyecto desconocido — auditoría y neutralización

`supabase/.temp/project-ref` (antes de tocar nada) contenía
`xgasncrztfwotjlghlfg` — confirmado **LOCAL LINK REFERENCE = UNKNOWN /
UNAUTHORIZED**, consistente con lo ya documentado en 7.1-7.3.
`supabase/.temp/linked-project.json` reveló metadata adicional del
vínculo local histórico (nombre de proyecto genérico y un
`organization_id`) — se documenta su existencia previa únicamente como
evidencia de auditoría, **sin que esto cambie la clasificación**: el
Product Owner no reconoce el proyecto, por lo que permanece DESCONOCIDO
/ NO AUTORIZADO sin importar qué metadata local muestre.

**Decisión sobre `supabase unlink`:** se inspeccionó `supabase unlink
--help`; la documentación de ayuda del CLI **no permite demostrar** de
forma inequívoca que el comando es puramente local (no hay garantía
explícita de que no intente contactar la API de Supabase, p. ej. para
validar sesión/autenticación antes de desvincular). Conforme a la regla
explícita *"si no puedes demostrarlo: NO lo ejecutes"*, **no se ejecutó
`supabase unlink`.**

**Neutralización aplicada (100% local, verificable):** se eliminaron
mediante `rm` directo sobre el sistema de archivos —sin invocar el CLI
de Supabase ni ningún comando con capacidad de red— los archivos:
`supabase/.temp/project-ref`, `supabase/.temp/linked-project.json`, y
`supabase/.temp/pooler-url` (este último contenía una cadena de
conexión con el mismo ref embebido, sin contraseña). Barrido final
(`grep -rl "xgasncrztfwotjlghlfg" supabase/`) → **cero coincidencias
restantes** en todo `supabase/`. Estos tres archivos ya estaban
cubiertos por `supabase/.gitignore` (`.temp`) — su eliminación **no
introdujo ningún archivo versionable nuevo** (`git status --short`
idéntico antes y después, confirmado).

### Creación de Supabase Production

**NO EJECUTADA.** Precondición de la sección 12 del encargo (*"Solo
llegas aquí si: Docker Passed; db reset Passed; 15 migraciones
Passed..."*) **no se cumplió** — `db reset` no pudo ejecutarse por el
blocker de Docker. No se seleccionó organización, no se eligió región,
no se eligió plan, no se generó DB password, no se creó ningún proyecto.

### Auth, datos, Hostinger

Sin cambios — nada de esto se toca en 7.4A independientemente del
resultado del preflight. Decisión ya registrada (email confirmation
DISABLED para V1) se mantiene sin ejecutar configuración real, porque
no existe todavía ningún proyecto Production sobre el cual configurarla.

### Checkpoint de seguridad

```
OLD UNKNOWN REF:        xgasncrztfwotjlghlfg
STATUS:                 UNAUTHORIZED / NEVER USED (remoto) —
                         referencia LOCAL neutralizada por eliminación
                         directa de archivo (sin CLI, sin red)

NEW PRODUCTION REF:      (ninguno — proyecto no creado en esta sesión)
STATUS:                  N/A

CLI LINK STATUS:         NOT LINKED (ningún project-ref local presente)

REMOTE MIGRATIONS APPLIED: 0

APPLICATION DATA:        0

DB PUSH:                 NOT EXECUTED
```

### Siguiente checkpoint (histórico — superado por la continuación de abajo)

**PAUSED — WAITING FOR PRODUCT OWNER ACTION.** Se requería que el
Product Owner iniciara Docker Desktop. Ver sección "7.4A (continuación)"
para el resultado tras esa acción.

No se declaró NO-GO — no había ningún hallazgo que invalidara el Release
Candidate ni la estrategia de 7.3. Fue exclusivamente una limitación de
entorno (Docker) que requería una acción del Product Owner para
desbloquearse.

---

## 7.4A (continuación) — Docker disponible, preflight completo

**Fecha:** 2026-08-10 (misma sesión, continuación tras el checkpoint
PAUSED). El Product Owner inició Docker Desktop. Se retomó exactamente
desde el checkpoint, sin repetir la auditoría completa de 7.4A.

### Docker

```
docker version
Client: Version 29.6.2 ...
Server: Docker Desktop 4.85.0 (235549)
 Engine: Version 29.6.2 ...
```

**Docker Server responde correctamente.** Blocker resuelto.

### Supabase Local

`npx supabase status` → API/DB/Studio operativos
(`API_URL=http://127.0.0.1:54321`, `DB_URL` local, `STUDIO_URL`
disponible). Tres servicios opcionales reportados como detenidos
(`imgproxy`, `edge_runtime`, `pooler`) — **esperado y sin impacto**:
este proyecto no usa transformaciones de imágenes de Storage, no tiene
Edge Functions, y no requiere el connection pooler para desarrollo
local (confirmado en auditorías previas: cero Edge Functions en el
repo). No fue necesario ejecutar `supabase start` — el stack ya estaba
operativo. **Ninguna clave completa se reproduce en este documento**
(el comando de status expone claves demo de Supabase Local por diseño
del propio CLI — no son secretos únicos de este proyecto, pero se
omiten aquí de todas formas por disciplina).

### DB reset — OBLIGATORIO, ejecutado

```
npx supabase db reset --local --no-seed
Resetting local database...
Recreating database...
Initialising schema...
Applying migration 20260728183417_init_schema.sql...
... (15 migraciones, en orden) ...
Applying migration 20260806162035_goal_progress_concurrency.sql...
Finished supabase db reset on branch main.
{"target":"local","version":"","message":"Reset local database."}
```

**PASSED.** 15/15 migraciones aplicadas en orden cronológico correcto,
**cero errores SQL**, última migración aplicada:
`20260806162035_goal_progress_concurrency.sql`.

### Sanity check estructural (por lectura directa vía `psql`, solo local)

- **Tablas (7/7):** `profiles`, `categories`, `habits`,
  `habit_categories`, `habit_schedules`, `habit_logs`, `goals` —
  confirmadas presentes en `information_schema.tables`.
- **RLS:** `relrowsecurity = t` en las 7 tablas (`pg_class`) — RLS
  habilitada en todas.
- **RPC de schedules:** `create_habit_schedule`, `change_habit_schedule`
  presentes.
- **Funciones de Goal Progress:** 13 funciones presentes
  (`compute_goal_habit_logs_progress`, `sync_goal_progress_after_insert`,
  `sync_goal_progress_from_goal_change`,
  `sync_goal_progress_from_habit_log`, `recalculate_goal_current_value`,
  `lock_habit_for_goal_progress`, `protect_goal_current_value`,
  `protect_goal_progress_source`, `protect_goals_user_id`,
  `protect_habit_log_goal_snapshot`, `set_habit_log_goal_snapshot`,
  `validate_goal_habit_logs_goal_type`,
  `validate_goal_habit_ownership`).
- **Triggers:** 20 triggers no internos activos sobre tablas `public` —
  coincide con el conteo ya documentado por QA (`MDs/13`: "0/20
  trigger-only accesibles por `authenticated`").

No se repitió la batería completa de seguridad de Paso 6 — es
exclusivamente el sanity check estructural pedido.

### Validación técnica (repetida tras el reset)

- `npx tsc --noEmit`: **Passed.**
- `npm run lint`: **Passed.**
- `npm run build`: **Passed** (mismo warning de chunk-size, no
  bloqueante). `dist/` generado y eliminado tras la verificación.
- `npm audit`: **0 vulnerabilidades.**

### Referencia desconocida — reconfirmación post-reset

`supabase/.temp/project-ref` → **inexistente** (`cat` devuelve "No such
file or directory"). Barrido (`grep -rl "xgasncrztfwotjlghlfg"
supabase/`) → **cero coincidencias.** El `db reset` (operación
puramente local sobre Docker) **no recreó** ningún archivo de vínculo
remoto — confirma que la neutralización de la sección anterior sigue
vigente y que `db reset` no requiere ni genera ningún link remoto.

### Checkpoint pre-production (actualizado)

```
LOCAL PREFLIGHT:        PASSED
DOCKER:                 PASSED
SUPABASE LOCAL:         PASSED
DB RESET:               PASSED
MIGRATIONS:             15/15 PASSED
TSC:                    PASSED
LINT:                   PASSED
BUILD:                  PASSED
NPM AUDIT:              0
OLD UNKNOWN REF:        NEUTRALIZED LOCALLY / NEVER USED REMOTELY
READY TO CREATE PRODUCTION: YES
```

### Creación de Supabase Production — requiere intervención humana

El preflight local pasó íntegramente. Sin embargo, crear el proyecto
Production requiere pasos interactivos (login, selección de
organización, región, plan, DB password, aceptación de billing) que no
pueden ejecutarse de forma automática ni ambigua. **No existe ninguna
herramienta disponible en este entorno para crear un proyecto Supabase
nuevo mediante API/CLI no interactivo** — los tools de Supabase
disponibles operan sobre un proyecto ya existente/vinculado (branching,
migraciones, logs), no creación de proyectos raíz nuevos.

**LOCAL PREFLIGHT = PASSED. PRODUCTION CREATION = WAITING FOR PRODUCT
OWNER.**

**Instrucciones exactas para el Product Owner** (Dashboard oficial de
Supabase, `https://supabase.com/dashboard`):

1. Iniciar sesión con tu cuenta de Supabase.
2. Click en "New Project".
3. **Organización:** seleccionar la organización correcta (si hay más
   de una, confirmar cuál — no se debe adivinar).
4. **Nombre del proyecto:** `Habit Tracker Production` (proyecto
   **nuevo**, no reutilizar ninguno existente, especialmente no
   `xgasncrztfwotjlghlfg`).
5. **Región:** elegir la opción geográficamente más cercana a México
   disponible en ese momento entre las regiones vigentes de Supabase.
6. **Plan:** el nivel gratuito si cubre técnicamente esta V1 (proyecto
   personal, bajo volumen); no cambiar a un plan de pago sin
   confirmarlo explícitamente antes.
7. **DB password:** generar una contraseña fuerte y única, y guardarla
   inmediatamente en un gestor de contraseñas. **No la pegues en el
   chat ni en ningún documento del repositorio.**
8. Crear el proyecto y esperar a que aprovisione.

**Devuélveme únicamente:**
1. Project Ref nuevo (identificador técnico, no es secreto).
2. Región elegida.
3. Plan elegido.
4. Confirmación: `DB password configurada = YES`.
5. Confirmación: `Project URL disponible = YES`.
6. Confirmación: `Publishable Key disponible = YES`.

**No me envíes** la DB password, `service_role`, secret key, JWT secret,
ni ningún access/refresh token — ni aunque el Dashboard te los muestre.

### Confirmación expresa — no ejecutado en esta continuación

No se usó el proyecto desconocido. No se ejecutó SQL remoto. No se
ejecutó `db push`. No se aplicaron migraciones remotas. No se ejecutó
`supabase link` hacia ningún proyecto (ni el desconocido, ni uno nuevo —
CLI local sigue `NOT LINKED`). No se copiaron datos QA. No se modificó
Auth remoto. No se configuró SMTP. No se tocó Hostinger. No se desplegó
frontend. No se configuró dominio ni DNS. No se modificó código
funcional. No se modificaron ni crearon migraciones. No se instalaron
dependencias. No se hizo `git add`, `commit` ni `push`. No se creó
ningún proyecto Supabase Production (requiere acción del Product Owner
en el Dashboard). No se inició 7.4B.

---

## 7.4B — Existing Supabase Read-Only Schema Audit

**Fecha:** 2026-08-10. **Rol:** Principal Supabase Engineer / Senior
PostgreSQL Engineer / Database Release Engineer / Security Reviewer /
Production Migration Auditor. **Alcance:** auditoría estrictamente
READ-ONLY del proyecto remoto `habit-tracker`. **Cero escrituras
ejecutadas contra el remoto.**

### Identidad remota confirmada

El Product Owner reclasificó el project ref histórico:

| Campo | Valor |
|---|---|
| Name | `habit-tracker` |
| Project Ref | `xgasncrztfwotjlghlfg` |
| Region | `us-east-1` |
| Plan | Free |
| Status | Resumed / Active |
| Clasificación anterior | UNKNOWN / UNAUTHORIZED |
| **Clasificación nueva** | **CONFIRMED USER PROJECT — PRODUCTION CANDIDATE** |

Verificación técnica antes de cualquier lectura: `mcp__supabase__get_project_url`
→ `https://xgasncrztfwotjlghlfg.supabase.co` — **coincide exactamente**
con el ref confirmado por el Product Owner. Ninguna otra herramienta se
usó hasta confirmar esta identidad.

### Método de auditoría utilizado

Se usaron las herramientas MCP de Supabase de solo lectura ya
disponibles en este entorno (`list_tables`, `list_migrations`,
`list_extensions`, `list_edge_functions`, `get_advisors`, y
`execute_sql` **exclusivamente con sentencias `SELECT`** contra
`information_schema`/`pg_catalog`/tablas de aplicación). Se evitó
`supabase link` (preferencia explícita del encargo: "NO LINK") y no fue
necesario pedir al Product Owner que ejecutara SQL manualmente, porque
las herramientas de solo lectura disponibles fueron suficientes para
responder todas las preguntas de la auditoría. No se usó `service_role`
en ningún momento ni se solicitó la DB password.

**Confirmación read-only:** cada `execute_sql` ejecutado en esta tarea
fue una sentencia `SELECT` pura (verificado antes de cada ejecución);
ninguna sentencia `INSERT`/`UPDATE`/`DELETE`/`CREATE`/`ALTER`/`DROP`/
`GRANT`/`REVOKE` fue enviada al proyecto remoto.

### Baseline local (sin modificar nada)

15 migraciones, última `20260806162035_goal_progress_concurrency.sql`
(reconfirmado, sin cambios desde 7.4A). Inventario de objetos esperados
construido leyendo directamente `supabase/migrations/*.sql`
(especialmente `init_schema.sql`, `harden_functions.sql`,
`entity_lifecycle.sql`, `habit_schedules.sql`, `rls_hardening.sql`,
`table_privileges.sql`) para comparar contra lo observado en remoto,
sin asumir nombres.

### Tablas — remoto vs. local

| Tabla | Local esperado | Remoto | Estado |
|---|---|---|---|
| `profiles` | Sí | Sí | MATCH |
| `categories` | Sí | Sí | MATCH |
| `habits` | Sí | Sí | MATCH |
| `habit_categories` | Sí | Sí | MATCH |
| `habit_logs` | Sí | Sí | MATCH |
| `goals` | Sí | Sí | MATCH |
| `habit_schedules` | Sí | **No** | **MISSING REMOTE** |

**Cero tablas extra.** 6/7 presentes, `habit_schedules` ausente —
consistente con el hallazgo inicial del Dashboard.

### Columnas — comparación

Columnas de las 6 tablas presentes (vía `list_tables` verbose)
comparadas contra `init_schema.sql`: **coinciden exactamente**,
incluidos tipos, defaults, nullability y los 6 enums usados
(`habit_lifecycle_status`, `goal_type`, `frequency_type`,
`habit_status`, `goal_status`, `time_format`). `habits` remoto ya
incluye `lifecycle_status`, `goal_type`, `allow_partial`, etc. —
**no es evidencia de una migración posterior aplicada**, esas columnas
ya estaban en `init_schema.sql` (migración 1) desde el inicio; se
verificó línea por línea contra el archivo local para no asumirlo.

### Enums / types

Los 6 enums de `init_schema.sql` están presentes y con los mismos
valores exactos en remoto (confirmado por el campo `enums` devuelto
para cada columna `USER-DEFINED`). **MATCH completo.** Ningún enum
adicional introducido por migraciones posteriores (p. ej. no hay
evidencia de cambios de enum de migraciones 3-15).

### Constraints

| Constraint | Local esperado (migración 1) | Remoto | Estado |
|---|---|---|---|
| PK en las 6 tablas presentes | Sí | Sí | MATCH |
| FK `profiles.id → auth.users.id` | Sí | Sí | MATCH |
| FK `categories.user_id`, `habits.user_id`, `goals.user_id → auth.users.id` | Sí | Sí | MATCH |
| FK `habit_categories`, `habit_logs`, `goals.habit_id → habits.id` | Sí | Sí | MATCH |
| `habit_logs_habit_id_date_key` UNIQUE (habit_id, date) | Sí | Sí | MATCH |
| `profiles_week_starts_on_check` CHECK | Sí | Sí | MATCH |
| Constraints de `habit_schedules` (una versión vigente, no overlap) | Sí (migración 5+) | N/A — tabla no existe | **MISSING REMOTE** |

### Indexes

`categories_user_id_idx`, `goals_habit_id_idx`, `goals_user_id_idx`,
`habit_logs_date_idx`, `habit_logs_habit_id_idx`,
`habit_logs_habit_id_date_key`, `habits_user_id_idx` + PKs — **todos
presentes, MATCH** con lo que `init_schema.sql` crea. **Ausentes** (como
se esperaba, por no haberse aplicado las migraciones correspondientes):
`habit_schedules_one_current_per_habit_idx` (migración 5) y los índices
de `performance_indexes.sql` (migración 10) — **MISSING REMOTE**, no
bloqueante por sí solos.

### RLS

`relrowsecurity = true` en las 6 tablas presentes (confirmado vía
`list_tables`, campo `rls_enabled`). **RLS habilitada, sin riesgo
crítico de exposición por RLS desactivada.**

### Policies

| Tabla | Policy remota | cmd | Local esperado tras `rls_hardening.sql` (migración 9) |
|---|---|---|---|
| `profiles` | "Profiles are viewable by owner" (SELECT), "Profiles are updatable by owner" (UPDATE) | SELECT/UPDATE | Mismo patrón — **MATCH** (ya granular en `init_schema.sql`) |
| `categories` | "Categories are manageable by owner" | **ALL** | `rls_hardening.sql` la reemplaza por políticas separadas SELECT/INSERT/UPDATE — **DIFFERENT** (remoto tiene la versión amplia original de migración 1, no la endurecida) |
| `habits` | "Habits are manageable by owner" | **ALL** | Igual patrón — **DIFFERENT** (versión pre-hardening) |
| `habit_categories` | "Habit categories manageable by owner" | **ALL** | **DIFFERENT** (versión pre-hardening) |
| `habit_logs` | "Habit logs manageable by owner" | **ALL** | **DIFFERENT** (versión pre-hardening) |
| `goals` | "Goals are manageable by owner" | **ALL** | **DIFFERENT** (versión pre-hardening) |
| `habit_schedules` | N/A | — | **MISSING REMOTE** (tabla no existe) |

Ninguna política fue modificada durante esta auditoría — solo lectura
vía `pg_policies`.

### Grants

**Hallazgo crítico:** `anon` y `authenticated` **no tienen ningún
GRANT de `SELECT`/`INSERT`/`UPDATE`/`DELETE`** sobre ninguna de las 6
tablas — únicamente los privilegios por defecto de PostgreSQL
(`REFERENCES`/`TRIGGER`/`TRUNCATE`, irrelevantes para PostgREST).
Confirmado vía `information_schema.role_table_grants`. Esto es
exactamente el estado que `table_privileges.sql` (migración 12) fue
escrita para corregir — **el remoto nunca recibió esa migración.**
Clasificación: **MISSING** (no "TOO RESTRICTIVE" en el sentido de un
bug — es la ausencia total de la migración que otorga los grants
correctos).

**Consecuencia práctica:** en su estado actual, ningún usuario
`authenticated` podría leer ni escribir ninguna fila de ninguna tabla
contra este proyecto remoto, aunque RLS lo permitiera — Postgres
deniega antes de evaluar RLS por falta de privilegio de tabla. El
proyecto **no es funcionalmente utilizable como está** para la
aplicación real.

### Functions / RPC

| Función | Remoto | Local esperado (15 migraciones) | Estado |
|---|---|---|---|
| `set_updated_at()` | Sí, `search_path=""` | Sí (harden_functions) | MATCH |
| `handle_new_user()` | Sí, `SECURITY DEFINER`, `search_path=public` | Sí (harden_functions) | MATCH |
| `rls_auto_enable()` | Sí (`SECURITY DEFINER`) | No es nuestra — función de plataforma Supabase, ya documentada en `harden_functions.sql` como "puede existir en algunos entornos" | **EXTRA REMOTE** (no problemático — es de la plataforma, no del proyecto) |
| `create_habit_schedule`, `change_habit_schedule` | **No existen** | Sí (migraciones 5, 13) | **MISSING REMOTE** |
| `recalculate_goal_current_value`, `compute_goal_habit_logs_progress`, `sync_goal_progress_*`, `lock_habit_for_goal_progress`, `protect_goal_*`, `validate_goal_*`, `set_habit_log_goal_snapshot` (13 funciones) | **No existen** | Sí (migraciones 6, 7, 14, 15) | **MISSING REMOTE** |
| `enforce_habit_log_edit_window_trg` y función asociada | **No existe** | Sí (migración 8) | **MISSING REMOTE** |

Solo 3 funciones existen en remoto: `set_updated_at`, `handle_new_user`,
`rls_auto_enable` — exactamente lo que `init_schema.sql` +
`harden_functions.sql` producen. **Cero RPC de negocio disponibles.**

### Triggers

| Trigger | Remoto | Estado |
|---|---|---|
| `on_auth_user_created` (AFTER INSERT, `auth.users`, dispara `handle_new_user`) | **Sí** | MATCH — la creación automática de perfil en signup **sí funcionaría** |
| `set_profiles_updated_at`, `set_habits_updated_at`, `set_habit_logs_updated_at`, `set_goals_updated_at` (BEFORE UPDATE) | Sí, 4 triggers | MATCH con lo que `init_schema.sql` crea |
| Triggers de `habit_schedules`, snapshots de `habit_log`, ventana de edición, Goal Progress, concurrencia (16 triggers adicionales validados en local 7.4A) | **No existen** | **MISSING REMOTE** |

**4 de 20 triggers locales presentes** (más `on_auth_user_created`,
que no se cuenta en el total de 20 porque vive en `auth.users`, no en
`public`). Consistente con solo migraciones 1-2 aplicadas.

### Migration history remota

`mcp__supabase__list_migrations` (mecanismo oficial de Supabase,
equivalente a la tabla `supabase_migrations.schema_migrations`) →
**exactamente 2 registros:**

```
20260728183417  init_schema
20260728183502  harden_functions
```

Coincide exactamente con las 2 primeras de las 15 migraciones locales,
en el mismo orden. El historial remoto es **confiable y consistente**
con toda la evidencia de esquema/funciones/triggers/grants recopilada —
no hay señales de migraciones aplicadas "fuera de banda" (sin registro)
ni de un historial corrupto.

### Row counts

| Tabla | Filas |
|---|---|
| `profiles` | 0 |
| `categories` | 0 |
| `habits` | 0 |
| `habit_categories` | 0 |
| `habit_logs` | 0 |
| `goals` | 0 |
| `auth.users` | **0** |

**Verificado con `COUNT(*)` real** (no solo el estimado de `list_tables`,
que también mostró 0 para las 6 tablas de forma consistente). **Cero
filas en absolutamente todo el proyecto**, incluidos usuarios de Auth.

### Naturaleza de los datos

No aplica la clasificación "requiere criterio del Product Owner" — el
conteo es **inequívocamente cero** en las 7 tablas de aplicación y en
`auth.users`. No es una cuestión de PII ambigua: **no hay ninguna fila
que clasificar.** El proyecto está vacío salvo su estructura de sistema.

### Auth summary

- **Usuarios:** 0 (confirmado por `COUNT(*)` sobre `auth.users`, sin
  leer ningún campo de usuario individual).
- **Trigger de creación de perfil:** presente y correcto
  (`on_auth_user_created` → `handle_new_user()`).
- **Site URL / Redirect URLs / providers / confirmación de email:** no
  se pudo inspeccionar mediante las herramientas de solo lectura
  disponibles en este entorno (no hay una herramienta MCP para leer
  configuración de Auth; requeriría Management API con credenciales que
  esta tarea no debe usar). **Limitación declarada, no se adivinó nada.**
  Dado que hay 0 usuarios, esto no es bloqueante para la decisión de
  reutilización — se revisará en 7.8 (Auth/Domain/HTTPS) cuando haya
  dominio final.

### Storage summary

`storage.buckets` → **0 buckets.** Sin Storage configurado. Coincide
con que el proyecto no usa Storage (confirmado también en auditorías
previas del código fuente — sin referencias a `supabase.storage` en
`src/`).

### Edge Functions / cron / Realtime

- **Edge Functions:** 0 (`list_edge_functions` → `[]`).
- **`pg_cron`:** extensión no instalada (`installed_version: null`).
- **Realtime:** 0 tablas publicadas en `supabase_realtime`
  (`pg_publication_tables` vacío).

Ningún componente adicional relevante. Consistente con el diseño del
proyecto (sin Edge Functions, sin jobs programados, sin Realtime en el
código fuente).

### Extensions

`uuid-ossp` (1.1), `pgcrypto` (1.3), `pg_stat_statements` (1.11),
`supabase_vault` (0.3.1) — todas instaladas y son **provisioning
estándar de la plataforma Supabase**, no gestionadas por nuestras
migraciones (ninguna migración local contiene `CREATE EXTENSION`). Sin
diferencias relevantes que reporten.

### Matriz de diferencias — resumen agrupado

| Grupo | MATCH | MISSING REMOTE | EXTRA REMOTE | DIFFERENT |
|---|---|---|---|---|
| Tables | 6/7 | `habit_schedules` | — | — |
| Columns | Todas las de las 6 tablas presentes | — | — | — |
| Types/Enums | 6/6 | — | — | — |
| Constraints | PK/FK/UNIQUE/CHECK de migración 1 | Constraints de `habit_schedules` | — | — |
| Indexes | Índices de migración 1 | Índices de migraciones 5 y 10 | — | — |
| RLS | Habilitada en 6/6 presentes | — | — | — |
| Policies | `profiles` (ya granular desde m1) | `habit_schedules` | — | 5 tablas con policy `ALL` pre-hardening en vez de las granulares de m9 |
| Grants | — | `table_privileges.sql` (m12) completo | — | — |
| Functions | 2/2 de m1-2 | ~15 funciones de negocio (m5-15) | `rls_auto_enable` (plataforma, no problema) | — |
| Triggers | 4 `updated_at` + `on_auth_user_created` | 16 triggers de negocio (m5-15) | — | — |
| Migration History | 2/15 registrados, consistente y confiable | 13 migraciones no aplicadas | — | — |
| Data | Vacío en todas las tablas | N/A | — | — |
| Auth | 0 usuarios, trigger OK | Config de Site URL/Redirect no verificable con las herramientas disponibles | — | — |
| Storage | 0 buckets (esperado) | — | — | — |

### Clasificación del remoto

**B — PARTIAL OLD SCHEMA.**

Evidencia: el historial oficial de migraciones remoto registra
exactamente las migraciones 1 y 2 de las 15 locales; cada objeto
observado (tablas, columnas, enums, constraints, índices, funciones,
triggers, policies, ausencia de grants) es coherente al 100% con ese
estado — sin ningún objeto extra no explicado, sin ninguna
modificación divergente de lo que esas dos migraciones producirían.
**No hay evidencia de esquema divergente (D)** ni de que el remoto ya
esté al día (C) — es, de forma verificable y consistente en cada capa
auditada, una versión **antigua pero no corrupta ni modificada
manualmente** del esquema.

### Riesgo de reutilización

- **Riesgo de pérdida de datos: NULO.** Cero filas en cualquier tabla,
  cero usuarios de Auth.
- **Riesgo de esquema divergente/sorpresas: BAJO.** El desfase es
  puramente "por detrás" (13 migraciones no aplicadas), no hay
  evidencia de cambios manuales ajenos a las migraciones.
- **Riesgo de aplicar las 13 migraciones restantes: BAJO-MEDIO** — son
  las mismas migraciones ya extensamente validadas por QA aplicándose
  en el mismo orden sobre exactamente el mismo estado base
  (post-migración 2) que un `db reset` local reproduce siempre desde
  cero; la diferencia es que aquí el estado base ya existe en vez de
  crearse en el mismo comando. Aun así, es la primera vez que se
  aplicarían contra Postgres gestionado por Supabase Cloud en vez de
  Supabase Local — candidato a validación cuidadosa en 7.5, no a
  ejecución ciega.
- **Riesgo de reutilizar el proyecto en sí:** bajo, dado que está vacío
  y la única acción pendiente es aplicar migraciones ya probadas.

### Recomendación

**SAFE TO REUSE AFTER CONTROLLED MIGRATION.**

Justificación: el remoto no tiene datos que proteger (0 filas en todo
el proyecto), el desfase de esquema es puramente de migraciones no
aplicadas (no divergente), y las 13 migraciones faltantes ya están
extensamente validadas localmente (QA completo + 7.4A). No hay
justificación para descartar este proyecto y crear uno nuevo — hacerlo
sería trabajo redundante sin beneficio de seguridad adicional, dado que
el estado actual es efectivamente equivalente a un proyecto recién
creado en cuanto a datos (vacío) pero ya tiene el ref/URL/plan/región ya
configurados y confirmados por el Product Owner.

### Estrategia conceptual recomendada (no ejecutada)

**ROUTE 1 — Reuse in place**, aplicando las 13 migraciones restantes
(3 a 15) en 7.5 siguiendo el procedimiento ya documentado en
`MDs/14`, sección 7.3.11 (backup formal aunque no haya datos
sustantivos que perder, confirmación de destino, inspección antes de
aplicar, verificación de RLS/grants/RPC/triggers tras cada tramo,
smoke con usuario real). La salvaguarda de CLI de la sección 7.3.12
sigue aplicando íntegramente antes de cualquier `supabase link`.

### Qué NO debe hacerse todavía

- No aplicar ninguna migración remota (eso es 7.5, con autorización
  separada).
- No ejecutar `supabase link` (ni siquiera ahora que el proyecto está
  confirmado — sigue siendo un checkpoint humano separado, conforme a
  7.3.12).
- No modificar las 5 policies `ALL` pre-hardening ni ningún grant.
- No crear usuarios de prueba en este proyecto.
- No asumir que Auth (Site URL/Redirect) ya está listo — falta
  verificarlo cuando haya dominio (7.8).

### Siguiente checkpoint

Con esta auditoría, el proyecto `habit-tracker`
(`xgasncrztfwotjlghlfg`) queda confirmado como el destino recomendado
para Supabase Production, sujeto a que 7.5 (Database Migration) aplique
controladamente las 13 migraciones restantes con el mismo rigor que
7.4A aplicó al preflight local. **7.4B no autoriza `supabase link` ni
`db push`** — eso corresponde a un bloque separado (7.4C/7.5) con
autorización explícita adicional del Product Owner, conforme a la
segunda confirmación exigida por la salvaguarda de CLI.

### Confirmación expresa — no ejecutado en 7.4B

No se ejecutó `db push`. No se aplicó ninguna migración remota. No se
ejecutó ninguna sentencia SQL de escritura (`INSERT`/`UPDATE`/`DELETE`/
`CREATE`/`ALTER`/`DROP`/`GRANT`/`REVOKE`) — todas las consultas fueron
`SELECT` puras verificadas antes de ejecutarse. No se modificó el
esquema remoto. No se modificó RLS ni ninguna policy. No se modificó
Auth remoto. No se crearon ni borraron usuarios. No se modificó
Storage. No se usó `service_role` para ninguna prueba (las herramientas
MCP de solo lectura no lo requirieron). No se copiaron datos locales al
remoto (no había ninguno que copiar, y no se habría hecho de todas
formas). No se modificaron ni crearon migraciones. No se modificó
código funcional. No se tocó Hostinger. No se desplegó frontend. No se
hizo `git add`, `commit` ni `push`.

---

## 7.5A — Database Migration Pre-Push

**Fecha:** 2026-08-10. **Rol:** Principal Database Engineer / Senior
Supabase-PostgreSQL Engineer / Release Engineer / Production Migration
QA Engineer. **Alcance:** preparar y validar exhaustivamente la
migración, intentar el link controlado del CLI, auditar las migraciones
pendientes. **Este bloque NO autoriza `db push` — cero escrituras
ejecutadas contra el remoto.**

### Identidad — hard stop verificado

`mcp__supabase__get_project_url` → `https://xgasncrztfwotjlghlfg.supabase.co`.

```
EXPECTED PROJECT REF: xgasncrztfwotjlghlfg
FOUND PROJECT REF:    xgasncrztfwotjlghlfg
STATUS:               MATCH — no bloqueado
```

### Preflight local

- `git branch --show-current` → `main`.
- `git status -sb` → `## main...origin/main`, sin ahead/behind.
- `git rev-parse HEAD` → `e452fefe49fb1dc125ef710c3456e7ef39827e24`
  (`e452fef`) — **coincide exactamente** con el SHA aprobado de 7.2B.
  Cambios no commiteados presentes: únicamente documentación de
  Deployment de 7.4A/7.4B (`Contexto/03_DEPLOYMENT/*`,
  `MDs/14_DEPLOYMENT_PLAN.md`), sin tocar — conforme a la instrucción
  de no revertir cambios documentales posteriores al SHA.
- `docker version` → Server responde (Docker Desktop 4.85.0).
- `npx supabase status` → API/DB/Studio operativos.
- `npx supabase db reset --local --no-seed` → **PASSED**, 15/15
  migraciones aplicadas en orden, cero errores SQL.

### Sanity check local (post-reset)

7/7 tablas presentes (`profiles`, `categories`, `habits`,
`habit_categories`, `habit_schedules`, `habit_logs`, `goals`), RLS
habilitada en las 7, RPC `create_habit_schedule`/`change_habit_schedule`
presentes, 13 funciones de Goal Progress presentes, 20 triggers activos,
grants de `authenticated` coinciden exactamente con
`table_privileges.sql`. **Esquema local coincide 100% con el baseline
aprobado** — sin hard stop.

### Validación técnica

`npx tsc --noEmit`: **Passed.** `npm run lint`: **Passed.**
`npm run build`: **Passed** (mismo warning de chunk-size, no
bloqueante). `npm audit`: **0 vulnerabilidades.**

### Inventario de migraciones locales (15)

| # | Timestamp | Nombre | Propósito resumido | Remoto |
|---|---|---|---|---|
| 1 | 20260728183417 | init_schema | Esquema base: 7 enums, 7 tablas, PK/FK/constraints/índices iniciales, policies `ALL` amplias, triggers `updated_at` | **APLICADA** |
| 2 | 20260728183502 | harden_functions | `search_path` explícito en funciones, revoke de EXECUTE público sobre funciones de trigger | **APLICADA** |
| 3 | 20260729015222 | database_integrity | Constraints/validaciones adicionales de integridad | PENDIENTE |
| 4 | 20260730235019 | entity_lifecycle | Lifecycle de entidades (soft-delete, estados) | PENDIENTE |
| 5 | 20260731001044 | habit_schedules | Crea tabla `habit_schedules`, backfill desde columnas de `habits`, retira constraints/columnas legadas de `habits` (`frequency_type`, `days_of_week`, `frequency_target`, `interval_days`) | PENDIENTE |
| 6 | 20260731002637 | habit_log_goal_snapshots | Snapshots históricos en `habit_logs` para Goal Progress | PENDIENTE |
| 7 | 20260731004632 | goal_progress_source | Funciones de cálculo/sincronización de `goals.current_value` | PENDIENTE |
| 8 | 20260731014259 | habit_log_edit_window | Trigger de ventana de edición de 7 días en `habit_logs` | PENDIENTE |
| 9 | 20260731015901 | rls_hardening | Reemplaza policies `ALL` amplias por policies granulares por comando | PENDIENTE |
| 10 | 20260731021200 | performance_indexes | Índices de rendimiento adicionales | PENDIENTE |
| 11 | 20260731022414 | final_cleanup | Retira 1 índice redundante + 2 ajustes menores de coherencia | PENDIENTE |
| 12 | 20260804073500 | table_privileges | `GRANT SELECT/INSERT/UPDATE/DELETE` a `authenticated` por tabla (sin esto, la app es inutilizable) | PENDIENTE |
| 13 | 20260804221046 | create_habit_schedule | RPC `create_habit_schedule` (simétrica a `change_habit_schedule`) | PENDIENTE |
| 14 | 20260805171711 | goal_integrity_fixes | Correcciones de integridad de Goal Progress | PENDIENTE |
| 15 | 20260806162035 | goal_progress_concurrency | Fix de concurrencia (BUG-002): lock por fila antes de recalcular | PENDIENTE |

**Última migración confirmada: `20260806162035_goal_progress_concurrency.sql`**
— sin cambios.

### Backup / recovery pre-migración — reconfirmado

Reconfirmado por lectura (`SELECT COUNT(*)`), sin modificar nada:

| Tabla | Filas |
|---|---|
| `profiles` | 0 |
| `categories` | 0 |
| `habits` | 0 |
| `habit_categories` | 0 |
| `habit_logs` | 0 |
| `goals` | 0 |
| `auth.users` | 0 |

Migration history remota reconfirmada: exactamente 2 registros
(`init_schema`, `harden_functions`), idéntico a 7.4B. Tablas remotas:
6, idéntico a 7.4B. **PRE-MIGRATION DATA STATE = EMPTY.** Nada cambió
desde 7.4B — no se activó ningún hard stop.

### Link controlado — BLOQUEADO, requiere intervención del Product Owner

Antes de intentar el link se mostró explícitamente:

```
PROJECT TO LINK:            habit-tracker
PROJECT REF:                xgasncrztfwotjlghlfg
REGION:                     us-east-1
EXPECTED REMOTE MIGRATIONS: 2
LOCAL MIGRATIONS:           15
```

Se ejecutó `npx supabase link --project-ref xgasncrztfwotjlghlfg`
(sin `--password`, para dejar que el CLI maneje la autenticación por su
flujo oficial). Resultado:

```
{"_tag":"Error","error":{"code":"LegacyPlatformAuthRequiredError",
"message":"Access token not provided. Supply an access token by
running `supabase login` or setting the SUPABASE_ACCESS_TOKEN
environment variable."}}
```

El CLI requiere primero una sesión autenticada de Supabase (personal
access token vía `supabase login` interactivo, o la variable de entorno
`SUPABASE_ACCESS_TOKEN`) — **antes** de poder siquiera solicitar la DB
password. Ninguna de las dos formas de autenticación está disponible en
este entorno (`SUPABASE_ACCESS_TOKEN` confirmado vacío). Este token es
tan sensible como una contraseña (otorga acceso de API a la cuenta
completa de Supabase del Product Owner) — **no se solicitó que se
pegara en el chat**, conforme a la regla explícita de esta tarea.

**CLI link: NO EJECUTADO.** Requiere que el Product Owner, directamente
en su propia máquina/sesión:
1. Ejecute `supabase login` (abre navegador para autenticación OAuth) —
   **o** establezca `SUPABASE_ACCESS_TOKEN` en el entorno donde corre
   esta tarea, sin compartir el valor por chat.
2. Confirme cuando esté listo para que la sesión continúe con el link
   real contra `xgasncrztfwotjlghlfg`.

### Verificación post-link

**No aplica** — el link no se completó, por lo que no hay nada que
verificar en esta sesión. `supabase/.temp/project-ref` permanece
ausente (confirmado, sin cambios respecto a 7.4A/7.4B).

### Auditoría de las 13 migraciones pendientes — operaciones destructivas

Barrido dirigido (`grep` de `DROP TABLE`/`DROP COLUMN`/`TRUNCATE`/
`DELETE FROM`/`UPDATE ... SET`/renames) sobre los 13 archivos
pendientes, con lectura de contexto completo donde apareció una
coincidencia:

- **Migración 5 (`habit_schedules.sql`):** contiene
  `ALTER TABLE public.habits DROP COLUMN IF EXISTS frequency_type`
  (y otras 3 columnas: `days_of_week`, `frequency_target`,
  `interval_days`). **Es la única operación potencialmente destructiva
  encontrada en las 13 migraciones pendientes.** Contexto verificado
  línea por línea: el `DROP COLUMN` está precedido por (a) un
  `INSERT INTO public.habit_schedules (...)` que hace backfill
  idempotente desde esas mismas columnas, y (b) una verificación
  explícita que **aborta la migración completa** si algún hábito
  quedara sin una versión de schedule vigente después del backfill,
  antes de llegar a los `DROP COLUMN`. Es un patrón de migración
  seguro (backfill + guardia + drop), no un drop ciego. **Impacto real
  en este caso: nulo** — `habits` remoto tiene 0 filas, por lo que el
  backfill no migra nada y el drop no descarta ningún dato.
- **Migración 7 (`goal_progress_source.sql`):** contiene un
  `UPDATE public.goals SET current_value = ...` — verificado: vive
  **dentro del cuerpo de una función PL/pgSQL** (lógica de aplicación
  que se ejecuta en tiempo de ejecución vía trigger/RPC), **no es una
  sentencia de migración de datos que se ejecute una sola vez al
  aplicar el archivo.** No es una operación destructiva de la
  migración en sí.
- **Migración 11 (`final_cleanup.sql`):** elimina 1 índice redundante
  (`habit_logs_habit_id_idx`) — confirmado no destructivo (el índice
  del `UNIQUE(habit_id, date)` ya cubre ese caso de uso), documentado
  extensamente en el propio archivo con la justificación de por qué es
  seguro.
- **Resto de migraciones (3, 4, 6, 8, 9, 10, 12, 13, 14, 15):** sin
  coincidencias de `DROP TABLE`/`TRUNCATE`/`DELETE FROM`/`UPDATE`
  a nivel de migración, ni renames destructivos.

**Conclusión: una (1) operación con forma destructiva encontrada
(`DROP COLUMN` en migración 5), pero verificada como segura por diseño
(backfill + guardia previa) y sin impacto real dado que el remoto está
vacío.** No constituye un hard stop — se documenta con el detalle
completo para que quede como evidencia auditada, no asumida.

### Simulación / dry-run

`npx supabase db push --help` confirma la existencia de un flag
oficial no destructivo: **`--dry-run`** ("Print the migrations that
would be applied, but don't actually apply them"). **No se improvisó
ningún mecanismo no oficial.** Sin embargo, `db push --dry-run`
requiere una conexión activa (vía `--linked` o `--db-url`), y el link
no pudo completarse en esta sesión (ver arriba) — por lo tanto el
dry-run oficial **no se ejecutó**, conforme a la instrucción explícita
de no inventar alternativas ni ejecutar un push real "para ver qué
pasa". El análisis de esta sección se basó exclusivamente en:
`list_migrations` (historial remoto), lectura directa de los 15
archivos de migración locales, y las consultas `SELECT` ya realizadas
contra el remoto en 7.4B y reconfirmadas en 7.5A.

### Plan exacto de migración (para 7.5B, no ejecutado)

```
REMOTE CURRENT: 2/15
PENDING:        13
```

Secuencia exacta a aplicar en 7.5B, en este orden (ya enumerada en la
tabla de inventario arriba): `database_integrity` →
`entity_lifecycle` → `habit_schedules` → `habit_log_goal_snapshots` →
`goal_progress_source` → `habit_log_edit_window` → `rls_hardening` →
`performance_indexes` → `final_cleanup` → `table_privileges` →
`create_habit_schedule` → `goal_integrity_fixes` →
`goal_progress_concurrency`.

**Checkpoints recomendados durante 7.5B:**
1. Tras `habit_schedules` (migración 5): verificar que `habit_schedules`
   existe y que `habits` ya no tiene las 4 columnas legadas.
2. Tras `rls_hardening` (migración 9): verificar que las policies
   `ALL` amplias fueron reemplazadas por las granulares.
3. Tras `table_privileges` (migración 12): verificar que
   `authenticated` obtiene los grants exactos documentados en 7.4B —
   **este es el punto donde el proyecto pasa de "no funcional" a
   "funcional para la app"**.
4. Al final (migración 15): reconfirmar 15/15 en `list_migrations`,
   sanity check estructural idéntico al de 7.4A/7.5A contra el remoto,
   y un smoke con un usuario real de prueba (signup → operación básica
   → logout) antes de considerar 7.5 cerrado.

### Riesgos

- Autenticación del CLI (`supabase login`/`SUPABASE_ACCESS_TOKEN`) es
  un bloqueante operativo para 7.5B, igual que Docker lo fue para
  7.4A — requiere una acción del Product Owner, no corregible desde
  aquí.
- El `DROP COLUMN` de la migración 5 es la única operación con forma
  destructiva del lote pendiente — riesgo real nulo hoy (remoto vacío),
  pero **si en algún momento futuro este proyecto llegara a tener datos
  reales antes de que estas 13 migraciones se apliquen**, ese
  `DROP COLUMN` dejaría de ser trivialmente seguro y requeriría
  verificación de backfill exitoso antes de continuar — motivo
  adicional para no demorar 7.5B indefinidamente una vez autorizado.
- Aplicar 13 migraciones de una vez contra Supabase Cloud (en vez de
  Local) es la primera vez que se hace en este proyecto — candidato a
  aplicarse con los checkpoints intermedios ya definidos, no de un solo
  comando sin verificación intermedia.

### Estrategia de recuperación

Sin datos que perder (confirmado EMPTY), el "rollback" más simple ante
un fallo a mitad de las 13 migraciones sería: identificar en qué
migración falló (`list_migrations` mostrará hasta dónde llegó),
corregir la causa en una migración **nueva** (nunca editar una ya
aplicada), y continuar — exactamente el mismo patrón ya usado durante
todo el desarrollo local. No se define un "recrear el proyecto desde
cero" como plan primario dado que ya tiene ref/URL/plan/región
confirmados y no hay nada que perder recreándolo tampoco, pero no es
necesario en este escenario de datos vacíos.

### Checkpoint pre-push obligatorio

```
DATABASE MIGRATION PRE-PUSH CHECKPOINT

Project:                          habit-tracker
Project Ref:                      xgasncrztfwotjlghlfg
Region:                           us-east-1

Local migrations:                 15
Remote migrations:                2
Pending migrations:               13

Remote application rows:          0
Remote auth users:                0

Local db reset:                   PASSED
TypeScript:                       PASSED
Lint:                             PASSED
Build:                            PASSED
npm audit:                        0 vulnerabilities

CLI linked to expected project:   NO (bloqueado — requiere supabase login /
                                   SUPABASE_ACCESS_TOKEN del Product Owner)
Destructive unexpected operations: NO (1 DROP COLUMN encontrado, pero
                                   esperado, documentado, guardado por
                                   backfill+chequeo, sin impacto real)
Migration order validated:        YES
Backup/recovery state documented: YES

SAFE TO EXECUTE DB PUSH:          NO — bloqueado por falta de link
                                   autenticado, no por ningún hallazgo
                                   del esquema/datos/migraciones
```

### Decisión

**BLOCKED — esperando intervención del Product Owner para completar el
link del CLI** (`supabase login` o `SUPABASE_ACCESS_TOKEN`). Todo lo
demás del preflight de 7.5A está **PASSED**: identidad confirmada,
esquema local íntegro, remoto reconfirmado vacío y sin cambios desde
7.4B, las 13 migraciones pendientes auditadas sin hallazgos que
bloqueen (la única operación con forma destructiva es segura por
diseño y sin impacto real), plan de migración exacto documentado. En
cuanto el Product Owner complete la autenticación del CLI, esta misma
sesión puede reanudar exactamente en el paso del link, sin repetir el
resto del preflight.

**7.5A PRE-PUSH COMPLETADO. NO SE HA EJECUTADO DB PUSH. ESPERANDO
AUTORIZACIÓN EXPLÍCITA DEL PRODUCT OWNER PARA 7.5B** (y, antes de eso,
su intervención para completar la autenticación del CLI).

### Confirmación expresa — no ejecutado en 7.5A

No se ejecutó `db push`. No se ejecutó SQL remoto de escritura. No se
modificó el esquema remoto. No se modificó RLS remoto. No se modificó
Auth. No se crearon usuarios. No se copiaron datos. No se modificaron
ni crearon migraciones. No se tocó Hostinger. No se desplegó frontend.
No se hizo `git add`, `commit` ni `push`.

---

## 7.5A (continuación) — CLI autenticado, link completado, dry-run ejecutado

**Fecha:** 2026-08-10 (misma sesión, continuación tras el bloqueo de
autenticación). El Product Owner ejecutó `npx supabase login`
directamente en su máquina/sesión. Se retomó exactamente desde el
checkpoint bloqueado, sin repetir el resto del preflight de 7.5A.

### 1. Verificación de autenticación

```
npx supabase projects list
Cannot find project ref. Have you run supabase link?
{"projects":[{"id":"xgasncrztfwotjlghlfg","ref":"xgasncrztfwotjlghlfg",
"organization_id":"jfvdhplzuvqkcoputygv",
"organization_slug":"jfvdhplzuvqkcoputygv","name":"habit-tracker",
"region":"us-east-1","status":"ACTIVE_HEALTHY", ...,"linked":false}],
"message":""}
```

**CLI autenticado — confirmado.** El mensaje "Cannot find project
ref..." es solo informativo (no hay link todavía en ese momento), no un
error de autenticación. La cuenta tiene **exactamente un proyecto**:
`habit-tracker` / `xgasncrztfwotjlghlfg` / `us-east-1` /
`ACTIVE_HEALTHY` — coincide con el único ref autorizado, sin ninguna
ambigüedad de selección.

### 2. Link — ejecutado únicamente contra el ref autorizado

```
npx supabase link --project-ref xgasncrztfwotjlghlfg
{"project_ref":"xgasncrztfwotjlghlfg","message":""}
```

### 3. Confirmación post-link (inspección local, sin llamada remota adicional)

```
cat supabase/.temp/project-ref
xgasncrztfwotjlghlfg

cat supabase/.temp/linked-project.json
{"ref":"xgasncrztfwotjlghlfg","name":"habit-tracker",
"organization_id":"jfvdhplzuvqkcoputygv",
"organization_slug":"jfvdhplzuvqkcoputygv"}
```

**Confirmado: el proyecto vinculado es exactamente `habit-tracker` /
`xgasncrztfwotjlghlfg`.** Sin discrepancia.

### 4. Revalidación de migration history remoto

`mcp__supabase__get_project_url` → `https://xgasncrztfwotjlghlfg.supabase.co`
(identidad reconfirmada). `mcp__supabase__list_migrations` →
exactamente los mismos 2 registros de siempre (`init_schema`,
`harden_functions`) — **sin cambios respecto a 7.4B y al preflight
inicial de 7.5A.**

```
Local:   15
Remote:  2
Pending: 13
```

Coincide exactamente con lo esperado — sin sorpresas.

### 5. Dry-run oficial

```
npx supabase db push --dry-run --linked
DRY RUN: migrations will *not* be pushed to the database.
Initialising login role...
Connecting to remote database...
Would push these migrations:
 • 20260729015222_database_integrity.sql
 • 20260730235019_entity_lifecycle.sql
 • 20260731001044_habit_schedules.sql
 • 20260731002637_habit_log_goal_snapshots.sql
 • 20260731004632_goal_progress_source.sql
 • 20260731014259_habit_log_edit_window.sql
 • 20260731015901_rls_hardening.sql
 • 20260731021200_performance_indexes.sql
 • 20260731022414_final_cleanup.sql
 • 20260804073500_table_privileges.sql
 • 20260804221046_create_habit_schedule.sql
 • 20260805171711_goal_integrity_fixes.sql
 • 20260806162035_goal_progress_concurrency.sql
{"upToDate":false,"dryRun":true, ..., "message":"Finished supabase db push."}
```

**Cero escrituras** — el propio CLI declara explícitamente "migrations
will *not* be pushed to the database" y el resultado JSON confirma
`"dryRun":true`. No se solicitó ni se vio ninguna contraseña/secreto en
la salida de este comando.

### 6. Comparación dry-run vs. auditoría previa

Las 13 migraciones que el dry-run "aplicaría" son **exactamente, en el
mismo orden**, las 13 migraciones pendientes ya auditadas en la
sección anterior de 7.5A (tabla de inventario + auditoría de
operaciones destructivas, incluido el `DROP COLUMN` guardado de la
migración 5). **Cero discrepancias entre lo planeado y lo que el CLI
confirma que aplicaría.**

### Verificación de que el dry-run no alteró nada

Reconfirmado tras el dry-run: `list_migrations` → sigue en 2/15;
`COUNT(*)` sobre las 7 tablas de aplicación + `auth.users` → sigue en
0 en todas. **Estado remoto idéntico antes y después del dry-run.**

### DATABASE MIGRATION PRE-PUSH CHECKPOINT (final)

```
DATABASE MIGRATION PRE-PUSH CHECKPOINT

Project:                          habit-tracker
Project Ref:                      xgasncrztfwotjlghlfg
Region:                           us-east-1

Local migrations:                 15
Remote migrations:                2
Pending migrations:               13

Remote application rows:          0
Remote auth users:                0

Local db reset:                   PASSED
TypeScript:                       PASSED
Lint:                             PASSED
Build:                            PASSED
npm audit:                        0 vulnerabilities

CLI linked to expected project:   YES (xgasncrztfwotjlghlfg, confirmado
                                   por inspección local post-link)
Destructive unexpected operations: NO (1 DROP COLUMN esperado,
                                   documentado, guardado por
                                   backfill+chequeo — mismo hallazgo
                                   de la auditoría previa, reconfirmado
                                   por el dry-run oficial)
Migration order validated:        YES (dry-run oficial coincide 13/13
                                   con la auditoría manual, mismo orden)
Backup/recovery state documented: YES

SAFE TO EXECUTE DB PUSH:          YES
```

### Decisión

Todos los criterios de 7.5A están **PASSED**, incluido el link y el
dry-run oficial. **`SAFE TO EXECUTE DB PUSH = YES`** — pero, conforme a
la regla crítica explícita de esta continuación, **esto no autoriza
ejecutar el push.** La autorización de continuar esta sesión no
constituye autorización para modificar el esquema remoto. Se requiere
una confirmación nueva e inequívoca del Product Owner para 7.5B.

**7.5A PRE-PUSH COMPLETADO.
NO SE HA EJECUTADO DB PUSH.
ESPERANDO AUTORIZACIÓN EXPLÍCITA DEL PRODUCT OWNER PARA 7.5B.**

### Confirmación expresa — no ejecutado en esta continuación

No se ejecutó `npx supabase db push` (real). No se ejecutó SQL remoto
de escritura. No se modificó schema remoto. No se modificó RLS,
policies, functions, triggers ni grants remotos. No se modificó Auth.
No se crearon usuarios. No se copiaron datos. No se modificaron ni
crearon migraciones. No se tocó Hostinger. No se hizo `git add`,
`commit` ni `push`.

---

## 7.5B — Database Migration Production

**Fecha:** 2026-08-10. **Rol:** Principal Database Engineer / Senior
Supabase-PostgreSQL Engineer / Release Engineer / Production Migration
QA Engineer. **Alcance:** ejecutar el `db push` previamente auditado y
autorizado en 7.5A, y auditar exhaustivamente (read-only) el esquema
resultante. **Única escritura remota autorizada y ejecutada en este
bloque: el `db push` de las 13 migraciones ya auditadas.**

### Autorización

El Product Owner autorizó explícitamente, en este mismo mensaje,
ejecutar el `db push` de las 13 migraciones pendientes **únicamente**
contra `habit-tracker` / `xgasncrztfwotjlghlfg` / `us-east-1`,
limitado exactamente al conjunto mostrado por el dry-run de 7.5A.

### Checkpoint de identidad inmediato — PASSED

- `supabase/.temp/project-ref` → `xgasncrztfwotjlghlfg` — MATCH.
- `mcp__supabase__get_project_url` → `https://xgasncrztfwotjlghlfg.supabase.co` — MATCH.
- `supabase projects list` → `habit-tracker`, `us-east-1`, `ACTIVE_HEALTHY` — MATCH.
- Migration history remoto: exactamente 2 (`init_schema`, `harden_functions`) — sin cambios desde 7.5A.
- Row counts (las 7 tablas de aplicación + `auth.users`): **0 en todas** — sin cambios desde 7.5A.

**Nada cambió desde el cierre de 7.5A — sin hard stop.**

### Revalidación del dry-run — PASSED

```
npx supabase db push --dry-run --linked
Would push these migrations: [las mismas 13, mismo orden]
{"upToDate":false,"dryRun":true,...}
```

Comparado literalmente contra la lista aprobada de 7.5A: **mismo
número (13), mismos timestamps, mismos nombres, mismo orden — MATCH
exacto.**

### Ejecución del db push

```
npx supabase db push --linked --yes
Applying migration 20260729015222_database_integrity.sql...
Applying migration 20260730235019_entity_lifecycle.sql...
Applying migration 20260731001044_habit_schedules.sql...
Applying migration 20260731002637_habit_log_goal_snapshots.sql...
Applying migration 20260731004632_goal_progress_source.sql...
Applying migration 20260731014259_habit_log_edit_window.sql...
Applying migration 20260731015901_rls_hardening.sql...
Applying migration 20260731021200_performance_indexes.sql...
Applying migration 20260731022414_final_cleanup.sql...
Applying migration 20260804073500_table_privileges.sql...
Applying migration 20260804221046_create_habit_schedule.sql...
Applying migration 20260805171711_goal_integrity_fixes.sql...
Applying migration 20260806162035_goal_progress_concurrency.sql...
{"upToDate":false,"dryRun":false,...,"message":"Finished supabase db push."}
```

**Resultado: PASSED.** Las 13 migraciones se aplicaron en orden, sin
errores ni warnings, cero reintentos.

### Migration history post-push

`mcp__supabase__list_migrations` → **15 registros**, exactamente las
15 versiones de los 15 archivos locales (`init_schema` →
`goal_progress_concurrency`). **Remote migrations: 15/15. Pending: 0.**

### Dry-run post-push (prueba de idempotencia)

```
npx supabase db push --dry-run --linked
{"upToDate":true,"dryRun":true,"migrations":[],...,
"message":"Remote database is up to date."}
```

**Cero migraciones pendientes — confirmado.**

### Auditoría del esquema Production (read-only, exhaustiva)

**Tablas:** 7/7 presentes (`profiles`, `categories`, `habits`,
`habit_categories`, `habit_schedules`, `habit_logs`, `goals`), RLS
habilitada en las 7. `habits` ya no tiene las 4 columnas legadas de
frecuencia (retiradas por la migración `habit_schedules`, backfill
confirmado sin pérdida — remoto estaba vacío).

**Columnas:** conteo por tabla idéntico entre Local y Production
(`categories` 7, `goals` 15, `habit_categories` 2, `habit_logs` 13,
`habit_schedules` 10, `habits` 16, `profiles` 13 — 76 columnas en
total en ambos). **MATCH.**

**Constraints:** 36 en Local, 36 en Production, **lista de nombres
idéntica byte-a-byte** (`string_agg` comparado literalmente). Incluye
el `EXCLUDE USING gist` de no-solapamiento en `habit_schedules`
(`habit_schedules_no_overlap_excl`) y todos los `CHECK` de coherencia
(`goal_type`, `frequency_type`, snapshots). **MATCH.**

**Indexes:** 23 en Local, 23 en Production, mismos nombres/definiciones,
incluido el índice único parcial
`habit_schedules_one_current_per_habit_idx` (`WHERE valid_to IS NULL`)
que garantiza una sola versión vigente por hábito. **MATCH.**

**Enums:** los 6 tipos originales sin cambios; sin enums nuevos
inesperados. **MATCH.**

### RLS

Habilitada en las 7 tablas. **19 policies en total**, comparadas
1:1 contra Local — **mismos nombres, mismo `cmd`, misma tabla.** Las
policies `ALL` amplias de `init_schema.sql` **ya no existen** —
reemplazadas por las granulares de `rls_hardening.sql` (migración 9).
**RLS = MATCH LOCAL**, confirmado, no asumido.

### Grants

Comparados 1:1 contra Local para las 7 tablas × 2 roles (`authenticated`,
`anon`): **coinciden exactamente.** `authenticated` tiene únicamente
los privilegios definidos por `table_privileges.sql` (p. ej.
`habit_schedules`: solo `SELECT`, sin INSERT/UPDATE/DELETE directo —
toda escritura debe pasar por las RPC). `anon` conserva únicamente
`REFERENCES`/`TRIGGER`/`TRUNCATE` en las 7 tablas — **sin acceso
indebido.** **Grants = MATCH LOCAL.**

### Functions / RPC

24/24 funciones de nuestras migraciones presentes y con nombres
idénticos a Local (incluye `create_habit_schedule`,
`change_habit_schedule`, `recalculate_goal_current_value`,
`compute_goal_habit_logs_progress`, `lock_habit_for_goal_progress`, y
el resto de funciones `protect_*`/`validate_*`/`sync_*`). Más
`rls_auto_enable` — función de plataforma Supabase ya documentada como
esperada desde `harden_functions.sql`/7.4B, no parte de nuestras
migraciones. Firmas verificadas para las RPC críticas:

- `create_habit_schedule(p_habit_id uuid, p_frequency_type frequency_type, p_days_of_week smallint[], p_frequency_target smallint, p_interval_days smallint) → habit_schedules`
- `change_habit_schedule(..., p_effective_date date) → habit_schedules`
- `lock_habit_for_goal_progress(p_habit_id uuid) → void`

Todas con `search_path=""` explícito (hardening de `harden_functions.sql`
aplicado de forma consistente en toda la evolución del esquema).
**Functions/RPC = MATCH LOCAL.**

### Triggers

**20 triggers activos** en `public` (conteo vía `pg_trigger`, coincide
con el baseline aprobado), más `on_auth_user_created` en `auth.users`
(creación automática de perfil en signup). Lista de nombres comparada
Local vs. Production: **idéntica, byte-a-byte** (`string_agg`
comparado literalmente). Cubre: `updated_at` (5 tablas),
`protect_*_user_id`/`protect_habit_logs_habit_id`
(inmutabilidad de ownership), `set_habit_log_goal_snapshot_trg`
(snapshots), `enforce_habit_log_edit_window_trg` (ventana de 7 días),
`sync_goal_progress_*_trg`/`protect_goal_*_trg` (Goal Progress y
concurrencia de BUG-002), `validate_goal_habit_ownership_trg`/
`validate_habit_category_ownership_trg`,
`validate_goal_habit_logs_goal_type_trg`. **Triggers = MATCH LOCAL.**

### `habit_schedules` — verificación dedicada

Tabla presente, RLS habilitada, columnas correctas
(`frequency_type`, `days_of_week`, `frequency_target`, `interval_days`,
`valid_from`, `valid_to`), `CHECK` de coherencia de frecuencia
(`habit_schedules_frequency_coherence_chk`) y de `valid_to >= valid_from`,
**`EXCLUDE USING gist (habit_id WITH =, daterange(valid_from, valid_to, '[]') WITH &&)`**
(no-overlap) y **`UNIQUE INDEX ... WHERE valid_to IS NULL`** (una sola
versión vigente por hábito) — ambos objetos de integridad crítica
presentes y correctos. RPC `create_habit_schedule`/`change_habit_schedule`
confirmadas. **Sin datos de prueba creados** (tabla vacía, 0 filas).

### Goal Progress / BUG-002

Migración `20260806162035_goal_progress_concurrency.sql` presente en
el historial remoto (versión `20260806162035`). `lock_habit_for_goal_progress(uuid)
→ void` confirmada, sin `SECURITY DEFINER` (coherente con su diseño de
lock por fila antes de recalcular, documentado en el fix original de
BUG-002). Las funciones trigger de Goal Progress
(`sync_goal_progress_after_insert_trg`,
`sync_goal_progress_from_goal_change_trg`,
`sync_goal_progress_from_habit_log_trg`) presentes y activas. **No se
ejecutó ningún stress test concurrente con datos reales** — conforme a
la instrucción explícita, solo auditoría estructural en este bloque.

### BUG-004 / historial de schedules

BUG-004 fue un fix exclusivamente de frontend (`useDailyChecklist.ts`/
`useDashboard.ts`/`utils/habitSchedule.ts`, ya commiteado en 7.2B) y no
requería ninguna migración. Infraestructura DB de la que depende
(`habit_schedules` versionado con `valid_from`/`valid_to`) confirmada
presente y correcta en la verificación dedicada de arriba. **No se
creó ningún objeto DB adicional para BUG-004, no se modificó
frontend.**

### Datos post-migración

| Tabla | Filas |
|---|---|
| `profiles` | 0 |
| `categories` | 0 |
| `habits` | 0 |
| `habit_categories` | 0 |
| `habit_logs` | 0 |
| `goals` | 0 |
| `habit_schedules` | 0 |
| `auth.users` | 0 |

**El `db push` no creó ningún dato de aplicación ni ningún usuario.**
Sin discrepancias que reportar.

### Auth

No se configuró Auth en este bloque (Site URL, Redirect URLs, email
confirmation quedan para 7.8). Confirmado que el `db push` **no creó ni
modificó usuarios** — `auth.users` sigue en 0. Trigger
`on_auth_user_created` presente y sin cambios.

### Seguridad / advisors

`mcp__supabase__get_advisors(type=security)` → **2 warnings**, ambos
del mismo patrón: `create_habit_schedule` y `change_habit_schedule` son
`SECURITY DEFINER` y ejecutables por `authenticated` vía RPC
(`/rest/v1/rpc/...`). **Clasificación: esperado y por diseño, no un
hallazgo nuevo.** Estas dos funciones son exactamente el mecanismo
sancionado por el propio diseño del esquema (documentado desde
`habit_schedules.sql`/`create_habit_schedule.sql`) para que un usuario
autenticado gestione sus propios horarios sin necesitar privilegios
directos de escritura sobre `habit_schedules` (que intencionalmente
solo tiene `GRANT SELECT` — ver sección de Grants). El linter genérico
de Supabase marca todo `SECURITY DEFINER` expuesto como WARN por
prudencia general; en este caso ya fue revisado exhaustivamente en
6.3I (QA) y su necesidad de bypasear RLS de forma controlada está
documentada. **No se corrigió nada — no correspondía en este bloque, y
no es una regresión de seguridad.** RLS sigue habilitada en las 7
tablas, `anon` sin privilegios indebidos, `search_path` seguro
(`""`) en todas las funciones propias, sin secretos introducidos por
las migraciones.

### Validación técnica local post-migración

`npx tsc --noEmit`: **Passed.** `npm run lint`: **Passed.**
`npm run build`: **Passed** (mismo warning de chunk-size, no
bloqueante). `npm audit`: **0 vulnerabilidades.** 15 archivos de
migración locales confirmados sin cambios. **No se ejecutó `db reset`
remoto ni local en este bloque** (no fue necesario — ningún archivo
local cambió desde el preflight ya aprobado de 7.5A).

### Matriz Local vs. Production (final)

| Objeto | Local | Production | Resultado |
|---|---|---|---|
| Migrations | 15 | 15 | **MATCH** |
| Tables | 7 | 7 | **MATCH** |
| RLS | Habilitada en 7/7 | Habilitada en 7/7 | **MATCH** |
| Policies | 19 | 19, mismos nombres/cmd | **MATCH** |
| Grants | `authenticated`/`anon` por `table_privileges.sql` | Idéntico | **MATCH** |
| Functions | 24 propias | 24 propias (+1 de plataforma, esperada) | **MATCH** |
| RPC (schedules, Goal Progress) | Presentes, firmas confirmadas | Idénticas | **MATCH** |
| Triggers | 20 | 20, mismos nombres | **MATCH** |
| Constraints | 36 | 36, mismos nombres | **MATCH** |
| Indexes | 23 | 23, mismos nombres/definiciones | **MATCH** |
| Enums | 6 | 6 | **MATCH** |
| Application data | 0 filas | 0 filas | **MATCH** |
| Auth users | 0 | 0 | **MATCH** |

**Cero discrepancias en toda la matriz.**

### DATABASE MIGRATION POST-PUSH CHECKPOINT

```
DATABASE MIGRATION POST-PUSH CHECKPOINT

Project:                    habit-tracker
Project Ref:                xgasncrztfwotjlghlfg
Region:                     us-east-1

DB push:                    PASSED

Local migrations:           15
Remote migrations:          15
Pending migrations:         0

Tables:                     7/7

RLS:                        MATCH
Policies:                   MATCH
Grants:                     MATCH
Functions/RPC:               MATCH
Triggers:                   20 (MATCH)
Constraints/indexes:        MATCH (36 constraints, 23 indexes)

Remote application rows:    0
Remote auth users:          0

Post-push dry-run:          NO PENDING MIGRATIONS

TypeScript:                 PASSED
Lint:                       PASSED
Build:                      PASSED
npm audit:                  0

PRODUCTION DATABASE STATUS: READY
```

### Riesgos / observaciones

- 2 advisories WARN de seguridad (RPC `SECURITY DEFINER` expuestas) —
  clasificadas como esperadas/por diseño, no una regresión; documentado
  con el razonamiento completo arriba, no se corrigió nada.
- El proyecto sigue sin datos ni usuarios reales — el verdadero smoke
  end-to-end (signup → crear hábito → checklist → etc.) queda pendiente
  para el bloque de Auth/dominio (7.8) y el smoke post-deploy (7.9),
  cuando ya haya un frontend real conectado.
- Warning de chunk-size del frontend sigue siendo deuda técnica
  aceptada, sin relación con este bloque.

### Veredicto

**DATABASE MIGRATION = COMPLETED.**

Todos los criterios de la sección 21 del encargo se cumplen: db push
Passed, remote migrations 15/15, pending 0, 7/7 tablas, RLS/policies/
grants/funciones/RPC/triggers/constraints/índices en MATCH exacto
contra Local, datos en 0, `auth.users` en 0, sin discrepancia crítica,
validación técnica local en verde.

### Próximo bloque recomendado

**7.6 — Frontend Production Configuration** (variables `VITE_*` para el
build productivo, `VITE_DATA_SOURCE=supabase`) o **7.8 — Auth/Domain/
HTTPS** si se prefiere configurar Auth (Site URL/Redirect URLs) antes
de generar el primer build productivo — ambos bloques separados, con
autorización explícita propia, ninguno iniciado en esta tarea.

### Confirmación expresa — no ejecutado en 7.5B (más allá de lo autorizado)

Se ejecutó **únicamente** el `db push` de las 13 migraciones
previamente auditadas y autorizadas. No se modificaron migraciones
existentes. No se crearon migraciones nuevas. No se ejecutó `migration
repair`. No se reseteó Production (`supabase db reset` **nunca** se
ejecutó contra remoto). No se borraron tablas ni datos manualmente. No
se ejecutó SQL remoto de escritura manual (todas las consultas de
auditoría fueron `SELECT`). No se modificó Auth. No se crearon
usuarios. No se tocó Storage. No se crearon Edge Functions. No se
copiaron datos locales. No se usó `service_role` en el frontend. No se
tocó Hostinger. No se desplegó frontend. No se configuró dominio/DNS.
No se hizo `git add`, `commit` ni `push`.

---

## 7.6 — Frontend Production Configuration & Production Build Validation

**Fecha:** 2026-08-10. **Rol:** Principal Frontend Engineer / Senior
React-TypeScript Engineer / Release Engineer / Production Deployment
QA Engineer. **Alcance:** preparar y validar el build de producción del
frontend contra Supabase Production, sin desplegar a Hostinger.
**Ninguna escritura ocurrió contra Supabase Production — solo lecturas
(incluida una llamada REST de solo lectura de verificación).**

### Baseline Git

`main`, `HEAD` = `e452fefe49fb1dc125ef710c3456e7ef39827e24` (`e452fef`)
— coincide con el SHA base. Cambios pendientes: únicamente
documentación de Deployment de 7.3-7.5B (`Contexto/03_DEPLOYMENT/*`,
`MDs/14_DEPLOYMENT_PLAN.md`), sin tocar. Cero cambios funcionales
inesperados.

### Uso real de `import.meta.env`

Solo dos archivos leen variables de entorno:

- **`src/lib/supabase.ts`:** lee `VITE_SUPABASE_URL` y
  `VITE_SUPABASE_PUBLISHABLE_KEY` **en tiempo de evaluación del
  módulo** (no en un componente, no perezoso). Si falta cualquiera de
  las dos, **lanza una excepción inmediatamente** al cargar el módulo.
  Crea la única instancia del cliente Supabase de toda la app
  (`persistSession`/`autoRefreshToken`/`detectSessionInUrl` activos).
- **`src/lib/dataSource.ts`:** lee `VITE_DATA_SOURCE`; cualquier valor
  distinto de `"supabase"` (incluido vacío/ausente) resuelve a
  `"mock"` — ese es el comportamiento por defecto ya documentado.

**Hallazgo relevante (no es un blocker, es comportamiento por diseño ya
existente):** `src/contexts/AuthContext.tsx` importa
`services/auth.service.ts`, que importa `lib/supabase.ts` — y
`AuthProvider` envuelve toda la app en `App.tsx`. Esto significa que
**`VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` son obligatorias
siempre**, incluso en modo `mock` (ya es así hoy: `.env.local` las
define aunque `VITE_DATA_SOURCE=mock`). No es un blocker nuevo — es
consistente con el diseño actual, solo se documenta para que quede
explícito antes de generar el build productivo.

### Matriz de variables

| Variable | Local Development | Production Build | Clasificación | Requerida | Fuente |
|---|---|---|---|---|---|
| `VITE_SUPABASE_URL` | `http://127.0.0.1:54321` | `https://xgasncrztfwotjlghlfg.supabase.co` | PÚBLICA | Sí (o la app no inicia) | `.env.local` (local) / `.env.production.local` (build) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable Key de Supabase Local | Publishable Key de Production (`sb_publishable_...`) | PÚBLICA | Sí (o la app no inicia) | Igual que arriba |
| `VITE_DATA_SOURCE` | `mock` | `supabase` | PÚBLICA | No (default `mock` si se omite) | Igual que arriba |

### Auditoría de `.env`

- `.env.example` (único archivo `.env*` trackeado, `git ls-files`
  confirmado) — sin valores.
- `.env.local`: ignorado (`git check-ignore` → `.gitignore:22`).
- `.env`: ignorado (`.gitignore:21`).
- `.env.production.local`: cubierto por la regla genérica `*.local`
  (`.gitignore:13`) — confirmado con `git check-ignore` antes de
  crearlo.
- `git ls-files | grep -i "\.env"` → únicamente `.env.example`. **Cero
  archivos con configuración/credenciales trackeados accidentalmente.**

### Estrategia de configuración Production elegida

**`.env.production.local`**, con las tres variables públicas
necesarias. Justificación: Vite carga automáticamente
`.env.production.local` cuando el `mode` es `production` — que es el
modo por defecto de `vite build` (usado por `npm run build`), sin
necesitar ningún flag adicional. El archivo está gitignored
(`*.local`), nunca se commiteará, y no requiere exportar variables de
proceso manualmente ni tocar `.env.local`. Es la opción más simple y
seguraconsistente con la Estrategia A ya definida en 7.3 (build local
controlado).

**Publishable Key:** `CONFIGURED` — obtenida mediante
`mcp__supabase__get_publishable_keys` (herramienta de solo lectura,
scoped al proyecto ya confirmado `xgasncrztfwotjlghlfg`), formato
moderno `sb_publishable_...`, coherente con el formato ya usado para
Local. **No se solicitó al Product Owner que la pegara en el chat** —
ya estaba disponible de forma segura en el entorno vía herramienta de
solo lectura. **Su valor no se reproduce en este documento** (solo el
prefijo en secciones técnicas de verificación, nunca completo).

### `.env.local` — sin alteración permanente

**No se tocó** en ningún momento de este bloque. Sigue exactamente
igual que antes de 7.6: `VITE_SUPABASE_URL=http://127.0.0.1:54321`,
Publishable Key local, `VITE_DATA_SOURCE=mock`. Confirmado por lectura
antes y después de todas las operaciones de este bloque.

### `.env.production.local` — decisión de conservación

**Se conserva localmente** (gitignored, nunca versionado) porque:
contiene únicamente variables públicas (sin secretos), es necesario
para regenerar el mismo build exacto en 7.7 si se decide no reutilizar
el `dist/` actual, y su existencia no representa ningún riesgo dado que
ya está fuera del alcance de Git. Si se prefiere eliminarlo por
disciplina extra, es seguro hacerlo en cualquier momento — no contiene
nada que no pueda regenerarse trivialmente a partir de la Publishable
Key (que sigue siendo pública y recuperable del Dashboard).

### Build limpio

`dist/` eliminado antes de empezar. `npm ci` **no se ejecutó** — no fue
necesario, `package-lock.json` sin cambios desde 7.5A/7.2B, `npm audit`
ya en 0. Validación técnica:

- `npx tsc --noEmit`: **Passed.**
- `npm run lint`: **Passed.**
- `npm audit`: **0 vulnerabilidades.**
- `npm run build` (modo `production`, carga automática de
  `.env.production.local`): **Passed.** Mismo warning conocido de
  chunk-size (`index-*.js` ~1.22 MB, `StatusDonut3D-*.js` ~1.0 MB), no
  bloqueante, deuda técnica ya aceptada. **El hash del bundle JS
  principal cambió** respecto a builds anteriores
  (`index-BSKBDt2T.js`, antes `index-BBLvXbxH.js`) — confirma que las
  variables de entorno realmente cambiaron el contenido compilado.

### Auditoría del `dist/` productivo

- **`127.0.0.1`/`localhost`/`:54321`/`:54322`:** 4 coincidencias de
  `localhost`/`127.0.0.1` encontradas en `index-*.js`, **todas
  verificadas como constantes internas de la librería
  `@supabase/supabase-js`** (fallback de URL cuando no hay
  `window.location`, la URL por defecto de GoTrue `http://localhost:9999`
  usada solo si no se pasa una URL explícita, y una lista de dominios
  "locales conocidos" usada internamente para lógica de cookies) — **no
  provienen de nuestra configuración**, son código genérico de la
  librería presente en cualquier proyecto que la use. Confirmado
  además que **cero** ocurrencias de `127.0.0.1:54321` (nuestro
  endpoint local real) existen en el bundle.
- **Secretos prohibidos** (`service_role`, `SUPABASE_SERVICE_ROLE`,
  `SERVICE_ROLE_KEY`, `JWT_SECRET`, el JWT secret literal de Local):
  **cero coincidencias.**
- **Correo real eliminado en 7.2A:** **cero coincidencias.**
- **Project Ref de Production:** `xgasncrztfwotjlghlfg.supabase.co`
  presente (1 coincidencia, la URL real usada por el cliente).
- **Publishable Key:** presente (prefijo `sb_publishable_km1Y...`
  verificado, valor completo no reproducido aquí). **Esto es esperado
  — es una clave pública de cliente, no un secreto** (documentado
  explícitamente, no reportado como hallazgo de seguridad).

### Validación de SPA build

`npm run preview --port 4173` (servidor estático real de Vite, **no**
el dev server) sirviendo `dist/`. Resultado:

- `/`, `/login`, `/checklist`, `/habits`, `/goals`, `/history`,
  `/statistics`, `/settings` → **200** todas.
- `index.html` referencia correctamente `index-BSKBDt2T.js` (script
  module) e `index-Bjfy3oN5.css`.
- JS: `200`, `content-type: text/javascript`. CSS: `200`,
  `content-type: text/css`. `favicon.svg`: `200`.

**SPA CLIENT ROUTING = PASSED** a nivel de servidor/assets. **HOSTINGER
SPA FALLBACK = PENDING 7.7** — el servidor de `vite preview` tiene su
propio fallback SPA interno, que **no** es equivalente al mecanismo
`.htaccess`/Apache que Hostinger requerirá; no se creó ningún
`.htaccess` en este bloque (fuera de alcance).

**Limitación explícita:** este entorno no dispone de una herramienta de
automatización de navegador, por lo que la verificación interactiva
completa (clics, comportamiento visual de `ProtectedRoute`, ausencia de
errores de consola en runtime real) **no se ejecutó**. Mitigado con:
verificación de servidor/assets (arriba), auditoría estática del bundle
(sin errores de build/tsc que habrían fallado ante una API rota), y la
prueba de conectividad REST directa de la sección siguiente, que
confirma que el endpoint que el cliente usaría realmente responde.

### Conectividad con Supabase Production (read-only)

Se realizó una verificación directa vía REST (equivalente a lo que el
cliente `supabase-js` haría al inicializarse), **sin crear usuarios,
sin signup, sin insertar nada**:

```
GET https://xgasncrztfwotjlghlfg.supabase.co/rest/v1/
→ 401

GET https://xgasncrztfwotjlghlfg.supabase.co/rest/v1/profiles?select=id&limit=1
  (con la Publishable Key de Production como apikey)
→ 401 {"code":"42501","message":"permission denied for table profiles",
  "hint":"Grant the required privileges to the current role with:
  GRANT SELECT ON public.profiles TO anon;"}
```

**Resultado: PASSED.** El `401` con `permission denied` es exactamente
el comportamiento esperado y ya confirmado en 7.5B (`anon` sin
`GRANT` alguno sobre `profiles`) — prueba que: (a) la API de Production
responde, (b) la Publishable Key es válida y reconocida (una key
inválida devuelve un error distinto, de autenticación de API, no de
permisos de tabla), (c) RLS/grants siguen intactos tal como se dejaron
en 7.5B. **Cero escrituras realizadas** (ambas fueron `GET`).

### Network — destinos observados

Todas las solicitudes de verificación (REST directo) fueron
exclusivamente a `https://xgasncrztfwotjlghlfg.supabase.co`. **Cero
solicitudes a `127.0.0.1`/`localhost`. Cero solicitudes a cualquier
otro Project Ref** (no se detectó ni se usó ningún otro proyecto
Supabase en ningún momento de este bloque).

### Auth en este bloque

No se configuró Auth remoto (Site URL, Redirect URLs, email
confirmation, SMTP) — queda para el bloque posterior de Auth/Domain.
`LoginPage` no se ejerció interactivamente (sin herramienta de
navegador); no se creó ningún usuario ni se intentó signup/login real
contra Production.

### Supabase Production — post-check

Reconfirmado por lectura tras todas las operaciones de este bloque:
`list_migrations` → **15/15**, sin cambios. Conteos: **0** en las 7
tablas de aplicación y **0** en `auth.users` — idéntico al estado de
cierre de 7.5B. **Cero escrituras ocurrieron durante 7.6.**

### Mock regression

`.env.local` reconfirmado sin cambios (`mock`). `npm run dev --port
5175` (modo `development`, que **no** carga `.env.production.local`):
las 7 rutas (`/`, `/checklist`, `/habits`, `/goals`, `/history`,
`/statistics`, `/settings`) respondieron `200`, sin errores en el log
de Vite. **PASSED** — la preparación de Production no rompió el
desarrollo local en modo mock.

### Estado final de `dist/`

**DIST STATUS: PRODUCTION BUILD CANDIDATE — NOT DEPLOYED.** Se conserva
porque: fue generado exactamente con la configuración de Production
(`VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`/`VITE_DATA_SOURCE=supabase`
de `.env.production.local`), fue auditado línea por línea (sin
secretos, sin endpoints locales reales), y es candidato directo para
7.7. Sigue gitignored, no se subió a ningún lado.

### Riesgos / observaciones

- Verificación interactiva de navegador no ejecutada (misma limitación
  ya documentada en bloques anteriores de Paso 7) — mitigada con
  verificación de servidor/assets + prueba REST directa de
  conectividad real.
- El fallback SPA de Hostinger (`.htaccess`) sigue sin implementarse —
  explícitamente fuera de alcance de 7.6, pendiente para 7.7.
- `VITE_SUPABASE_URL`/`KEY` son obligatorias incluso en modo mock (
  comportamiento preexistente, no introducido por este bloque) —
  documentado para que quede explícito antes de cualquier
  configuración futura de Hostinger.
- Warning de chunk-size sigue siendo deuda técnica aceptada, sin
  relación con este bloque.

### FRONTEND PRODUCTION CONFIG CHECKPOINT

```
FRONTEND PRODUCTION CONFIG CHECKPOINT

Project:                              habit-tracker
Project Ref:                          xgasncrztfwotjlghlfg

Production URL configured:            YES
Production Publishable Key configured: YES
VITE_DATA_SOURCE production:          supabase

Production build:                     PASSED

dist contains localhost:              NO (solo constantes internas de
                                       @supabase/supabase-js, sin
                                       relación con nuestra config;
                                       cero 127.0.0.1:54321 real)
dist contains Production Project Ref: YES
dist contains forbidden secrets:      NO

Production API connectivity:          PASSED
Unexpected Supabase project requests: NO

SPA client routing:                   PASSED
Hostinger SPA fallback:               PENDING 7.7

Production writes:                    0
Production application rows:          0
Production auth users:                0

Mock regression:                      PASSED
.env.local final mode:                mock

TypeScript:                           PASSED
Lint:                                 PASSED
Build:                                PASSED
npm audit:                            0 vulnerabilities

DIST STATUS:                          PRODUCTION BUILD CANDIDATE — NOT DEPLOYED

FRONTEND PRODUCTION CONFIG:           READY
```

### Veredicto

**7.6 = COMPLETED.** Todos los criterios de la sección 24 del encargo
se cumplen: URL/Publishable Key configuradas correctamente,
`VITE_DATA_SOURCE=supabase` efectivo en el build, build/tsc/lint/audit
en verde, `dist/` sin endpoints locales reales ni secretos prohibidos,
apuntando exclusivamente al Supabase Production autorizado, conexión
Production confirmada sin escrituras, Production sigue vacía, SPA
cliente funcional, regresión mock exitosa, `.env.local` terminó en
`mock`.

### Próximo bloque recomendado

**7.7 — Frontend Deployment** (subir el `dist/` ya auditado a
Hostinger, configurar `.htaccess` para el fallback SPA) — bloque
separado, con autorización explícita propia, no iniciado en esta
tarea.

### Confirmación expresa — no ejecutado en 7.6

No se desplegó a Hostinger. No se modificó Supabase Production (fuera
de lecturas y una llamada REST de solo lectura). No se ejecutó `db
push`. No se modificó Auth. No se crearon usuarios. No se crearon
datos. No se modificaron migraciones. No se expusieron secretos (la
Publishable Key es pública por diseño, no un secreto, y su valor
completo no se reprodujo en ningún documento). No se configuró
dominio/DNS. No se hizo `git add`, `commit` ni `push`.

---

## 7.7A — codgoli.com/habitos Deployment Preparation

**Fecha:** 2026-08-10. **Rol:** Principal DevOps Engineer / Senior
Hostinger Deployment Engineer / Senior React-Vite Engineer / Production
Safety Reviewer. **Alcance:** verificar y preparar de forma segura el
deployment de Habit Tracker bajo `https://codgoli.com/habitos`, sin
subir nada todavía. **Resultado: PAUSED en la parte de Hostinger** —
este entorno no tiene acceso al panel de Hostinger del Product Owner;
la parte de código está **completamente resuelta y verificada**.

### Decisión confirmada

Arquitectura definitiva: `https://codgoli.com/habitos` (subruta del
sitio existente). Explícitamente descartado: subdominio
(`habitos.codgoli.com`) y dominio nuevo. El sitio Codgoli existente no
debe tocarse bajo ninguna circunstancia.

### Baseline Git

`main`, `HEAD` = `e452fef` antes de este bloque. Cambios de este
bloque: `src/main.tsx` (1 línea), `public/.htaccess` (archivo nuevo) —
ambos documentados abajo. Resto de cambios pendientes son documentación
de Deployment de 7.3-7.6, sin tocar.

### Auditoría del build/config actual

- `vite.config.ts`: sin `base` configurado (default `/`) — confirmado
  por lectura, sin cambios permanentes.
- `index.html`: `<script src="/src/main.tsx">`, `<link href="/favicon.svg">`
  — referencias raíz-absolutas gestionadas por el propio pipeline de
  Vite (HTML plugin), no manuales.
- `src/main.tsx`: `<BrowserRouter>` **sin `basename`** — confirmado
  como el único punto que requería cambio.
- `src/App.tsx`: rutas relativas al router (`/`, `/checklist`,
  `/habits`, `/history`, `/statistics`, `/goals`, `/settings`, `*`) —
  todas resueltas por React Router, sin problema con `basename`.
- Búsqueda exhaustiva de referencias absolutas potencialmente
  problemáticas: `navigate("/...")` (`TodaySummary.tsx`,
  `LoginPage.tsx`, `InsightCard.tsx` vía `action.href`),
  `<Link to="/...">` (`Sidebar.tsx`, `MobileNavigation.tsx`,
  `MobileMoreMenu.tsx` vía `item.path` de `src/routes/navigation.ts`,
  y `AIAssistantPanel.tsx`, `HabitStrengthList.tsx`, `TodaySummary.tsx`),
  `<Navigate to="/...">` (`NotFoundPage.tsx`, `ProtectedRoute.tsx`) —
  **el 100% usa las APIs de React Router** (`navigate`, `Link`,
  `Navigate`), todas automáticamente conscientes del `basename` del
  router. **Cero** `window.location` de navegación interna, **cero**
  `href="/..."` en anchors planos, **cero** rutas hardcodeadas fuera
  del control de React Router. `redirectTo` de Supabase Auth
  deliberadamente omitido (sin pantalla de reset de password todavía,
  confirmado por comentario explícito en `auth.service.ts`).

### Clasificación

**B — requiere configuración mínima de deployment/base path**, sin
cambios funcionales. Cambios exactos, ambos ya implementados y
verificados:

1. **`src/main.tsx`** (1 línea): `<BrowserRouter>` →
   `<BrowserRouter basename={import.meta.env.BASE_URL}>`. Patrón
   oficial recomendado por Vite+React Router. `BASE_URL` es `/` por
   defecto (desarrollo local y cualquier build sin `--base` explícito)
   — **cero impacto en desarrollo local**, confirmado empíricamente
   (ver "Mock regression" abajo).
2. **`vite.config.ts`: sin cambios.** Se usa el flag oficial de CLI
   `vite build --base=/habitos/` (documentado en `vite build --help`),
   en vez de hardcodear `base` en la config — así el build normal
   (`npm run build`, usado en 7.6) sigue produciendo un `dist/` para
   raíz sin ningún cambio de comportamiento.
3. **`public/.htaccess`** (archivo nuevo, ver sección de SPA fallback
   abajo) — Vite copia todo el contenido de `public/` verbatim a
   `dist/`, por lo que aparece automáticamente en `dist/.htaccess` en
   cada build.

Ningún cambio funcional (lógica de negocio, componentes, hooks,
servicios) fue tocado.

### Vite base path

Determinado y verificado empíricamente (no asumido): `vite build
--base=/habitos/` produce un `dist/index.html` con
`<script src="/habitos/assets/index-*.js">`,
`<link href="/habitos/assets/index-*.css">` y
`<link rel="icon" href="/habitos/favicon.svg">` — **Vite reescribe
automáticamente las referencias de `index.html` con el `base`
configurado, sin necesitar editar manualmente `%BASE_URL%` en el HTML**
(se verificó construyendo primero y leyendo el resultado, no se asumió
el comportamiento). Los chunks lazy-loaded (`StatusDonut3D-*.js`) usan
`import(\`./StatusDonut3D-*.js\`)` — ruta relativa al propio módulo
(`import.meta.url`), por lo que también resuelven correctamente bajo
`/habitos/assets/` sin configuración adicional.

**Nota de entorno:** el primer intento de build con
`--base=/habitos/` fue corrompido por la conversión automática de
rutas de Git Bash/MSYS en Windows (`/habitos/` se transformó en
`/GIT/habitos/`) — identificado, corregido con `MSYS_NO_PATHCONV=1`, y
reconstruido correctamente. Se documenta para que 7.7B use el mismo
prefijo si genera el build desde un shell similar.

### React Router base path

`basename={import.meta.env.BASE_URL}` en `src/main.tsx` — con
`--base=/habitos/`, `BASE_URL` resuelve a `/habitos/` y `BrowserRouter`
usa exactamente ese prefijo. Validado sirviendo el build real con
`vite preview --base=/habitos/`: las 8 rutas reales del proyecto
(`/habitos/`, `/habitos/login`, `/habitos/checklist`, `/habitos/habits`,
`/habitos/goals`, `/habitos/history`, `/habitos/statistics`,
`/habitos/settings`) devolvieron `200`, con `index.html` referenciando
correctamente los assets bajo `/habitos/assets/`.

### Redirecciones internas — clasificación

Categoría A (rutas internas de React Router, el `basename` las
maneja automáticamente): el 100% de las referencias encontradas —
`navigate()`, `<Link to>`, `<Navigate to>`, incluidos los `href`
definidos en `src/utils/insightsEngine.ts` (consumidos únicamente por
`navigate(action.href)`, nunca por un `<a href>` plano). **Categoría B
(rutas absolutas que escaparían de `/habitos`): ninguna encontrada.**
**Categoría C (sin relación): N/A.** No se hicieron reemplazos globales
ciegos — cada coincidencia se inspeccionó individualmente.

### Impacto futuro sobre Supabase Auth (análisis, sin cambios remotos)

`https://codgoli.com/habitos` deberá configurarse como **Site URL** de
Supabase Auth en el bloque 7.8, y como mínimo una **Redirect URL**
exacta (probablemente `https://codgoli.com/habitos` y/o
`https://codgoli.com/habitos/*` según lo que Supabase permita — a
confirmar en 7.8 con el mecanismo real del dashboard). Email
confirmation V1 sigue **DESACTIVADA** (decisión ya tomada). **No se
modificó ninguna configuración de Auth remota en 7.7A.**

### Build Production para `/habitos`

`npx tsc --noEmit`: **Passed.** `npm run lint`: **Passed.**
`npm audit`: **0 vulnerabilidades.**
`MSYS_NO_PATHCONV=1 npx vite build --base=/habitos/`: **Passed** —
usa `.env.production.local` ya preparado en 7.6
(`VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` de Production,
`VITE_DATA_SOURCE=supabase`), sin necesitar cambios. Mismo warning de
chunk-size ya aceptado.

### Auditoría del `dist/` (`/habitos`)

- `dist/.htaccess` presente (bundleado automáticamente desde
  `public/.htaccess`).
- `127.0.0.1`/`:54321`/`:54322`: **cero coincidencias reales** — la
  única mención de `localhost`/`127.0.0.1` es la misma constante
  interna de `@supabase/supabase-js` ya documentada y descartada en
  7.6 (fallback de librería, no de nuestra config).
- Secretos prohibidos (`service_role`, `SERVICE_ROLE_KEY`,
  `JWT_SECRET`, JWT secret literal de Local): **cero.** Las únicas
  coincidencias de "access token" son strings de log genéricos del SDK
  sobre el token de sesión del propio usuario (terminología estándar
  OAuth, no una credencial embebida).
- Correo real eliminado en 7.2A: **cero coincidencias.**
- Project Ref de Production `xgasncrztfwotjlghlfg.supabase.co`:
  **presente** (1 coincidencia).
- Publishable Key: presente (prefijo `sb_publishable_km1Y...`
  verificado, esperado — clave pública de cliente).

### Validación SPA con base path real

`vite preview --base=/habitos/ --port 4174` (servidor estático real de
Vite, sirviendo exactamente el `dist/` de `/habitos`): 8/8 rutas
`/habitos/*` → `200`. Assets JS/CSS/favicon → `200` con
`content-type` correcto. **SPA CLIENT ROUTING = PASSED** a nivel de
servidor/assets bajo el base path real.

**Limitación explícita, ya documentada en bloques anteriores:** sin
herramienta de navegador interactivo en este entorno — verificación de
consola/clics no ejecutada en vivo. **HOSTINGER SPA FALLBACK = PENDING
7.7B** — el fallback de `vite preview` es interno a Vite, no prueba que
el `.htaccess`/Apache-LiteSpeed real de Hostinger vaya a comportarse
igual; por eso se diseñó el `.htaccess` (ver abajo) en vez de asumir
que "funcionará solo".

### Diseño del `.htaccess` para `/habitos`

`public/.htaccess` (nuevo, se bundlea a `dist/.htaccess`
automáticamente):

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /habitos/
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /habitos/index.html [L]
</IfModule>
```

Diseñado para quedar **aislado**: `RewriteBase /habitos/` fija el
alcance explícitamente a esa carpeta, sin depender de ni interferir con
cualquier regla del `.htaccess` raíz de Codgoli (que no se inspeccionó
en este bloque — ver sección de Hostinger, pendiente de intervención
del Product Owner). **No se subió a ningún lado** — vive únicamente en
el repositorio local, listo para subirse como parte del contenido de
`dist/` en 7.7B.

### Supabase Production — post-check

Sin cambios necesarios ni ejecutados en 7.7A más allá de lo ya
confirmado en 7.5B/7.6 (15/15 migraciones, 7/7 tablas, 0 filas, 0
usuarios) — este bloque no requirió ninguna interacción adicional con
Supabase.

### Hostinger — auditoría PENDIENTE DE INTERVENCIÓN DEL PRODUCT OWNER

**Este entorno no tiene acceso al panel de Hostinger** (sin
credenciales, sin herramienta de navegador, sin API de Hostinger
disponible). Todo lo relacionado con el sitio Codgoli, el document root
real, la existencia de `.htaccess` raíz, y la estructura de carpetas
**no pudo verificarse** y requiere que el Product Owner lo confirme
directamente. Ver la sección "Intervención requerida del Product
Owner" en la entrega final para las instrucciones exactas.

### Riesgos / observaciones

- **Bloqueante principal:** sin verificación directa del document root
  real de Codgoli, no se puede confirmar con certeza la ruta física
  exacta donde crear `/habitos/`, ni si el `.htaccess` raíz (si existe)
  interferiría. El diseño del `.htaccess` propio (`RewriteBase
  /habitos/`) minimiza este riesgo por construcción, pero no lo
  elimina sin inspección real.
- Sin confirmación de qué motor sirve realmente codgoli.com
  (Apache/LiteSpeed con soporte `.htaccess`/`mod_rewrite` es lo típico
  en hosting compartido de Hostinger, pero no se asume sin
  confirmación).
- Verificación interactiva de navegador sigue sin poder ejecutarse en
  este entorno (limitación ya conocida, acumulada desde bloques
  anteriores).
- Warning de chunk-size sigue siendo deuda técnica aceptada.

### HOSTINGER /HABITOS DEPLOYMENT CHECKPOINT

```
Existing site:                  codgoli.com
Existing site status:           PROTECTED (no se tocó nada remoto)

Codgoli document root:          PENDING — requiere confirmación del
                                 Product Owner vía File Manager
Codgoli index modified:         NO
Codgoli root .htaccess modified: NO

Target production URL:          https://codgoli.com/habitos
Target filesystem path:         PENDING — depende del document root real
Target path exists:             PENDING
Path safe to use:                PENDING

New domain required:            NO
New domain purchased:           NO
Subdomain required:             NO
Additional Hostinger payment:   NO (se espera que no; a confirmar solo
                                 si el Product Owner ve lo contrario)

HTTPS for /habitos:             PENDING (se espera YES, heredado del
                                 certificado del dominio; a confirmar)

Server:                         PENDING — se espera Apache/LiteSpeed
                                 (típico en Hostinger compartido), sin
                                 confirmar

Local .htaccess supported:      PENDING (depende del servidor real)
Parent .htaccess interference:  PENDING — no inspeccionado, ver riesgo

Vite base path:                 /habitos/ (verificado, PASSED)
React Router base:              import.meta.env.BASE_URL (verificado, PASSED)
Code changes required:          YES — 1 línea en src/main.tsx +
                                 public/.htaccess (nuevo), ambos
                                 implementados y verificados

Production build for /habitos:  PASSED
Production Project Ref:         xgasncrztfwotjlghlfg
Forbidden secrets in dist:      0

SPA routes validated:           8/8 (vite preview --base=/habitos/)

Ready to create /habitos:       NO — pendiente de confirmar document
                                 root real
Ready to upload dist:           NO — pendiente de lo anterior
```

### Veredicto

**PAUSED — WAITING FOR PRODUCT OWNER** (para la parte de Hostinger). El
lado de código está **completamente resuelto y verificado (GO)** —
`dist/` es un candidato válido para `/habitos`, generado y auditado.
Falta exclusivamente la confirmación del entorno real de Hostinger
(document root, `.htaccess` raíz, servidor) antes de poder declarar
`Ready to create /habitos = YES`.

### Próximo bloque recomendado

Continuar 7.7A con la información que devuelva el Product Owner (no
requiere reiniciar la auditoría de código), y solo entonces avanzar a
**7.7B — Frontend Upload to codgoli.com/habitos**, con autorización
explícita separada.

### Confirmación expresa — no ejecutado en 7.7A

No se compró dominio. No se creó subdominio. No se modificó Codgoli. No
se reemplazó su index. No se modificó su `.htaccess` raíz (no se
inspeccionó siquiera, por falta de acceso). No se subió `dist/`. No se
desplegó Habit Tracker. No se modificó DNS. No se modificó SSL. No se
modificó Supabase Production. No se modificó Auth. No se hizo
`git add`, `commit` ni `push`.

---

## 7.7B — Hostinger Pre-Upload & Deployment Preparation

**Fecha:** 2026-08-10. **Rol:** Principal DevOps Engineer / Senior
Frontend Deployment Engineer / Release Engineer / QA Release Gate
Engineer. **Alcance:** auditoría exhaustiva final del paquete de
deployment, sin subir nada. **Cero escritura en Hostinger. Cero
escritura en Supabase Production** (solo lecturas de reconfirmación).

### Arquitectura confirmada (por el Product Owner, verificación manual)

```
HOSTINGER DOCUMENT ROOT:     public_html
TARGET FILESYSTEM PATH:      public_html/habitos/
TARGET URL:                  https://codgoli.com/habitos/
HTTPS:                       YES (confirmado manualmente por el Product Owner)
```

Contenido actual de `public_html` (inspección visual manual del
Product Owner en el File Manager de Hostinger): `.git/`, `index.html`,
`README.md`. **`public_html/habitos/` no existe.**
**`public_html/.htaccess` no aparece en el listado visible.**

**Nota sobre archivos ocultos:** no existe ninguna forma read-only
disponible en este entorno para confirmar de forma absoluta la
ausencia de archivos ocultos en Hostinger (sin acceso FTP/SSH/API a la
cuenta). Se documenta como limitación, no se afirma con certeza
absoluta — el procedimiento de 7.7C deberá volver a verificar
visualmente el listado (incluyendo archivos ocultos si el File Manager
lo permite) inmediatamente antes de crear `public_html/habitos/`.

### Estado Git

`main`, sin ahead/behind respecto a `origin/main`. `git log -5`
confirma que el último commit real sigue siendo `e452fef` ("docs:
record release staging results and manifest") — ningún commit nuevo se
ha creado desde 7.2B. Cambios pendientes en el working tree,
distinguidos:

- **Heredados de 7.3-7.6** (documentación de Deployment): sin tocar.
- **`src/main.tsx`** (de 7.7A, reconfirmado sin cambios adicionales en
  7.7B): 1 línea, `basename={import.meta.env.BASE_URL}`.
- **`public/.htaccess`** (de 7.7A, reconfirmado sin cambios): SPA
  fallback aislado a `/habitos/`.
- **Este bloque (7.7B):** solo actualizaciones a
  `MDs/14_DEPLOYMENT_PLAN.md` y `Contexto/03_DEPLOYMENT/*`.

Ningún `git add`/`commit`/`push` ejecutado.

### Auditoría del `basename`

`src/main.tsx` confirmado: `<BrowserRouter basename={import.meta.env.BASE_URL}>`
— sin `/habitos` hardcodeado en ningún punto de la lógica de React
(`BASE_URL` es una variable resuelta por Vite en build-time según el
flag `--base`, no un literal en el código fuente). Único
`BrowserRouter`/`createBrowserRouter`/`RouterProvider` en todo el
proyecto (`src/main.tsx`, línea única). Sin `window.location`/
`location.href` de navegación interna en ningún archivo de `src/`.

Barrido completo de navegación interna (`navigate(`, `<Link to`,
`<Navigate to`): **10 puntos de uso**, todos vía APIs de React Router
(`useNavigate`, `<Link>`, `<Navigate>`), incluida una coincidencia
adicional no listada explícitamente en el encargo
(`HistoryTable.tsx`: `<Link to={\`/checklist?date=${entry.log.date}\`}>`
— también resuelta correctamente por el `basename`, con query string).
**Cero rutas absolutas que escapen del `basename`.** Cero `href="/..."`
en anchors planos.

### Auditoría del `.htaccess`

`public/.htaccess` confirmado: `RewriteEngine On`, `RewriteBase
/habitos/`, condiciones `!-f`/`!-d` (solo reescribe si el archivo/
directorio solicitado NO existe físicamente — un asset real como
`/habitos/assets/index-*.js` nunca se reescribe), destino
`/habitos/index.html`. **No redirige `codgoli.com` completo** (el
archivo vivirá exclusivamente dentro de `public_html/habitos/`, cuyo
alcance en Apache está limitado a esa carpeta por el propio mecanismo
de `.htaccess` por directorio). No se creó ni se modificó ningún
`.htaccess` en la raíz.

### Build final candidato

Comando exacto: `MSYS_NO_PATHCONV=1 npx vite build --base=/habitos/`
(el prefijo `MSYS_NO_PATHCONV=1` es necesario en este entorno Git
Bash/Windows para evitar que `/habitos/` se corrompa por la conversión
automática de rutas de MSYS — ya documentado en 7.7A). `dist/`
regenerado desde cero (no se reutilizó el `dist/` anterior).

- `npx tsc --noEmit`: **Passed.**
- `npm run lint`: **Passed.**
- `npm audit`: **0 vulnerabilidades.**
- Build: **Passed.** Usa `.env.production.local` automáticamente
  (`VITE_DATA_SOURCE=supabase`, `VITE_SUPABASE_URL`/`KEY` de
  Production). Mismo warning de chunk-size ya aceptado.

### Inventario de `dist/`

| Archivo | Tamaño |
|---|---|
| `index.html` | 4.0K |
| `.htaccess` | 1.0K |
| `favicon.svg` | 12K |
| `icons.svg` | 8.0K |
| `assets/index-*.js` | 1.2M |
| `assets/StatusDonut3D-*.js` | 980K |
| `assets/index-*.css` | 48K |

**7 archivos, 2 carpetas (`dist/`, `dist/assets/`), 2.2M total.**
`dist/index.html` confirmado con `<script src="/habitos/assets/index-*.js">`,
`<link href="/habitos/assets/index-*.css">`,
`<link rel="icon" href="/habitos/favicon.svg">` — **todos correctamente
prefijados con `/habitos/`.**

### Auditoría de secretos y referencias (dist completo)

- `127.0.0.1`/`localhost`/`:54321`/`:54322`: 4 coincidencias, **las
  mismas 4 constantes internas de `@supabase/supabase-js`** ya
  identificadas y explicadas en 7.6/7.7A (fallback de URL sin
  `window.location`, GoTrue default `http://localhost:9999`, matcher
  de dominios de cookies) — **no provienen de nuestra configuración**,
  no son un bug.
- `xgasncrztfwotjlghlfg.supabase.co`: **presente** (1 coincidencia) —
  target Production correcto.
- Barrido de `*.supabase.co` en todo `dist/assets/*.js`: **el único
  proyecto referenciado es `xgasncrztfwotjlghlfg`** — cero proyectos
  inesperados.
- Secretos (`service_role`, `SUPABASE_SERVICE_ROLE_KEY`, `DB_PASSWORD`,
  `DATABASE_URL`, `postgresql://`, `JWT_SECRET`,
  `SUPABASE_ACCESS_TOKEN`): **cero coincidencias reales** en todos los
  archivos de `dist/` (JS, HTML, `.htaccess`).
- `sb_secret`: 1 coincidencia, verificada como el helper genérico de
  `@supabase/supabase-js` que detecta el **prefijo** de un tipo de
  clave (`e.startsWith('sb_secret_')`) — código de la librería, no una
  credencial embebida (mismo hallazgo ya documentado en 7.2B/6.3I).
- Publishable Key: presente (prefijo `sb_publishable_km1Y...`
  verificado, valor completo no reproducido) — **esperado, es una
  clave pública de cliente.**

### Validación local del base path

`vite preview --base=/habitos/ --port 4175`: **8/8 rutas reales del
proyecto** (`/habitos/`, `/habitos/login`, `/habitos/checklist`,
`/habitos/habits`, `/habitos/goals`, `/habitos/history`,
`/habitos/statistics`, `/habitos/settings`) → `200`. Assets JS/CSS/
favicon → `200` con `content-type` correcto.

**Limitación explícita, declarada sin inventar resultados:** este
entorno no dispone de una herramienta de automatización de navegador,
por lo que el smoke interactivo real (clics, consola, comportamiento
visual) **no se ejecutó** — el resultado se declara **LIMITED**, no
`PASSED`, para la parte visual/interactiva. La parte de
servidor/assets/rutas **sí está verificada con evidencia real** (HTTP
`200` en las 8 rutas + assets).

### Supabase Production — reconfirmación read-only

`get_project_url` → `https://xgasncrztfwotjlghlfg.supabase.co`
(identidad reconfirmada). `list_migrations` → **15/15**, sin cambios.
`COUNT(*)` sobre las 7 tablas de aplicación + `auth.users` → **0 en
todas**, sin cambios desde 7.5B/7.6/7.7A. **Cero escrituras ejecutadas
en 7.7B.** No se probó signup/login contra Production — corresponde a
después del deploy real.

### Protección de Codgoli — confirmación

`public_html/index.html`, `public_html/.git/`, `public_html/README.md`:
**ninguno fue modificado, abierto para edición, movido ni borrado** —
toda la información sobre ellos proviene exclusivamente de la
inspección manual ya reportada por el Product Owner, nunca de una
acción de este entorno. Ningún comando Git se ejecutó dentro de
`public_html/.git`. Ninguna configuración de Hostinger fue tocada
(DNS, SSL, PHP, versión de servidor, Website Builder/WordPress).

### Estrategia de backup (para 7.7C)

**FIRST DEPLOY** — no existe ningún Habit Tracker anterior en
Hostinger que respaldar. Verificación pre-upload obligatoria en 7.7C
(antes de crear cualquier archivo): reconfirmar visualmente que
`public_html/index.html`, `public_html/.git/`, `public_html/README.md`
siguen presentes, y que `public_html/habitos/` **sigue sin existir**
en ese momento (el estado puede cambiar entre sesiones). **Regla
explícita si `public_html/habitos/` apareciera inesperadamente:** NO
sobrescribir, NO borrar, DETENERSE, inspeccionar su contenido, hacer
backup antes de cualquier acción — nunca asumir que es seguro
continuar solo porque la auditoría de 7.7B no lo encontró.

### Estrategia de upload (diseño para 7.7C, no ejecutado)

1. Reconfirmar `public_html` como root y que Codgoli sigue intacto.
2. Reconfirmar que `public_html/habitos/` sigue sin existir.
3. Crear `public_html/habitos/`.
4. Subir el **contenido** de `dist/` dentro de esa carpeta (nunca
   `dist/` como subcarpeta contenedora — el resultado correcto es
   `public_html/habitos/index.html`, no
   `public_html/habitos/dist/index.html`).
5. Verificar la estructura resultante coincide exactamente con el
   inventario de `dist/` documentado arriba.
6. Verificar permisos de archivo razonables (lectura pública para
   servir contenido estático).
7. Abrir `https://codgoli.com/habitos/` y confirmar carga.
8. Verificar que los assets (`/habitos/assets/*.js`, `*.css`,
   `favicon.svg`) cargan con `200`.
9. Verificar deep links (`/habitos/checklist`, etc.) sin 404.
10. Verificar refresh directo de una ruta interna.
11. Verificar consola del navegador sin errores fatales.
12. Verificar Network: todas las llamadas Supabase van exclusivamente a
    `xgasncrztfwotjlghlfg.supabase.co`.
13. Confirmar `https://codgoli.com/` (sitio Codgoli) sigue funcionando
    exactamente igual que antes del upload.

**Ninguno de estos pasos se ejecutó en 7.7B.**

### Estrategia de rollback (first deploy)

Si Habit Tracker falla tras el primer deploy: **no tocar Codgoli**;
retirar únicamente `public_html/habitos/` (o los archivos específicos
que fallen); si existiera un backup de un despliegue previo de
`/habitos` (no aplica en este first deploy, pero sí en despliegues
futuros), restaurar solo esa carpeta; verificar inmediatamente que
`https://codgoli.com` sigue respondiendo con normalidad. **No se
propone ni se autoriza** borrar `public_html` completo ni restaurar
todo el hosting por un fallo aislado de `/habitos`.

### Auth — sin cambios

No se tocó Supabase Auth (Site URL, Redirect URLs, email confirmation,
SMTP) en este bloque — corresponde a un bloque posterior, después de
confirmar la URL real ya desplegada.

### Riesgos / observaciones

- Sin confirmación absoluta de ausencia de archivos ocultos en
  `public_html` (limitación de herramienta, no de proceso) — mitigado
  exigiendo una reverificación visual inmediatamente antes de 7.7C.
- Sin confirmación del motor real de Hostinger (Apache/LiteSpeed) —
  el diseño del `.htaccess` sigue la sintaxis estándar `mod_rewrite`,
  ampliamente compatible con ambos, pero la prueba definitiva será el
  primer deploy real.
- Smoke interactivo real (navegador) sigue sin poder ejecutarse en
  este entorno — limitación acumulada y ya aceptada en bloques
  anteriores, mitigada con verificación de servidor/assets.
- Warning de chunk-size: deuda técnica ya aceptada, sin relación con
  este bloque.

### HOSTINGER PRE-UPLOAD CHECKPOINT

```
Existing production site:        https://codgoli.com
Existing site HTTPS:              YES

Document root:                    public_html
Existing root index:              YES
Existing root Git:                YES
Existing root README:             YES
Existing root .htaccess:          NO VISIBLE (sin confirmación absoluta
                                   de archivos ocultos)

Target URL:                       https://codgoli.com/habitos/
Target filesystem path:           public_html/habitos/
Target currently exists:          NO

Codgoli files modified:           0

Vite base:                        /habitos/
React Router basename:            PASSED
Local SPA .htaccess:              PASSED

Production build:                 PASSED
dist/index.html:                  YES
dist/assets:                      YES
dist/.htaccess:                   YES
Assets use /habitos/:             YES

Production Supabase Project Ref:  xgasncrztfwotjlghlfg
Unexpected Supabase refs:         0
Forbidden secrets:                0

Production DB migrations:         15/15
Production writes during 7.7B:    0

TypeScript:                       PASSED
Lint:                             PASSED
npm audit:                        0 vulnerabilities

Local /habitos route smoke:       PASSED (servidor/assets) —
                                   LIMITED (interactivo, sin navegador)

Upload package:                   READY
Backup strategy:                  READY
Rollback strategy:                READY

SAFE TO CREATE public_html/habitos: YES
SAFE TO UPLOAD dist CONTENTS:       YES

UPLOAD EXECUTED:                  NO
```

### Veredicto

**GO PARA 7.7C.** Todos los criterios verificables desde este entorno
están en verde. La única limitación (confirmación absoluta de archivos
ocultos en Hostinger) no bloquea el GO porque el procedimiento de
7.7C ya incluye una reverificación visual obligatoria inmediatamente
antes de crear `public_html/habitos/`.

### Próximo bloque recomendado

**7.7C — Hostinger First Deploy**: crear `public_html/habitos/` y
subir el contenido de `dist/` — bloque separado, con autorización
explícita nueva del Product Owner (esta sesión no la constituye).

### Confirmación expresa — no ejecutado en 7.7B

No se creó `public_html/habitos`. No se subió `dist/`. No se modificó
Codgoli. No se tocó `public_html/index.html`. No se tocó
`public_html/.git`. No se tocó `public_html/README.md`. No se tocó
`public_html/.htaccess`. No se modificó DNS. No se modificó SSL. No se
compró dominio. No se creó subdominio. No se modificó Supabase
Production. No se modificó Auth. No se crearon usuarios/datos en
Production. No se ejecutó `db push`. No se hizo `git add`, `commit` ni
`push`.

---

## 7.7C — Hostinger First Deploy (BLOCKED por herramienta — requiere ejecución manual del Product Owner)

**Fecha:** 2026-08-10. **Rol:** Principal DevOps Engineer / Senior
Hostinger Deployment Engineer / Frontend Release Engineer / Production
QA Engineer. **Alcance:** ejecutar el primer deploy real de Habit
Tracker a `public_html/habitos/`. **Resultado: BLOQUEADO en el paso de
escritura en Hostinger** — este entorno no tiene ninguna herramienta
que pueda crear carpetas o subir archivos al hosting (sin FTP, sin
SFTP, sin API de Hostinger, sin automatización de navegador), y está
explícitamente prohibido solicitar credenciales (contraseña, 2FA, FTP/
SSH password, tokens) para intentar sortear esa limitación. **Cero
escritura ejecutada en Hostinger. Cero escritura ejecutada en Supabase
Production.**

### Lo que sí se pudo hacer desde este entorno (sin acceso a Hostinger)

1. **Baseline pública de Codgoli** (verificación HTTP directa, no
   requiere el panel de Hostinger):
   ```
   https://codgoli.com/          → 200
   https://codgoli.com/habitos/  → 404
   ```
   El `404` en `/habitos/` **corrobora de forma independiente** (por
   una vía distinta a la inspección visual del File Manager) lo ya
   reportado manualmente por el Product Owner en 7.7B: la ruta no
   existe todavía.
2. **Reconfirmación read-only de Supabase Production:** identidad
   (`xgasncrztfwotjlghlfg`), `list_migrations` → **15/15**, `COUNT(*)`
   sobre las 7 tablas de aplicación + `auth.users` → **0 en todas**,
   sin cambios desde 7.7B.
3. **Reconfirmación del build candidato:** `dist/` (generado en 7.7B,
   sin regenerar porque `src/main.tsx`/`public/.htaccess`/
   `.env.production.local` no cambiaron) sigue con
   `dist/index.html` referenciando `/habitos/assets/...` correctamente.
4. **Paquete de upload preparado:** se generó un ZIP
   (`habitos-deploy.zip`, ~633 KB) con el **contenido plano** de
   `dist/` (sin carpeta `dist` contenedora) — verificado entrada por
   entrada: `index.html`, `.htaccess`, `favicon.svg`, `icons.svg`,
   `assets/index-*.js`, `assets/StatusDonut3D-*.js`,
   `assets/index-*.css`. Extraerlo directamente dentro de
   `public_html/habitos/` produce la estructura correcta sin pasos
   adicionales. El ZIP vive únicamente en el disco local de esta
   sesión (misma máquina donde corre este entorno) — nunca se subió a
   ningún sitio ni se compartió por ningún canal.

### Por qué esto es un bloqueo de herramienta, no de decisión

El encargo autoriza explícitamente "crear `public_html/habitos/`" y
"subir el contenido de `dist/`", pero ambas acciones requieren
interactuar con el File Manager (o FTP/SFTP) de Hostinger — una
interfaz web/protocolo al que este entorno no tiene ningún tipo de
acceso programático. No existe una herramienta de automatización de
navegador, cliente FTP/SFTP, ni API de Hostinger disponible aquí. Pedir
las credenciales para improvisar un acceso está explícitamente
prohibido por el propio encargo. La única vía correcta es que el
Product Owner ejecute la subida manualmente — exactamente como ya hizo
con `supabase login` en 7.5A, un patrón ya establecido en este
proyecto para pasos que requieren su sesión/credenciales directas.

### Instrucciones exactas para el Product Owner

1. En hPanel de Hostinger → **codgoli.com** → **File Manager**, navega
   a `public_html/`.
2. **Precheck inmediato** (antes de crear nada): confirma visualmente
   que siguen presentes `index.html`, `.git/`, `README.md`, y que
   `habitos/` **sigue sin existir**. Si por cualquier motivo ya
   existiera `public_html/habitos/`, **no la toques** — avísame y me
   detengo a inspeccionar antes de continuar.
3. Crea la carpeta `habitos` dentro de `public_html/` (NO dentro de
   ninguna otra carpeta).
4. Sube el archivo `habitos-deploy.zip` (ruta local:
   `C:\Users\iscli\AppData\Local\Temp\claude\d--Documentos-Proyecto-Web-Habitos\04bcc37f-8f4f-4dc0-83d9-5adcaa3033a8\scratchpad\habitos-deploy.zip`)
   **dentro** de `public_html/habitos/` (no en `public_html/` raíz).
5. Usa la opción "Extraer" (Extract) del File Manager sobre ese ZIP,
   **dentro de esa misma carpeta `habitos/`**.
6. Confirma que el resultado quedó así (sin subcarpeta `dist` ni
   ninguna carpeta extra):
   ```
   public_html/habitos/index.html
   public_html/habitos/.htaccess
   public_html/habitos/favicon.svg
   public_html/habitos/icons.svg
   public_html/habitos/assets/  (con los 3 archivos JS/CSS)
   ```
7. **Borra únicamente** el archivo `habitos-deploy.zip` ya extraído
   dentro de `public_html/habitos/` (limpieza, no afecta nada más).
8. Avísame cuando esto esté hecho — yo continúo desde ahí con la
   verificación (HTTP, deep links, assets, Network hacia Supabase,
   regresión de Codgoli), que sí puedo hacer de forma remota sin
   acceso al panel.

**No necesito que me confirmes contraseña, 2FA, FTP, SSH ni ningún
token — solo que me digas cuándo el ZIP ya fue extraído dentro de
`public_html/habitos/`.**

### Verificación pendiente (a ejecutar en cuanto se confirme el upload)

Una vez subido, puedo verificar remotamente sin necesitar acceso al
panel: `https://codgoli.com/habitos/` (HTTP esperado), deep links
(`/habitos/checklist`, `/habitos/habits`, etc.), assets bajo
`/habitos/assets/...`, ausencia de 404 en JS/CSS, y reconfirmar que
`https://codgoli.com/` sigue respondiendo igual que en el baseline de
esta sección. La verificación de consola del navegador interactiva
seguirá `LIMITED` por la misma razón ya documentada en bloques
anteriores (sin herramienta de navegador en este entorno).

### HOSTINGER FIRST DEPLOY CHECKPOINT (parcial — bloqueado antes de escribir)

```
Site:                          https://codgoli.com
Habit Tracker:                 https://codgoli.com/habitos/

Document root:                 public_html
Target path:                   public_html/habitos/

Target created:                NO — requiere acción manual del Product Owner
Files uploaded:                NO — requiere acción manual del Product Owner

Codgoli baseline (pre-upload):
  https://codgoli.com/           200
  https://codgoli.com/habitos/   404 (confirma que /habitos aún no existe)

Upload package prepared:       YES (habitos-deploy.zip, contenido plano
                                verificado, sin carpeta dist contenedora)

Supabase Project Ref:          xgasncrztfwotjlghlfg
Production migrations:         15/15
Production application rows:   0
Production auth users:         0
Production writes during 7.7C: 0

Codgoli root files modified:   0

FRONTEND DEPLOYMENT STATUS:    NOT READY — BLOCKED (herramienta), no
                                por ningún hallazgo del build/esquema/
                                seguridad, que siguen en verde
```

### Veredicto

**7.7C — NOT COMPLETED.** No es `DEPLOYMENT PAUSED FOR FIX` (no hay
ningún defecto que corregir) ni `ROLLBACK EXECUTED` (no se escribió
nada que revertir) — es un bloqueo puro de herramienta: falta la
ejecución manual de 3 pasos en el File Manager de Hostinger que este
entorno no puede realizar por sí mismo. Todo el trabajo preparatorio
(auditoría, build, empaquetado, baseline) está completo y verificado.

### Próximo paso

Retomar en la misma sesión en cuanto el Product Owner confirme que
extrajo `habitos-deploy.zip` dentro de `public_html/habitos/` — no
requiere reiniciar la auditoría, solo continuar con la verificación
post-upload ya diseñada (sección 12-19 del encargo original de 7.7C).

### Confirmación expresa — no ejecutado en 7.7C

No se modificó `public_html/index.html`. No se modificó
`public_html/.git`. No se modificó `public_html/README.md`. No se
modificó ningún `.htaccess` raíz. No se cambió DNS. No se cambió SSL.
No se compró dominio. No se creó subdominio. No se modificó el schema
de Supabase. No se ejecutó `db push`. No se modificó Auth. No se
crearon usuarios. No se creó `public_html/habitos/`. No se subió
ningún archivo a Hostinger. No se hizo `git add`, `commit` ni `push`.

---

## 7.7C (continuación) — Verificación post-upload

**Fecha:** 2026-08-10 (misma sesión). El Product Owner completó
manualmente la extracción de `habitos-deploy.zip` dentro de
`public_html/habitos/` y confirmó: estructura final correcta
(`index.html`, `.htaccess`, `favicon.svg`, `icons.svg`, `assets/`),
ZIP y carpeta temporal eliminados, `https://codgoli.com/habitos/`
carga, `/habitos/checklist` redirige a `/habitos/login` sin sesión,
`https://codgoli.com` intacto. Esta continuación **reverifica todo de
forma independiente** desde este entorno (HTTP directo + Supabase
read-only), sin repetir el upload ni tocar nada remoto.

### 1. HTTP principal `/habitos/`

```
GET https://codgoli.com/habitos/ → 200
```

`index.html` servido coincide exactamente con el auditado en 7.7B:
`<script src="/habitos/assets/index-BC4a38c2.js">`,
`<link href="/habitos/assets/index-Bjfy3oN5.css">`,
`<link rel="icon" href="/habitos/favicon.svg">`. **PASSED.**

### 2-3. Deep links y refresh

```
/habitos/checklist   → 200
/habitos/habits      → 200
/habitos/goals       → 200
/habitos/history     → 200
/habitos/statistics  → 200
/habitos/settings    → 200
/habitos/login       → 200
```

**7/7 PASSED.** Cada deep link sirve el mismo shell SPA
(`<title>Habit Tracker</title>` confirmado en el body de respuesta) —
esta es la **primera prueba real contra el servidor Apache/LiteSpeed
de Hostinger** (a diferencia de `vite preview` en 7.7A/7.7B, que solo
aproximaba el comportamiento). El `.htaccess` real de Hostinger
**funciona correctamente**. "Refresh" es funcionalmente idéntico a
esta prueba (servidor de archivos estático sin estado de sesión) —
**PASSED** por la misma evidencia.

### 4. Assets

```
/habitos/assets/index-BC4a38c2.js        → 200, application/x-javascript
/habitos/assets/index-Bjfy3oN5.css       → 200, text/css
/habitos/assets/StatusDonut3D-BtWdIyxr.js → 200, application/x-javascript (chunk lazy)
/habitos/favicon.svg                      → 200
/habitos/icons.svg                        → 200
```

**PASSED**, contenido real de JS/CSS confirmado (no HTML). **Byte a
byte idéntico** al `dist/` auditado localmente en 7.7B/7.7C
(`diff` sin diferencias) — **cero corrupción o alteración durante la
subida/extracción.**

**Observación menor (no bloqueante):** una ruta de asset inexistente
(`/habitos/assets/does-not-exist.js`) devuelve `200` con el shell SPA
en vez de `404` — es el efecto esperado del patrón de fallback
`RewriteCond %{REQUEST_FILENAME} !-f` aplicado globalmente dentro de
`/habitos/`, el mismo patrón estándar usado en la gran mayoría de
despliegues SPA con `.htaccess`. No es un problema de seguridad ni
afecta a ningún asset real (los 5 assets reales verificados arriba
cargan correctamente) — se documenta como comportamiento conocido, no
como bug.

### 5. `.htaccess`

```
GET https://codgoli.com/habitos/.htaccess → 403
```

**Correcto y esperado** — es el comportamiento de seguridad por
defecto de Apache/LiteSpeed (bloquea el acceso HTTP directo a
dotfiles), no algo que configuramos nosotros. El `403` (en vez de
`404`) **confirma indirectamente que el archivo existe** y está siendo
procesado por el servidor (ya demostrado de forma directa por el
funcionamiento de los deep links). **PASSED.**

### 6-7. Project Ref Supabase y Network destinations

Se descargó el bundle JS real servido desde
`https://codgoli.com/habitos/assets/index-BC4a38c2.js` y se auditó de
la misma forma que en 7.7B:

- `xgasncrztfwotjlghlfg.supabase.co`: **1 coincidencia** — único target.
- Barrido de `*.supabase.co`: **ningún otro proyecto referenciado.**
- `127.0.0.1`/`localhost`: 4 coincidencias, **las mismas constantes
  internas de `@supabase/supabase-js`** ya documentadas repetidamente
  (fallback de librería, no de nuestra config).
- Secretos (`service_role`, `SUPABASE_SERVICE_ROLE_KEY`, `DB_PASSWORD`,
  `DATABASE_URL`, `postgresql://`, `JWT_SECRET`): **cero coincidencias
  reales.**

**PASSED.** El frontend desplegado se conectará exclusivamente a
`xgasncrztfwotjlghlfg.supabase.co` — confirmado por el propio bundle en
producción, no solo por el bundle local pre-upload.

### 8. Consola

**LIMITED** — sin herramienta de automatización de navegador en este
entorno, no se pudo inspeccionar la consola del navegador en vivo. Se
declara explícitamente como limitación, no como "Passed" sin evidencia.

### 9. ProtectedRoute

El propio Product Owner reportó, desde su navegador real:
`https://codgoli.com/habitos/checklist` → redirige correctamente a
`/habitos/login` sin sesión. Esto **coincide exactamente** con la
lógica ya auditada en el código fuente en bloques anteriores
(`src/routes/ProtectedRoute.tsx`: `<Navigate to="/login" replace />`
cuando no hay sesión, resuelto por el `basename` a `/habitos/login`) —
y el bundle desplegado es **byte-idéntico** al bundle local ya
auditado, por lo que no hay ninguna vía en la que el comportamiento
pudiera diferir. **PASSED**, confirmado por observación directa del
Product Owner + verificación cruzada contra el código fuente ya
auditado (no una afirmación inventada).

### 10-12. Supabase Production — re-check

```
list_migrations → 15/15 (idéntico a antes del upload)
COUNT(*) profiles/categories/habits/habit_categories/habit_logs/goals/habit_schedules → 0 en todas
COUNT(*) auth.users → 0
```

**El deploy del frontend no creó ningún dato ni usuario** — como se
esperaba, subir archivos estáticos a Hostinger no interactúa con
Supabase de ninguna forma. **PASSED.**

### 13. Codgoli root — regresión

```
GET https://codgoli.com/ → 200
```

Contenido servido: `<title>CodGoli — Próximamente</title>` —
completamente distinto e independiente del de Habit Tracker,
confirmando que son dos aplicaciones separadas sirviéndose
correctamente desde la misma raíz de dominio. **Sin redirección hacia
`/habitos`** (verificado siguiendo redirecciones con `curl -L`, la URL
final sigue siendo `https://codgoli.com/`). `public_html/index.html`,
`.git/`, `README.md`: confirmados presentes según el propio reporte
manual del Product Owner, consistente con la respuesta HTTP obtenida.
**PASSED.**

### Matriz final de verificación

| # | Verificación | Resultado |
|---|---|---|
| 1 | HTTP principal `/habitos/` | PASSED (200) |
| 2 | Deep links (7/7) | PASSED |
| 3 | Refresh | PASSED (misma evidencia que deep links) |
| 4 | Assets | PASSED (byte-idéntico al `dist/` auditado) |
| 5 | `.htaccess` | PASSED (403 esperado, confirma presencia) |
| 6 | Project Ref Supabase | PASSED (único: `xgasncrztfwotjlghlfg`) |
| 7 | Network destinations | PASSED (sin refs inesperadas) |
| 8 | Consola | LIMITED (sin herramienta de navegador) |
| 9 | ProtectedRoute | PASSED (observación del PO + código ya auditado) |
| 10 | Supabase migrations | PASSED (15/15) |
| 11 | Application rows | PASSED (0) |
| 12 | auth.users | PASSED (0) |
| 13 | Codgoli root intacto | PASSED |

### HOSTINGER FIRST DEPLOY CHECKPOINT (final)

```
Site:                           https://codgoli.com
Habit Tracker:                  https://codgoli.com/habitos/

Document root:                  public_html
Target path:                    public_html/habitos/

Target created:                 YES
Files uploaded:                 YES

index.html:                     YES
assets:                         YES
.htaccess:                      YES
Nested dist folder:             NO

/habitos:                       200

Deep links:                     7/7 PASSED
Direct refresh:                 PASSED

Assets under /habitos:          YES
Asset 404s (assets reales):     0

Supabase Project Ref:           xgasncrztfwotjlghlfg
Unexpected Supabase refs:       0

Production writes:              0
Production application rows:    0
Production auth users:          0

Codgoli root:                   PASSED
Codgoli HTTPS:                  PASSED
Codgoli root files modified:    0

Console:                        LIMITED (sin herramienta de navegador)
ProtectedRoute:                 PASSED (confirmado por el Product Owner + código ya auditado)

Rollback executed:              NO (no fue necesario)

FRONTEND DEPLOYMENT STATUS:     READY
```

### Veredicto

**7.7C — COMPLETED. FRONTEND DEPLOYED.**

Habit Tracker está en producción en `https://codgoli.com/habitos/`,
verificado de forma independiente desde este entorno (HTTP directo +
Supabase read-only), byte-idéntico al build auditado, sin haber creado
ningún dato ni usuario, y sin ningún impacto sobre el sitio Codgoli
existente.

### Próximo bloque recomendado

**7.8 — Production Auth / Site URL / Redirect Configuration** — ahora
que la URL real (`https://codgoli.com/habitos/`) está confirmada y en
producción, corresponde configurar Site URL/Redirect URLs de Supabase
Auth. Bloque separado, con autorización explícita nueva.

### Confirmación expresa — no ejecutado en esta continuación

No se repitió el upload. No se modificó Hostinger. No se modificaron
archivos remotos. No se configuró Auth. No se crearon usuarios. No se
ejecutó `db push`. No se modificó el schema de Supabase. No se tocó
`public_html/index.html`, `.git`, `README.md` ni ningún `.htaccess`
raíz. No se hizo `git add`, `commit` ni `push`.

---

## 7.8 — Production Auth Configuration (BLOCKED por herramienta — requiere ejecución manual del Product Owner)

**Fecha:** 2026-08-10. **Rol:** Principal Identity Engineer / Senior
Supabase Auth Engineer / Frontend Release Engineer / Security Reviewer
/ Production QA Engineer. **Alcance:** configurar Supabase Auth
Production para `https://codgoli.com/habitos/` y validar el flujo
completo con el primer usuario real. **Resultado: BLOQUEADO** — este
entorno no tiene ninguna herramienta para leer/escribir la
configuración de Auth en el Dashboard de Supabase (no existe un tool
MCP para `Authentication > URL Configuration` ni `Authentication >
Providers`), y tampoco tiene navegador para ejecutar el signup/login/
logout real. **Cero cambios ejecutados en Auth. Cero usuarios creados.**

### Baseline confirmado (lo que sí se pudo hacer)

- Git: `main`, sin ahead/behind, `HEAD` = `e452fef`, sin cambios
  funcionales inesperados.
- Frontend Production accesible: `https://codgoli.com/habitos/` → 200,
  `https://codgoli.com/habitos/login` → 200.
- Identidad Supabase confirmada: `xgasncrztfwotjlghlfg.supabase.co` —
  coincide exactamente, sin ambigüedad.

### Auditoría de código — flujos Auth reales usados por la app

Lectura completa de `src/services/auth.service.ts` y barrido de
`redirectTo`/`emailRedirectTo`/`resetPasswordForEmail`/
`signInWithOAuth`/`signInWithOtp`/`signUp`/`signInWithPassword` en todo
`src/`:

- **`signUp(email, password, name)`:** sin `redirectTo`. `name` viaja
  en `options.data`, leído por el trigger `handle_new_user()` para
  crear `public.profiles` automáticamente. `requiresEmailConfirmation`
  se deriva de `data.session === null` — es decir, el propio código ya
  está preparado para ambos casos (confirmación activada o
  desactivada), sin asumir ninguno.
- **`signIn(email, password)`:** `signInWithPassword` estándar, sin
  redirect.
- **`signOut()`:** estándar.
- **`resetPassword(email)`:** llama a `resetPasswordForEmail(email)`
  **sin `redirectTo` explícito** — el comentario del propio código lo
  confirma deliberado: *"todavía no existe una pantalla de 'nueva
  contraseña'... Supabase usará `site_url`... mientras tanto"*. Esto
  significa que **Site URL es el único valor crítico** para este flujo
  hoy; no se requiere ninguna Redirect URL adicional con path
  específico porque no hay pantalla que la consuma.
- **`signInWithOAuth`/`signInWithOtp`:** **cero referencias en todo el
  proyecto** — confirmado, no hay ningún flujo OAuth ni passwordless
  implementado. No hay nada que configurar en ese sentido.

**Conclusión de la auditoría de código:** el único requisito real de
URL Configuration para esta V1 es **Site URL = `https://codgoli.com/habitos/`**,
con esa misma URL también en la lista de Redirect URLs (match exacto,
sin wildcard) porque `resetPasswordForEmail` sin `redirectTo` depende
de ella. No hay flujos que requieran una allow-list más amplia.

### Consulta a documentación oficial de Supabase (read-only, `search_docs`)

Se confirmó que Supabase **sí soporta wildcards** (`*`, `**`, etc.) en
Redirect URLs, pero la propia documentación oficial recomienda
explícitamente: *"While the globstar (`**`) is useful for local
development and preview URLs, we recommend setting the exact redirect
URL path for your site URL in production."* — coincide exactamente con
la instrucción de esta tarea de evitar allow-lists excesivamente
abiertas. **Decisión: URL exacta, sin wildcard**
(`https://codgoli.com/habitos/`), no `https://codgoli.com/habitos/**`.

### Redirect local — decisión

El proyecto Production (`xgasncrztfwotjlghlfg`) es un proyecto Supabase
completamente separado de Supabase Local (que tiene su propio
`site_url = http://127.0.0.1:5173` en `supabase/config.toml`, sin
relación con Production). **No se debe agregar ninguna URL
`localhost`/`127.0.0.1` a las Redirect URLs de Production** — ambos
entornos están y deben permanecer completamente aislados. Documentado,
no ejecutado (no se tocó Auth).

### Por qué esto es un bloqueo de herramienta

No existe en este entorno ninguna herramienta MCP ni de otro tipo para
leer o escribir `Authentication > URL Configuration` ni
`Authentication > Providers > Email` del Dashboard de Supabase — a
diferencia de la base de datos (donde sí existe `execute_sql`/
`list_migrations`/etc.), la configuración de Auth vive en la capa de
plataforma/Management API, no expuesta por ninguna herramienta
disponible aquí. Tampoco existe navegador para ejecutar el signup real
ni observar sesión/consola. Ambas limitaciones ya fueron documentadas
repetidamente en bloques anteriores (7.2A, 7.4A inicial, 7.6, 7.7A,
7.7C) — este bloque las combina porque casi todo su contenido depende
de una de las dos.

### Qué debe hacer el Product Owner — Dashboard (sin compartir nada sensible)

En el Dashboard de Supabase → proyecto `habit-tracker` →
**Authentication → URL Configuration**:

1. Anota (repórtame) el **Site URL actual** y la lista actual de
   **Redirect URLs** — esto es información no sensible, solo para
   dejar constancia del baseline antes de cambiar algo.
2. Cambia **Site URL** a exactamente: `https://codgoli.com/habitos/`
3. Agrega (si no está ya) a **Redirect URLs**: exactamente
   `https://codgoli.com/habitos/` (mismo valor, sin wildcard, sin
   `localhost`).
4. Guarda.

En **Authentication → Providers → Email**:

5. Confirma (repórtame) el estado actual de: **Email provider
   enabled**, **Allow new users to sign up**, **Confirm email**.
6. Asegúrate de que **Email provider** esté habilitado y **Allow new
   users to sign up** esté habilitado (no debería requerir cambio si
   ya funcionaba en local/QA con el mismo proveedor).
7. Cambia **Confirm email** a **desactivado** (si no lo está ya).
8. Guarda.

**No toques** ningún proveedor OAuth, no actives SMTP personalizado, no
cambies la política de contraseñas.

### Qué debe hacer el Product Owner — flujo real (sin compartir credenciales)

En `https://codgoli.com/habitos/login`, usando tu propio navegador:

9. Cambia a modo "crear cuenta", regístrate con un email/password de
   tu elección (no me los compartas). Repórtame solo:
   **SIGNUP COMPLETED = YES/NO**.
10. ¿Quedaste con sesión iniciada automáticamente tras el signup (sin
    tener que confirmar email)? YES/NO.
11. Refresca la página completa — ¿sigues con sesión iniciada? YES/NO.
12. Usa el control real "Cerrar sesión" del `TopHeader` (no el control
    decorativo de Configuración) — ¿te redirigió a `/habitos/login` y
    ya no puedes ver contenido protegido? YES/NO.
13. Vuelve a iniciar sesión con el mismo usuario desde
    `/habitos/login` — ¿funciona? YES/NO.
14. Con sesión activa, escribe directamente en la barra de direcciones
    `https://codgoli.com/habitos/checklist` y presiona refresh —
    ¿carga la página (sin redirigir a login)? YES/NO.
15. Cierra sesión de nuevo y repite el paso 14 — ¿esta vez te redirige
    a `/habitos/login`? YES/NO.
16. Si tienes a mano las herramientas de desarrollador (F12 → pestaña
    Console) durante estos pasos, dime si viste algún error en rojo
    relacionado con Auth/Supabase. Si no las revisaste, no pasa nada —
    dime que no la revisaste.
17. Confirma que `https://codgoli.com/` (Codgoli) sigue cargando con
    normalidad.

Con esas respuestas, yo continúo con la verificación read-only del
lado de base de datos (Supabase Production: `auth.users`, `profiles`,
trigger, RLS estructural) y compilo el checkpoint final — no necesito
que me compartas contraseñas, tokens, JWT, ni capturas de sesión.

### Riesgos / observaciones

- Ambos bloqueos (Dashboard, navegador) son de herramienta, no de
  decisión — el diseño de Site URL/Redirect URLs ya está resuelto por
  la auditoría de código, solo falta aplicarlo.
- Password reset UI no está implementada todavía (confirmado por
  lectura de `auth.service.ts` y `LoginPage.tsx` — sin pantalla de
  "nueva contraseña") — se documenta como `OUT OF SCOPE` para esta
  verificación, no como un fallo.
- El SMTP por defecto de Supabase seguirá siendo el que envíe el correo
  de reset password si algún usuario lo solicita — aceptable para V1,
  ya evaluado en 7.3.

### Estado

**7.8 — NOT COMPLETED (bloqueado, esperando intervención del Product
Owner).** No se ha declarado `BLOCKED` en el sentido de un fallo — es
un bloqueo puro de herramienta idéntico en naturaleza al de 7.7C,
resuelto entonces con la misma intervención manual mínima y precisa.

### Confirmación expresa — no ejecutado en esta sesión

No se modificó Site URL. No se modificaron Redirect URLs. No se cambió
Confirm Email. No se modificó ningún proveedor. No se configuró OAuth.
No se configuró SMTP. No se creó ningún usuario (ni por UI, ni por SQL,
ni por Admin API, ni con `service_role`). No se modificó schema. No se
ejecutó `db push`. No se modificó RLS/policies/grants/triggers/
functions. No se tocó Hostinger. No se modificó DNS/SSL. No se hizo
`git add`, `commit` ni `push`.

---

## 7.8 (cierre) — Verificación read-only post-configuración

**Fecha:** 2026-08-10 (misma sesión). El Product Owner completó
manualmente la configuración de Auth (Site URL, Redirect URL, Confirm
Email) y el flujo completo de signup/login/logout/deep-links
directamente en `https://codgoli.com/habitos/`, reportando todos los
resultados como `PASSED`/`YES`. Esta sección reverifica de forma
independiente, exclusivamente read-only, el estado resultante en
Supabase Production.

### 1-3. `auth.users` / `profiles` / UUID compartido

```sql
select
  (select count(*) from auth.users) as auth_users_count,      -- 1
  (select count(*) from public.profiles) as profiles_count,   -- 1
  (select count(*) from auth.users u
     join public.profiles p on p.id = u.id) as matched_uuid_count; -- 1
```

**`auth.users = 1`, `profiles = 1`, `matched_uuid_count = 1`.** El
trigger `on_auth_user_created` → `handle_new_user()` funcionó
correctamente en Production con un usuario real — el `id` de
`profiles` coincide exactamente con el `id` de `auth.users`. **PASSED.**

### 4. Ausencia de filas inesperadas

```
categories:        0
habits:             0
habit_categories:   0
habit_schedules:    0
habit_logs:         0
goals:              0
```

**Ningún dato de dominio fue creado** — solo el perfil automático del
trigger, exactamente lo esperado de un signup sin interacción
adicional con la app. **PASSED.**

### 5-6. Migration history / identidad

`list_migrations` → **15/15**, idéntico a 7.5B/7.7C, sin cambios.
`get_project_url` → `https://xgasncrztfwotjlghlfg.supabase.co` —
identidad reconfirmada, sin ambigüedad. **PASSED.**

### 7-8. RLS / policies / grants / functions / triggers — sin cambios

| Objeto | Valor | Baseline (7.5B/7.7C) | Resultado |
|---|---|---|---|
| Tablas con RLS habilitada | 7 | 7 | MATCH |
| Policies | 19 | 19 | MATCH |
| Constraints | 36 | 36 | MATCH |
| Triggers | 20 | 20 | MATCH |
| Functions (`public`) | 25 (24 propias + 1 de plataforma) | 25 | MATCH |

**Cero cambios de schema/RLS/policies/grants/functions/triggers** — la
configuración de Auth en el Dashboard (Site URL/Redirect
URLs/Confirm Email) es una capa de plataforma completamente separada
de la base de datos, y así se confirma estructuralmente.

**Verificación en vivo adicional:** con la Publishable Key pública,
`GET /rest/v1/profiles?select=id&limit=1` →
```
401 {"code":"42501","message":"permission denied for table profiles"}
```
**`anon` sigue sin poder leer `profiles`, incluso ahora que existe una
fila real** — confirma que RLS/grants protegen correctamente los datos
del primer usuario real de producción. **PASSED.**

### 9. Validación técnica local

`npx tsc --noEmit`: **Passed.** `npm run lint`: **Passed.**
`npm run build`: **Passed** (mismo warning de chunk-size, no
bloqueante; build de validación estándar, sin `--base`, no es un nuevo
candidato de deploy — `dist/` eliminado tras la verificación, no se
regeneró ni se subió nada). `npm audit`: **0 vulnerabilidades.**

### PRODUCTION AUTH CHECKPOINT (final)

```
Project:                        habit-tracker
Project Ref:                    xgasncrztfwotjlghlfg

Frontend:                       https://codgoli.com/habitos/
Site URL:                       https://codgoli.com/habitos/
Redirect URLs:                  VALID (https://codgoli.com/habitos/, exacta, sin wildcard)

Email Provider:                 ENABLED
Signup:                         ENABLED
Confirm Email:                  DISABLED
Custom SMTP:                    NOT CONFIGURED

First Production signup:        PASSED
auth.users:                     1
profiles:                       1
Profile trigger:                PASSED
Shared auth/profile UUID:       YES

Initial session:                PASSED
Session persistence:            PASSED
Logout:                         PASSED
Login:                          PASSED
ProtectedRoute:                 PASSED
Deep link authenticated:        PASSED
Deep link logged out:           PASSED

Supabase Project Ref observed:  xgasncrztfwotjlghlfg
Unexpected Supabase refs:       0
Application domain rows:        0 (categories/habits/habit_categories/
                                 habit_schedules/habit_logs/goals)

RLS:                            MATCH (7/7)
Policies:                       MATCH (19)
Constraints:                    MATCH (36)
Triggers:                       MATCH (20)
Functions:                      MATCH (25)
anon access to profiles:        DENIED (401, correcto)

Email confirmation:             DISABLED AND VERIFIED
Password reset:                 OUT OF SCOPE (UI no implementada)

Codgoli regression:             PASSED (confirmado por el Product Owner)

TypeScript:                     PASSED
Lint:                           PASSED
Build:                          PASSED
npm audit:                      0 vulnerabilidades

AUTH PRODUCTION STATUS:         READY
```

### Veredicto

**7.8 = COMPLETED.** Todos los criterios de la sección 36 del encargo
original se cumplen: Site URL correcta, Redirect URLs seguras (exacta,
sin wildcard, sin dominios de terceros), Email Provider y Signup
habilitados, Confirm Email desactivado y verificado, primer signup
real exitoso, `auth.users = 1`, `profiles = 1`, UUID compartido,
sesión/persistencia/logout/login/ProtectedRoute/deep-links en verde
(reportados por el Product Owner desde su propio navegador — el único
recurso que este entorno no tiene), Network apuntando exclusivamente a
`xgasncrztfwotjlghlfg`, schema en 15/15 sin cambios, cero datos
inesperados, Codgoli intacto, validación técnica local en verde.

### Próximo bloque recomendado

**7.9 — Post-Deployment Smoke** (checklist completo: categorías,
hábitos, checklist, metas, historial, estadísticas, dashboard,
aislamiento RLS con un segundo usuario, responsive) — bloque separado,
con autorización explícita nueva.

### Confirmación expresa — cierre de 7.8

No se modificó Auth nuevamente (solo lecturas read-only). No se
crearon más usuarios. No se crearon datos de dominio. No se ejecutó
`db push`. No se modificó schema/RLS/policies/grants/triggers/
functions (confirmado sin cambios, no solo "no tocado"). No se tocó
Hostinger. No se hizo `git add`, `commit` ni `push`.

## 7.9A — Production Smoke Bug Fixes

Sesión separada de QA (no Deployment), handoff formal en
`Contexto/04_QA/01_PRODUCTION_SMOKE_CONTEXT.md`. Corrección **local** de
los 8 `BUG-PROD-00X` confirmados en el Production Smoke (7.9). Detalle
completo (causa raíz, archivos, test, riesgo por bug) en
`Contexto/04_QA/02_REGRESSION_CONTEXT.md` — resumen aquí:

- **BUG-PROD-005** (prioridad máxima, reclasificado): el backend
  (`compute_goal_habit_logs_progress()`) resultó estar correcto por
  diseño (D-05, suma de `habit_logs.value`, confirmado por reproducción
  directa contra Supabase Local) — **no era un bug de backend**. El
  defecto real era frontend: `goals.unit` era texto libre sin relación
  con la unidad real sumada. Fix: `GoalFormModal.tsx` deriva la unidad
  automáticamente del hábito vinculado. Cero cambios en SQL/migraciones.
- **BUG-PROD-008**: `GoalFormModal.tsx` dejaba el selector de hábito
  `disabled` siempre que la meta ya estuviera vinculada, sin importar si
  existían alternativas compatibles. Fix: disabled solo si no hay
  ninguna alternativa; lista de opciones filtrada a compatibles.
- **BUG-PROD-004**: `TODAY` (`data/referenceDate.ts`, literal fijo
  `"2026-07-21"` para anclar mocks) se usaba como default de fecha de
  inicio en `HabitFormModal`/`GoalFormModal` incluso en modo Supabase.
  Fix: nueva `getFormDefaultDate()`, mismo patrón ya usado en
  `DailyChecklistPage.tsx` (fecha real en Supabase, `TODAY` en mock).
- **BUG-PROD-006**: `HabitsPage.tsx`/`HabitCard.tsx` calculaban
  racha/cumplimiento/sesiones vía `utils/streaks.ts`/`habitStats.ts`/
  `recentCompletion.ts`, que leen siempre `mockHabitLogs.ts` sin rama por
  fuente de datos — brecha ya documentada como fuera de alcance en un
  bloque anterior (`useStatistics.ts`), confirmada como bug real por el
  Smoke. Fix: `HabitsPage.tsx` reutiliza `useStatistics()` (misma fuente
  que Dashboard/Estadísticas) para modo Supabase; modo mock sin cambios.
- **BUG-PROD-007**: `goal.status` (logro) y `goal.lifecycleStatus`
  (ciclo de vida) son ejes independientes por diseño documentado — el
  badge "Activa" (logro) se mostraba siempre junto a "Pausada"/"En
  papelera" (lifecycle), y el sub-filtro "Activas" contaba metas
  pausadas. Fix: badge de logro oculto cuando es redundante con el
  lifecycle; conteo/filtro excluyen metas no-lifecycle-activas del
  bucket "Activas".
- **BUG-PROD-002** (confianza media, sin navegador para confirmar):
  `PageTransition.tsx` usaba `AnimatePresence mode="wait"` — footgun
  conocido que puede dejar la ruta entrante sin montar hasta un remount
  forzado (F5). Fix: se quita `mode="wait"` (componente compartido, no
  específico de `SettingsPage`).
- **BUG-PROD-003**: `Toggle.tsx` (componente compartido) sin `min-w-0`
  en el bloque de texto — labels largos forzaban desborde de toda la
  fila por el `min-width:auto` por defecto de flexbox, empujando el
  switch fuera del contenedor en viewports angostos. Fix: `min-w-0`.
- **BUG-PROD-001**: `Modal.tsx` reutilizaba `.glass-surface` (60%
  opacidad), la misma clase de overlays efímeros (TopHeader/menús/
  tooltips). Fix: nueva `.glass-surface-modal` (97% opacidad, mismo
  blur/borde) solo para el componente `Modal` compartido — el resto de
  usos de `.glass-surface` no se tocó.

**Hallazgos pendientes de regla de negocio (sección 9 del handoff)**:
clasificados con evidencia de código, sin cambiar comportamiento — A/B
(meta vencida/100% sigue activa) confirmado como exclusión de alcance
deliberada y documentada en la migración de goal progress; C ("racha en
riesgo" desactualizada) no reproducible en Production tal como está
descrito (el motor de insights que genera ese mensaje solo corre en modo
mock); D (rankings con dataset disperso) confirmado como ausencia de
umbral mínimo de muestra, mecanismo identificado en `useDashboard.ts`.

**Base de datos**: 0 migraciones nuevas — los 8 bugs fueron defectos de
frontend. Local: 15/15 sin cambios (`db reset` ejecutado, verificado).
Production: 15/15 sin cambios — no se tocó Production en ningún punto de
este bloque.

**Validación técnica**: `tsc -b`, `eslint`, `vite build`, `npm audit` (0
vulnerabilidades) en verde tras cada fix y en la validación final
conjunta.

**Confirmación expresa — 7.9A**: no se modificó Supabase Production, no
se ejecutó `db push`, no se modificó Auth, no se modificó Hostinger, no
se desplegó, no se borraron datos de Smoke, no se usó `service_role`, no
se editó ninguna migración aplicada, no se hizo `git add`/`commit`/
`push`, no se instaló Playwright ni ninguna dependencia nueva.

### Próximo bloque recomendado (al cierre de 7.9A)

**7.9B — Manual Retest**: confirmación visual en navegador real de los 8
fixes (prioridad alta en BUG-PROD-002, el de menor confianza), antes de
cualquier redeployment. Detalle en
`Contexto/04_QA/02_REGRESSION_CONTEXT.md`, sección 9.

## 7.9B — Manual Retest Local

**Status: PASSED.** Los 8 `BUG-PROD-00X` confirmados en Production
Smoke fueron reprobados manualmente por el Product Owner contra el
ambiente LOCAL (Supabase Local + frontend local, `VITE_DATA_SOURCE=
supabase` apuntando a `127.0.0.1:54321`), sobre los fixes de 7.9A.
Detalle completo (evidencia manual, causa raíz, fixes) en
`Contexto/04_QA/02_REGRESSION_CONTEXT.md`, secciones 4, 11 y 12.

**8/8 confirmados con retest exitoso:**
- BUG-PROD-001 (transparencia de modales) — PASSED.
- BUG-PROD-002 (Settings SPA navigation) — PASSED.
- BUG-PROD-003 (switches desbordados) — **PASSED tras reapertura**: el
  primer retest (RETEST-07) falló porque el fix de 7.9A (`min-w-0`/
  `shrink-0`) era necesario pero insuficiente; se identificó una segunda
  causa raíz independiente (thumb sin `left-0`, dependiente de la
  posición estática implícita del navegador) y se aplicó un segundo fix
  mínimo (`Toggle.tsx`) antes de pasar.
- BUG-PROD-004 (fecha por defecto) — PASSED.
- BUG-PROD-005 (unidad de Goal Progress) — PASSED. Clarificación
  importante: el comportamiento de suma del backend
  (`compute_goal_habit_logs_progress()`) es el diseño aprobado (D-05),
  no un bug — el defecto de producto real era la inconsistencia de
  unidad que el frontend permitía; el flujo corregido mantiene la
  unidad siempre compatible con el hábito vinculado.
- BUG-PROD-006 (métricas de Mis Hábitos) — PASSED.
- BUG-PROD-007 (lifecycle de metas) — PASSED.
- BUG-PROD-008 (selector de hábito compatible) — PASSED.

**Incidentes de entorno durante 7.9B** (4, ninguno es bug de producto —
detalle en `Contexto/04_QA/02_REGRESSION_CONTEXT.md`, sección 11):
desfase UTC/hora local en `habits`/`habit_schedules` y en `goals.
start_date` durante la preparación del dataset QA (ambos corregidos
solo en el dataset LOCAL), Docker Desktop/Supabase Local detenidos tras
suspensión de la máquina (recuperado sin pérdida de datos), y estado de
`AuthContext` obsoleto tras esa caída temporal (resuelto con recarga de
página).

**Validación técnica final:** `tsc`, `eslint`, `vite build`, `npm audit`
(0 vulnerabilidades) en verde. Migraciones locales: 15/15, sin cambios,
sin migración nueva. `dist/` generado solo para validación y eliminado
después (no desplegado), según práctica ya establecida del proyecto.

**Distinción de baseline — importante:** estos 8 fixes están validados
**solo localmente**. `https://codgoli.com/habitos/` (Production)
**no ha sido redesplegado** y sigue ejecutando el build de 7.7C con los
8 bugs originales tal como se reportaron en el Production Smoke. La
redacción correcta es *"fix validado localmente, listo para
redeployment controlado"* — nunca *"bug de Production corregido"* hasta
que se despliegue y se repita el Production Smoke.

**Seguridad — confirmación expresa:** no se modificó Supabase
Production, no se ejecutó `db push`, no se modificó Auth de Production,
no se modificó Hostinger, no se desplegó, no se borraron/modificaron
datos de Smoke de Production, no se usó `service_role`, no se editó
ninguna migración aplicada, no se hizo `git add`/`commit`/`push`, no se
instaló Playwright ni ninguna dependencia nueva.

### Próximo bloque recomendado (al cierre de 7.9B)

**Redeployment controlado** de los 8 fixes hacia Production — bloque
separado con autorización explícita propia del Product Owner, siguiendo
el mismo procedimiento ya usado en 7.7B/7.7C (build auditado, subida
manual, verificación post-deploy). Tras el redeploy: repetir el
Production Smoke para confirmar los 8 fixes también en el entorno en
vivo antes de darlos por cerrados a nivel de producto. Las 4
clasificaciones de "Pending Product Rule"/"Not Confirmed" (meta vencida,
meta al 100%, consejo de IA, rankings con dataset disperso) siguen sin
resolver y no bloquean el redeployment.

## 7.10A — Controlled Redeployment Preparation

**Status: READY.** Release Candidate generado y auditado localmente.
**Sin deployment ejecutado en este bloque** — termina antes de tocar
Hostinger/Production.

### Build

Comando exacto (mismo ya documentado y verificado en 7.7A/7.7B, sin
inventar uno nuevo):
```
npx tsc --noEmit          → Passed
npm run lint               → Passed
npm audit                  → 0 vulnerabilidades
MSYS_NO_PATHCONV=1 npx vite build --base=/habitos/
```
(`MSYS_NO_PATHCONV=1` requerido en Git Bash/Windows para que `--base=/habitos/`
no sea reescrito por la conversión automática de rutas de MSYS — mismo
hallazgo ya documentado en 7.7A.) Usa `.env.production.local`
(gitignored, ya preparado desde 7.6): `VITE_SUPABASE_URL=
https://xgasncrztfwotjlghlfg.supabase.co`, Publishable Key de
Production, `VITE_DATA_SOURCE=supabase`. Build: **Passed**, mismo
warning de chunk-size ya aceptado como deuda técnica.

### Artefacto (`dist/`, 7 archivos, idéntico patrón a 7.7C)

```
dist/.htaccess                          (idéntico byte a byte a public/.htaccess — diff sin diferencias)
dist/favicon.svg
dist/icons.svg
dist/index.html                         (referencias correctas a /habitos/assets/...)
dist/assets/index-DF_UjmWg.js           (~1.22 MB, bundle principal)
dist/assets/index-guW9CQrf.css          (~49 KB)
dist/assets/StatusDonut3D-BbyOQMCK.js   (~1.00 MB, chunk lazy-loaded)
```

`index.html` verificado: `<script src="/habitos/assets/index-DF_UjmWg.js">`,
`<link href="/habitos/assets/index-guW9CQrf.css">`,
`<link rel="icon" href="/habitos/favicon.svg">` — sin rutas absolutas
incorrectas, sin `%BASE_URL%` sin resolver.

### Auditoría de seguridad del artefacto

Búsqueda exhaustiva en `dist/` de referencias Local/QA:
- `127.0.0.1` / `localhost`: aparecen únicamente dentro de
  `dist/assets/index-DF_UjmWg.js` como **código interno de librerías de
  terceros** (allowlist de dominios de `@supabase/auth-js`/`gotrue-js` —
  `t.push('localhost','127.0.0.1','[::1]')` — y el fallback SSR interno
  de `history`/`react-router` — `` `http://localhost` ``/
  `` `http://localhost:9999` `` como constantes por defecto de la
  librería) — **no provienen de nuestra configuración**, están presentes
  en cualquier build de esta app independientemente del entorno.
  Confirmado por separado que el cliente Supabase real queda
  inicializado con `https://xgasncrztfwotjlghlfg.supabase.co` (única
  coincidencia, 1 aparición) — la URL de Production correcta.
- `:54321`/`:54322` (puertos de Supabase Local): **ZERO matches.**
- `qa.local@habittracker.test`: **ZERO matches.**
- Contraseña QA local: **ZERO matches.**
- `service_role`: **ZERO matches.**

**Veredicto: sin bloqueo.** Ninguna referencia real a Local/QA quedó
embebida en el artefacto.

### Validación de rutas / deep links

Servido localmente con la misma herramienta ya usada en 7.6/7.7A/7.7B
(`vite preview --base=/habitos/`, sin instalar nada nuevo) —
`http://localhost:4173/habitos/`. Las 8 rutas reales del router
(`/`, `/login`, `/checklist`, `/habits`, `/goals`, `/history`,
`/statistics`, `/settings`, todas bajo `/habitos/`) respondieron
`200`, igual que assets JS/CSS/favicon. `dist/.htaccess` es
byte-idéntico al `public/.htaccess` fuente (`RewriteBase /habitos/`,
fallback a `index.html`) — el mecanismo real de Apache/Hostinger ya fue
validado end-to-end contra el servidor real en 7.7C (7/7 deep links);
esta comprobación local confirma que el artefacto de 7.10A no introdujo
ninguna regresión respecto a esa configuración.

### Release Delta — 7.10 Candidate

| Bug | Archivos principales | Cambio de comportamiento | Schema | Migración |
|---|---|---|---|---|
| BUG-PROD-001 | `src/index.css`, `src/components/ui/Modal.tsx` | Superficie de modal casi opaca (`.glass-surface-modal`) en vez de compartir la transparencia de overlays efímeros | NO | NO |
| BUG-PROD-002 | `src/components/ui/PageTransition.tsx` | `AnimatePresence` sin `mode="wait"` — elimina la ventana sin ningún hijo montado tras navegación SPA | NO | NO |
| BUG-PROD-003 | `src/components/ui/Toggle.tsx` | `min-w-0` (texto largo ya no desborda la fila) + `left-0` en el thumb (ancla explícita, ya no depende de la posición estática implícita del navegador) | NO | NO |
| BUG-PROD-004 | `src/data/referenceDate.ts`, `src/components/habits/HabitFormModal.tsx`, `src/components/goals/GoalFormModal.tsx` | Fecha por defecto de formularios usa la fecha real del sistema en modo Supabase (`getFormDefaultDate()`) en vez del ancla fija de los mocks | NO | NO |
| BUG-PROD-005 | `src/components/goals/GoalFormModal.tsx`, `src/pages/GoalsPage.tsx` | La "Unidad" de una meta vinculada a un hábito se deriva/bloquea desde el hábito — ya no puede quedar semánticamente incompatible | NO | NO |
| BUG-PROD-006 | `src/pages/HabitsPage.tsx`, `src/components/habits/HabitCard.tsx`, `src/utils/habitStats.ts` | Métricas de "Mis Hábitos" (racha, cumplimiento, sesiones) leen datos reales de Supabase vía `useStatistics()` en vez de datos mock siempre | NO | NO |
| BUG-PROD-007 | `src/components/goals/GoalListRow.tsx`, `src/components/goals/GoalGeneralHero.tsx`, `src/pages/GoalsPage.tsx` | El badge de logro "Activa" y los conteos "Activas" ya no incluyen metas pausadas/en papelera | NO | NO |
| BUG-PROD-008 | `src/components/goals/GoalFormModal.tsx` | El selector de hábito de una meta ya vinculada solo queda deshabilitado si no existe ninguna alternativa compatible | NO | NO |

**Ninguno de los 8 fixes requiere cambio de schema ni migración nueva**
— confirmado también por conteo de archivos: 15 migraciones en el
repositorio, sin adiciones desde el cierre de 7.5B/7.9A/7.9B. Esto
permite un **redeployment frontend-only**.

### QA environment — confirmado fuera del candidate

El Release Candidate (`dist/`) **no incluye**: credenciales/usuario QA
Local, dataset QA Local, datos de la base de datos local, artefactos de
Docker/Supabase Local, capturas de pantalla de prueba, logs temporales
ni volcados de depuración — todos esos recursos viven exclusivamente en
Supabase Local (Docker) y en el directorio de scratchpad de la sesión,
nunca en `src/`/`public/` ni en el `dist/` generado. Estos recursos NO
se limpiaron (siguen disponibles para continuar QA local si hace
falta) — solo se confirmó que no forman parte del artefacto.

### Compatibilidad con Production DB

```
Production migrations (última confirmación exhaustiva, sin cambios desde entonces): 15/15
Candidate expected migrations (conteo de archivos en el repo):        15/15
Nueva migración:            NO
db push requerido:          NO
Migración de datos:          NO
Migración de Auth:           NO
```

Ningún bloque de 7.9A/7.9B/7.10A tocó `supabase/migrations/` ni ejecutó
escritura alguna contra Production — el conteo de 15/15 no tiene motivo
para haber cambiado.

### Manifest

```
Application:              Habit Tracker
Target:                    https://codgoli.com/habitos/
Release type:               Frontend-only bugfix redeployment
Schema changes:              NO
Production DB changes:       NO
Auth changes:                 NO
Payload (contenido de dist/): .htaccess, favicon.svg, icons.svg, index.html, assets/*.js (2), assets/*.css (1) — 7 archivos, sin carpeta dist/ anidada
Deployment destination:      public_html/habitos/ (Hostinger, ya confirmado en 7.7B)
Existing Production files expected to be replaced: los 7 archivos equivalentes ya presentes en public_html/habitos/ (mismo patrón 1:1 que 7.7C)
Files that MUST remain/protection notes: public_html/index.html, public_html/.git/, public_html/README.md (raíz de Codgoli) — NUNCA tocar
SPA fallback:                .htaccess, en la raíz de public_html/habitos/ (bundleado automáticamente desde public/.htaccess)
Build command:                MSYS_NO_PATHCONV=1 npx vite build --base=/habitos/
Build timestamp:              2026-08-27 (esta sesión)
Current HEAD:                 e452fef
Working tree:                 UNCOMMITTED QA CANDIDATE
Manual Retest:                8/8 PASSED (7.9B)
```

### Recomendación de commit — pendiente de decisión del Product Owner

Esta sesión **no decide** si commitear antes del deployment — se deja
explícitamente a criterio del Product Owner. Recomendación: **SÍ**,
committear antes de desplegar — el working tree actual mezcla cambios
ya desplegados-pero-nunca-commiteados (`src/main.tsx`, `public/
.htaccess`, heredados de 7.7A) con los 8 fixes nuevos de 7.9A/7.9B; sin
un commit que capture este estado exacto, no existe ninguna versión en
el historial de Git que corresponda al artefacto que se subiría a
Hostinger, dificultando cualquier rollback o auditoría futura basada en
`git log`.

### Riesgos

| Riesgo | Nivel | Mitigación |
|---|---|---|
| Routing/basename | BAJO | Mismo patrón ya validado en 7.7A-7.7C; `basename={import.meta.env.BASE_URL}` sin cambios; 8/8 rutas 200 en preview local |
| SPA fallback | BAJO | `dist/.htaccess` byte-idéntico a la fuente; mecanismo Apache ya probado en vivo en 7.7C |
| Conectividad Supabase Production | BAJO | URL/key de Production confirmadas embebidas correctamente; sin cambios de Auth/schema en este candidate |
| Cambios frontend-only | BAJO | Los 8 fixes son UI/lógica de cliente; ninguno toca RPC/triggers/policies ya validadas |
| Caché de navegador | MEDIO | Los hashes de archivo cambian (`index-DF_UjmWg.js` etc.) forzando descarga de los nuevos assets, pero `index.html` (sin hash) puede quedar cacheado por el navegador/CDN del hosting — recomendar verificación con recarga forzada tras el deploy |
| Reemplazo parcial de archivos durante la subida | MEDIO | Mismo riesgo ya mitigado en 7.7C con subida manual completa vía File Manager; recomendar subir el conjunto completo de una vez, no archivo por archivo |
| Disponibilidad de rollback | MEDIO | Ver sección de rollback abajo — no existe backup automatizado de Hostinger, depende de una copia manual previa a la subida |

### Rollback

```
Current deployed baseline:      e452fef + cambios deployed-but-uncommitted (basename, .htaccess)
Rollback source available:       YES — el dist/ de 7.7C ya no existe localmente, pero es 100% reproducible desde el mismo HEAD (e452fef) + los mismos dos archivos heredados, con el mismo comando de build documentado
Existing Production backup:      UNKNOWN — no hay evidencia en la documentación de que exista un backup automatizado de public_html/habitos/ en Hostinger
Recommended pre-upload backup action: antes de sobrescribir, descargar/copiar manualmente el contenido actual de public_html/habitos/ (7 archivos) a una carpeta local o a un ZIP con fecha, para poder restaurarlo si el nuevo build falla en producción — acción manual del Product Owner en el File Manager de Hostinger, no ejecutada por esta sesión
```

### Próximo bloque recomendado

**7.10B — Controlled Redeployment**: subida manual del `dist/` ya
auditado a `public_html/habitos/`, con autorización explícita separada
y — recomendado — tras backup manual del contenido actual. No
autorizado por este bloque.

## 7.10B — Controlled Redeployment

**Status: PASSED.** Release `3eaa0af` desplegado a Production
(`https://codgoli.com/habitos/`) y Production Smoke confirmado
**PASSED** por el Product Owner. La parte de código (commit, rebuild,
auditoría del artefacto) se ejecutó en este entorno; el resto —
limpieza de datos de Production, backup, subida a Hostinger y todo el
Smoke post-deploy — requirió ejecución manual del Product Owner (mismo
patrón ya documentado en 7.7C y 7.8: este entorno no tiene herramienta
de acceso a Hostinger ni de navegador para interactuar con la sesión
real de Production).

### Lo que SÍ se ejecutó en este entorno (código, local, con herramientas disponibles)

**1. Release commit (autorizado explícitamente por el Product Owner):**
- Pre-release SHA: `e452fef`
- **Release SHA: `3eaa0af`**
- 24 archivos incluidos, verificados uno por uno contra `.gitignore` y
  escaneados por credenciales/rutas Local antes de `git add` — cero
  coincidencias de `qa.local@habittracker.test`, la contraseña QA local,
  `.env.local`/`.env.production.local`, `dist/`, capturas de pantalla,
  logs o volcados de depuración. Categorías incluidas: baseline
  deployed-but-uncommitted de 7.7A (`src/main.tsx`, `public/.htaccess`),
  los 12 archivos de fixes de 7.9A (incluye `Toggle.tsx`, que contiene
  además el segundo fix de BUG-PROD-003 en el mismo archivo — no se
  pudo separar en dos commits sin staging interactivo, no disponible en
  este entorno), y 10 archivos de documentación QA/Deployment.
- Mensaje de commit: Conventional Commits, detalla los 8 bugs
  corregidos, sin cambios de schema/migración. Sin `--no-verify`, sin
  bypass de firma.
- `git push`: **NO ejecutado** (prohibido explícitamente en este
  bloque). `git status -sb` confirma `main...origin/main [ahead 1]`.

**2. Rebuild desde el SHA exacto del release, re-verificado:**
```
npx tsc --noEmit                                  → Passed
npm run lint                                       → Passed
npm audit                                           → 0 vulnerabilidades
MSYS_NO_PATHCONV=1 npx vite build --base=/habitos/  → Passed
```
Hashes de contenido **idénticos** al build de 7.10A (`index-DF_UjmWg.js`,
`index-guW9CQrf.css`, `StatusDonut3D-BbyOQMCK.js`) — esperado y
correcto: el commit no cambió ningún byte de contenido fuente, solo lo
incorporó al historial de Git, confirmando que el build es
determinista/reproducible desde el árbol de trabajo commiteado.

SHA-256 del artefacto final (7 archivos, para verificación posterior si
hace falta):
```
9f4930b3...  dist/index.html
048a0a9f...  dist/.htaccess
61bc9a16...  dist/favicon.svg
b45fa506...  dist/icons.svg
0ea6ba44...  dist/assets/StatusDonut3D-BbyOQMCK.js
d5644883...  dist/assets/index-DF_UjmWg.js
0df4a97b...  dist/assets/index-guW9CQrf.css
```

**3. Re-auditoría de seguridad del artefacto post-commit:** mismo
resultado que 7.10A — `127.0.0.1`/`localhost` solo como constantes
internas de `@supabase/auth-js`/`react-router` (librerías de terceros,
no configuración propia); **ZERO** coincidencias de `:54321`/`:54322`,
credenciales QA, `service_role`. URL de Production
(`xgasncrztfwotjlghlfg.supabase.co`) confirmada embebida correctamente
(única coincidencia). `dist/.htaccess` byte-idéntico a `public/.htaccess`.
`index.html` válido, rutas `/habitos/assets/...` correctas.

**4. Verificación local de rutas:** servido con
`vite preview --base=/habitos/` (mismo build post-commit) —
`http://localhost:4173/habitos/` responde `200`.

### 7.10B-1 — Production Smoke Data Cleanup (ejecutado antes del deploy)

**Status: PASSED.** Antes de subir el nuevo frontend, el Product Owner
decidió que Production debía quedar sin datos funcionales de QA/Smoke,
preservando exclusivamente su propia cuenta.

- **Conteo pre-cleanup verificado en vivo:** `auth.users=1`,
  `profiles=1`, `categories=1`, `habits=3`, `habit_categories=3`,
  `habit_schedules=3`, `habit_logs=2`, `goals=2`.
- **Entidades verificadas como Smoke/QA** (por nombre y ownership, cero
  discrepancias de owner en `categories`/`habits`/`goals`):
  - Categoría: `Smoke Producción`.
  - Hábitos: `Prueba de despliegue`, `Smoke — Beber agua`, `Smoke —
    Vasos de agua`.
  - Metas: `Smoke — Constancia inicial`, `Smoke — Meta general`.
- **Primer intento de limpieza: FAILED SAFELY.** El trigger
  `enforce_habit_log_edit_window_trg` (función
  `public.enforce_habit_log_edit_window()`) bloqueó el `DELETE` de
  `habit_logs` con más de 7 días de antigüedad ("records older than the
  seven-day edit window are read-only") — comportamiento correcto de la
  ventana de edición ya documentada en las reglas de negocio, no
  diseñada para permitir borrado administrativo directo. Rollback de la
  transacción verificado; conteos permanecieron sin cambios
  (`1/1/1/3/3/3/2/2`) tras el intento fallido.
- **Transacción final (exitosa):** validó el dataset de Smoke exacto,
  deshabilitó temporalmente **únicamente**
  `enforce_habit_log_edit_window_trg`, borró los datos funcionales de
  Smoke/QA, **re-habilitó ese mismo trigger**, verificó que quedara
  habilitado, y confirmó `auth.users`/`profiles` intactos antes de
  hacer `COMMIT`.
- **Conteo final verificado:** `auth.users=1`, `profiles=1`,
  `categories=habits=habit_categories=habit_schedules=habit_logs=
  goals=0`.
- Usuario y perfil de Production preservados. Schema, migraciones y RLS
  sin cambios.

### Deployment artifact

- Release SHA: `3eaa0af`.
- Artefacto: `habitos-7.10B-deploy.zip`, SHA-256
  `50f418e0fe8b028afc86220208321cbcaa311dabca2e8b417ab2cc48587d9ebb`, 7
  entradas (`​.htaccess`, `favicon.svg`, `icons.svg`, `index.html`,
  `assets/index-DF_UjmWg.js`, `assets/index-guW9CQrf.css`,
  `assets/StatusDonut3D-BbyOQMCK.js`), sin carpeta contenedora.
- **Incidente detectado y corregido antes de la subida:** el primer ZIP
  (generado con `Compress-Archive` de PowerShell) guardaba las entradas
  con separador `\` (backslash) en vez de `/`, un defecto conocido de
  ese cmdlet en Windows — confirmado con `unzip -l` (advirtió
  explícitamente sobre esto) y con una extracción de prueba. Se
  reconstruyó el ZIP con la API `System.IO.Compression.ZipArchive`
  (rutas `/` explícitas) y se revalidó por extracción completa contra
  `dist/` antes de entregarlo para la subida.

### Hostinger — subida manual

**Método: MANUAL HOSTINGER FILE MANAGER** (sin automatización — este
entorno no tiene herramienta de acceso a Hostinger).

- **Incidente de path anidado:** la extracción inicial del ZIP en
  Hostinger colocó el release bajo
  `public_html/habitos/public_html/habitos/` (anidado incorrectamente)
  en vez de directamente en `public_html/habitos/`. No se declaró falla
  de Production en ese momento — el Product Owner movió manualmente los
  archivos nuevos a la ruta correcta (`public_html/habitos/`),
  reemplazando `index.html`, `.htaccess`, `favicon.svg`, `icons.svg` y
  `assets/` (con los 3 archivos finales:
  `index-DF_UjmWg.js`/`index-guW9CQrf.css`/`StatusDonut3D-BbyOQMCK.js`).
  El residuo temporal de la extracción anidada fue limpiado por el
  Product Owner después de confirmar el Smoke exitoso.

### Production Smoke (post-deploy)

**Status: PASSED**, verificado manualmente por el Product Owner contra
`https://codgoli.com/habitos/` real:

- Aplicación principal carga correctamente; Dashboard → Checklist →
  Mis hábitos → Historial → Estadísticas → Metas → Configuración: sin
  ninguna página en blanco.
- Datos de aplicación: vacíos/limpios — sin hábitos, metas, categorías
  ni historial de QA (confirma el resultado de 7.10B-1).
- Modal de Crear Hábito: PASSED (opacidad correcta, toggle visualmente
  correcto) — sin guardar datos.
- Modal de Crear Meta: PASSED (fecha correcta, comportamiento de
  unidad/selector correcto donde aplica) — sin guardar datos.
- Logout → Login: PASSED.

**Bug-por-bug (Production real):** BUG-PROD-001 a 008 — **8/8 PASSED
IN PRODUCTION.** Detalle causa raíz/fix/retest local de cada uno en
`Contexto/04_QA/02_REGRESSION_CONTEXT.md`, sección 4 — esta sección
solo añade la confirmación final en Production, no reemplaza esa
evidencia.

**Rollback: NOT REQUIRED.**

### Seguridad — confirmación expresa de este bloque

No se modificó schema, RLS, policies, functions, triggers ni
constraints (el trigger de edición de logs fue deshabilitado y
re-habilitado dentro de la misma transacción de limpieza, sin cambiar
su definición). No se ejecutó `db push`, no se aplicó ninguna
migración nueva, no se modificó Auth de Production, no se creó ningún
usuario nuevo. No se instaló Playwright ni ninguna dependencia nueva.
El único cambio de estado de Git en este bloque fue el commit local
`3eaa0af`, explícitamente autorizado; `git push` se ejecuta en 7.10C.

### Próximo paso

**7.10C — Release Closure**: commit de cierre documental y `git push`
a `origin/main`, con autorización explícita separada del Product
Owner (ver sección siguiente).

## 7.10C — Release Closure

**Status: COMPLETED.**

Bloque exclusivamente documental + cierre de Git — sin ningún cambio
adicional a Production DB, Auth, Hostinger, ni código funcional.

### Resumen del release

```
Application:              Habit Tracker
Target:                    https://codgoli.com/habitos/
Release SHA:                3eaa0af
Deployment:                 SUCCESS (manual, Hostinger File Manager)
Production Smoke:            PASSED (8/8 BUG-PROD-00X)
Rollback required:           NO
Production DB:                clean functional state (0 filas de dominio, auth.users=1, profiles=1)
```

### Cambios de este bloque

- `.gitignore`: se agregó la regla específica `habitos-*-deploy.zip`
  (no un `*.zip` genérico, para no ocultar por accidente algún ZIP que
  el proyecto decida versionar intencionalmente en el futuro) — el
  artefacto de deployment nunca debe commitearse.
- Documentación finalizada: `Contexto/03_DEPLOYMENT/
  03_DEPLOYMENT_MASTER_CONTEXT.md`, `Contexto/04_QA/
  02_REGRESSION_CONTEXT.md`, `Contexto/04_QA/
  01_PRODUCTION_SMOKE_CONTEXT.md` (disposición final añadida,
  evidencia original preservada), y esta misma sección de
  `MDs/14_DEPLOYMENT_PLAN.md`.
- Sin cambios de código funcional — confirmado con `git diff --stat`
  antes de commitear (solo 3 archivos de documentación + `.gitignore`).

### Commit de cierre y push

Commit de cierre documental creado con mensaje `docs: close production
redeployment and smoke validation` (SHA reportado en el checkpoint de
la sesión que cerró este bloque, no auto-referenciado aquí). `git push
origin main` ejecutado tras ese commit, con autorización explícita del
Product Owner. `habitos-7.10B-deploy.zip` y `dist/` permanecen
localmente, sin commitear (ambos cubiertos por `.gitignore`).

### Estado final de los 8 bugs

Los 8 `BUG-PROD-00X` completaron la cadena completa:
**ORIGINAL PRODUCTION OBSERVATION → LOCAL FIX (7.9A) → LOCAL MANUAL
RETEST (7.9B, 8/8, incluye la reapertura de BUG-PROD-003) → RELEASE SHA
`3eaa0af` → PRODUCTION REDEPLOYMENT (7.10B) → PRODUCTION SMOKE PASSED
(7.10B)**. Ninguno permanece abierto en Production. Detalle completo,
sin sobrescribir la evidencia original, en
`Contexto/04_QA/01_PRODUCTION_SMOKE_CONTEXT.md` y
`Contexto/04_QA/02_REGRESSION_CONTEXT.md`.

### Hallazgos pendientes de regla de negocio — sin cambios

Los 4 hallazgos (meta vencida sigue activa, meta al 100% sigue activa,
consejo de IA no confirmado, rankings con dataset disperso) siguen
**Pending Product Rule / Not Confirmed** — ninguno se cierra ni se
reclasifica solo porque el deployment fue exitoso. Requieren decisión
de producto separada del Product Owner.

### Próxima fase

No decidida en este bloque — corresponde a una decisión separada del
Product Owner (posible candidato: 7.11, fundamento de testing
automatizado con Playwright, explícitamente no iniciado ni instalado
en ningún bloque hasta ahora).
