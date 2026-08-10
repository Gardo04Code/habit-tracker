# Deployment — Contexto maestro (Paso 7, bloque 7.1)

## Estado

Paso 6 — QA/E2E: **COMPLETADO**. Veredicto final (re-ejecución del Cierre
Final, `MDs/13_E2E_QA_TEST_PLAN.md`): **GO PARA PASO 7 — DEPLOYMENT**
(20/20 criterios de salida cumplidos, BUG-001..007 Fixed — Retest
Passed, cero bugs Críticos/Altos abiertos).

Paso 7 — Deployment: **EN AUDITORÍA (7.1)**. No se ha ejecutado ningún
despliegue. No se ha hecho push, db push, ni se ha tocado Supabase
remoto.

## Qué se hizo en esta sesión (7.1)

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
  `supabase/migrations/`.
- **CLI vinculado localmente** a un proyecto remoto:
  `supabase/.temp/project-ref` → `xgasncrztfwotjlghlfg` (mismo host que
  detectó QA: `xgasncrztfwotjlghlfg.supabase.co`). Este archivo está
  bajo `supabase/.gitignore` (`.temp`), **no está trackeado ni se
  commiteará**. Confirma que en algún momento se ejecutó `supabase link`
  contra ese proyecto, pero **no hay evidencia en el repo de que ese
  proyecto remoto esté autorizado como destino de producción** — sigue
  siendo SOLO LECTURA CONCEPTUAL / NO UTILIZAR hasta confirmación
  explícita del usuario.
- Sin `seed.sql` en el repositorio (`find supabase -iname "seed*"` sin
  resultados) — coincide con lo reportado por QA.
- Últimas 3 migraciones: `20260804221046_create_habit_schedule.sql`,
  `20260805171711_goal_integrity_fixes.sql`,
  `20260806162035_goal_progress_concurrency.sql`.

## Git

- Branch: `main`, sincronizado con `origin/main`
  (`https://github.com/Gardo04Code/habit-tracker.git`).
- 34 archivos `M` (código de la sesión de rediseño, ya conocidos y
  documentados por QA) + un conjunto amplio de `??` (Contexto/, MDs
  09-13, src/contexts, src/hooks de integración Supabase, src/lib,
  src/pages/LoginPage.tsx, src/routes, src/services, src/types
  nuevos, supabase/, .env.example).
- Nada de esto se commiteó, ni se hizo `add`, ni `push` durante esta
  sesión.

## Decisiones pendientes (no se asumieron)

1. Proveedor de hosting del frontend.
2. Si `xgasncrztfwotjlghlfg` es el proyecto Supabase autorizado, o si se
   crea uno nuevo (producción/staging).
3. Si se separa staging de producción.
4. Dominio productivo (bloquea configuración de Auth Site
   URL/Redirect URLs, CORS, HTTPS).
5. Si `Contexto/` y `MDs/` deben versionarse en Git.
6. Política de source maps en build productivo.

Ver `MDs/14_DEPLOYMENT_PLAN.md` para el plan completo.
