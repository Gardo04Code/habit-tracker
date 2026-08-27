# Frontend Production — Contexto (Paso 7, bloque 7.7)

## Estado al cierre de 7.6

7.1-7.5B: **COMPLETADOS.** Supabase Production con esquema completo
(15/15 migraciones), sin datos. **7.6 — Frontend Production
Configuration: COMPLETADO (READY).** Detalle completo en
`MDs/14_DEPLOYMENT_PLAN.md`, sección "7.6".

## Decisiones confirmadas — no volver a preguntar

- **Estrategia de variables:** `.env.production.local` (gitignored vía
  `*.local`), cargado automáticamente por Vite en `vite build`
  (modo `production` por defecto). Nunca tocar `.env.local`
  (permanece en `mock` para desarrollo).
- **Variables de Production:**
  `VITE_SUPABASE_URL=https://xgasncrztfwotjlghlfg.supabase.co`,
  `VITE_SUPABASE_PUBLISHABLE_KEY=<Publishable Key de Production>`,
  `VITE_DATA_SOURCE=supabase`. Todas públicas por diseño.
- **`dist/` actual = candidato de producción auditado**, generado con
  esta configuración exacta, sin secretos, apuntando exclusivamente al
  proyecto autorizado. Puede reutilizarse en 7.7 sin regenerar, o
  regenerarse con el mismo `.env.production.local` si se prefiere un
  build fresco desde el SHA de release final.

## Hallazgo de diseño (preexistente, no un blocker)

`VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` son obligatorias
incluso en modo `mock`, porque `AuthContext` (que envuelve toda la app)
importa el cliente Supabase de forma incondicional. Si alguna de las
dos falta, la app lanza una excepción al cargar. Ya era así antes de
7.6 — solo queda documentado explícitamente aquí.

## Decisión de arquitectura — codgoli.com/habitos (7.7A/7.7B)

URL definitiva: `https://codgoli.com/habitos` (subruta del sitio
Codgoli existente). Implementado y verificado en 7.7A, **reverificado
con un build regenerado desde cero en 7.7B**:
- `src/main.tsx`: `<BrowserRouter basename={import.meta.env.BASE_URL}>`
  (1 línea, cero impacto en dev local).
- `public/.htaccess`: SPA fallback aislado a `/habitos/`
  (`RewriteBase /habitos/`), se bundlea automáticamente en
  `dist/.htaccess`.
- Build: `vite build --base=/habitos/` — assets/rutas correctamente
  prefijadas, verificado con `vite preview --base=/habitos/` (8/8
  rutas Passed a nivel de servidor/assets).

**Arquitectura Hostinger ya confirmada por el Product Owner (7.7B):**
document root = `public_html`, `public_html/habitos/` no existe
todavía, HTTPS confirmado. **GO PARA 7.7C** (Hostinger First Deploy) —
ver `Contexto/03_DEPLOYMENT/07_HOSTINGER_CONTEXT.md`.

## Conectividad verificada

Llamada REST directa (no JS del navegador, por limitación de
herramienta) contra `https://xgasncrztfwotjlghlfg.supabase.co/rest/v1/profiles`
con la Publishable Key de Production → `401 permission denied` —
exactamente el comportamiento esperado (RLS/grants intactos, `anon`
sin privilegios). Confirma que la API responde y que la key es válida.
**Cero escrituras realizadas.**

## Limitación de verificación

Sin herramienta de automatización de navegador en este entorno — el
comportamiento interactivo real (clics, `ProtectedRoute`, consola del
navegador) no se verificó en vivo en 7.6. Mitigado con verificación de
servidor/assets + prueba REST directa. Recomendable una verificación
manual en navegador real antes o durante 7.9 (smoke post-deploy).

## Decisiones que aún necesita tomar el Product Owner

1. Método de deploy en Hostinger (subida manual de `dist/` vs. Git
   deployment) — depende del plan contratado.
2. Autorizar 7.7 (Frontend Deployment) cuando esté listo.

## Dónde está el detalle

`MDs/14_DEPLOYMENT_PLAN.md`, sección "7.6": matriz de variables
completa, auditoría exhaustiva del `dist/`, checkpoint final.
