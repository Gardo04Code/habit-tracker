# Hostinger — Contexto (Paso 7, bloque 7.7) — Habit Tracker DEPLOYED

## Estado actual

**Habit Tracker está en producción en `https://codgoli.com/habitos/`**
desde 7.7C. Verificado de forma independiente: HTTP 200, 7/7 deep links
Passed contra el servidor real (Apache/LiteSpeed), assets byte-idénticos
al build auditado, único Project Ref = `xgasncrztfwotjlghlfg`, cero
secretos, cero escrituras en Supabase, `https://codgoli.com/` intacto.

## Decisión definitiva — no volver a preguntar

URL productiva: **`https://codgoli.com/habitos`**. Subruta del sitio
Codgoli existente. Nunca subdominio, nunca dominio nuevo.

## Arquitectura confirmada

```
HOSTINGER DOCUMENT ROOT:     public_html
TARGET FILESYSTEM PATH:      public_html/habitos/
TARGET URL:                  https://codgoli.com/habitos/
HTTPS:                       YES
STATUS:                      DEPLOYED (7.7C)
```

Contenido de `public_html/habitos/`: `index.html`, `.htaccess`,
`favicon.svg`, `icons.svg`, `assets/` (3 archivos: JS principal, JS
lazy-loaded `StatusDonut3D`, CSS). Sin carpeta `dist/` anidada.

## Regla absoluta (sigue vigente para cualquier deploy futuro)

El sitio Codgoli (`public_html/index.html`, `public_html/.git/`,
`public_html/README.md`) **nunca** debe tocarse — confirmado intacto
tras el deploy (`https://codgoli.com/` sirve su propio contenido,
`<title>CodGoli — Próximamente</title>`, sin redirigir a `/habitos`).
Cualquier actualización futura de Habit Tracker debe seguir limitándose
exclusivamente a `public_html/habitos/`.

## Cómo se ejecutó el upload (7.7C)

Este entorno no tenía ninguna herramienta de acceso a Hostinger (sin
FTP/SFTP/API/navegador automatizable) y tenía prohibido solicitar
credenciales. Se preparó un ZIP local (`habitos-deploy.zip`, contenido
plano de `dist/`, sin carpeta contenedora) y el **Product Owner lo
subió y extrajo manualmente** vía File Manager — mismo patrón ya usado
para `supabase login` en 7.5A (acciones que requieren la sesión/
credenciales directas del Product Owner). El ZIP y la carpeta temporal
fueron eliminados tras la extracción.

## Verificación post-upload (independiente, ver `MDs/14` sección "7.7C (continuación)")

- `/habitos/` → 200, `index.html` correcto.
- 7/7 deep links (`checklist`, `habits`, `goals`, `history`,
  `statistics`, `settings`, `login`) → 200, mismo shell SPA — primera
  prueba real del `.htaccess` contra el servidor de Hostinger.
- Assets: `diff` byte a byte contra `dist/` local → **idéntico**, cero
  corrupción.
- `.htaccess` → `403` vía HTTP directo (comportamiento de seguridad
  esperado de Apache, confirma que el archivo existe y se procesa).
- Bundle desplegado: único Project Ref `xgasncrztfwotjlghlfg`, cero
  secretos.
- Supabase Production: 15/15 migraciones, 0 filas, 0 usuarios — sin
  cambios por el deploy frontend.
- Consola del navegador: `LIMITED` (sin herramienta de navegador en
  este entorno). `ProtectedRoute` confirmado por observación directa
  del Product Owner (`/habitos/checklist` → redirige a `/habitos/login`
  sin sesión) + verificación cruzada contra el código ya auditado.

## Nunca subir (en futuros updates)

`src/`, `node_modules/`, `supabase/`, `Contexto/`, `MDs/`, `.git/`,
`.env`, `.env.local`, `.env.production.local`, `package-lock.json`, ni
ningún secreto (DB password, `service_role`, JWT secret, tokens).

## Siguiente paso

**7.8 — Production Auth / Site URL / Redirect Configuration**: ahora
que la URL real está confirmada y en producción, configurar Site URL/
Redirect URLs de Supabase Auth apuntando a
`https://codgoli.com/habitos/`. Bloque separado, con autorización
explícita nueva del Product Owner — no configurado todavía.
