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
