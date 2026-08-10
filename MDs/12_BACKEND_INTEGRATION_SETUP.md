# 12 — Preparación técnica del Backend (Integración con Supabase)

**Fecha:** 2026-08-04
**Alcance:** Paso 5 de 7 — preparación de la arquitectura técnica de conexión entre el frontend React y Supabase. No incluye CRUD completo de ninguna entidad ni la conexión de pantallas reales.
**Estado:** Arquitectura lista y **parcialmente validada en vivo** contra Supabase Local (ver sección 12, "Validación de autenticación"). El flujo de `signUp`/`signIn`/`signOut` está confirmado funcionando de extremo a extremo; la carga automática de `profiles` quedó bloqueada por un hallazgo real de base de datos (privilegios de tabla faltantes) documentado abajo — no corregido en esta tarea a pedido explícito, dado que su solución cae en el alcance de migraciones/SQL.

---

## 1. Arquitectura elegida

Se mantiene la estructura ya existente del proyecto (Vite + React 19 + TypeScript + React Router) y se agrega una capa de acceso a datos explícita, sin introducir gestores de estado nuevos:

- **`@supabase/supabase-js`** como único cliente HTTP hacia Supabase (Auth, PostgREST, RPC).
- **Servicios TypeScript** (`src/services/`) como única puerta de entrada a Supabase — ningún componente llama a `supabase` directamente.
- **React Context** (`src/contexts/AuthContext.tsx`) para el estado de sesión/perfil, siguiendo el mismo patrón ya usado por `ThemeProvider` (`src/hooks/useTheme.tsx`).
- **Hooks simples** como puente entre componentes y contexto/servicios (`src/hooks/useAuth.ts`).

No se instaló Redux, Zustand, TanStack Query ni Axios — el volumen de datos y la complejidad actual no lo justifican; `supabase-js` ya incluye su propio cliente HTTP y gestión de sesión.

### Flujo de datos

```
Componente React
      │
      ▼
Hook (useAuth) / Servicio (categoriesService, habitsService, …)
      │
      ▼
src/lib/supabase.ts  →  @supabase/supabase-js
      │
      ▼
Supabase Local (API REST/Auth) — http://127.0.0.1:54321
      │
      ▼
PostgreSQL (RLS + triggers + funciones ya validados, MDs/11)
```

Cada capa tiene una única responsabilidad: los componentes no conocen Supabase; los servicios no conocen React; el cliente (`src/lib/supabase.ts`) es la única instancia que conoce las credenciales.

---

## 2. Estado inicial encontrado

- React 19.2.7, TypeScript ~6.0.2, Vite 8.1.1, `react-router-dom` 7.18.1 ya instalado y en uso (`src/App.tsx`).
- `@supabase/supabase-js` **no** estaba instalado.
- No existían `src/lib/`, `src/services/` ni `src/contexts/`.
- Los mocks viven en `src/data/` (`mockCategories.ts`, `mockHabits.ts`, `mockHabitLogs.ts`, `mockGoals.ts`, `mockUser.ts`, `mockDashboard.ts`) y se consumen directamente desde hooks (`useHabitsManager`, `useGoalsManager`, `useDailyChecklist`, `useSettingsForm`) y componentes (`TopHeader`, `Sidebar`, `DashboardPage`, `DailyChecklistPage`).
- No existía autenticación simulada ni rutas protegidas — todas las rutas eran públicas.
- No existía un archivo central de tipos de base de datos.
- El estado global existente es local a cada hook (sin store compartido) más un único `ThemeContext`.
- `supabase` (CLI) ya estaba como devDependency (v2.111.0) desde el trabajo de migraciones (Pasos 1-4).

---

## 3. Archivos creados

| Archivo | Propósito |
|---|---|
| `.env.local` | Variables de entorno de Supabase Local (ignorado por Git). |
| `.env.example` | Plantilla sin valores reales. |
| `src/vite-env.d.ts` | Tipado de `import.meta.env` para las variables propias del proyecto. |
| `src/types/database.types.ts` | Generado desde Supabase Local (ver sección 5). |
| `src/types/entities.ts` | Alias mantenibles sobre `Database` (Profile, Category, Habit, HabitLog, Goal, HabitSchedule, enums). |
| `src/lib/supabase.ts` | Cliente Supabase único y tipado. |
| `src/lib/errors.ts` | Normalización de errores (`AppError`, `normalizeSupabaseError`). |
| `src/lib/dataSource.ts` | Estrategia de alternancia mock/Supabase (`VITE_DATA_SOURCE`). |
| `src/lib/supabaseHealth.ts` | Comprobación de conexión no destructiva. |
| `src/services/auth.service.ts` | Autenticación — implementado completo. |
| `src/services/profiles.service.ts` | Perfil del usuario — implementado completo. |
| `src/services/categories.service.ts` | Esqueleto documentado. |
| `src/services/habits.service.ts` | Esqueleto documentado. |
| `src/services/habitLogs.service.ts` | Esqueleto documentado. |
| `src/services/goals.service.ts` | Esqueleto documentado. |
| `src/services/habitSchedules.service.ts` | Esqueleto documentado. |
| `src/services/index.ts` | Barril de exportación de todos los servicios. |
| `src/contexts/AuthContext.tsx` | Provider + hook de sesión/perfil. |
| `src/hooks/useAuth.ts` | Re-exportación de `useAuth` junto al resto de hooks. |
| `src/routes/ProtectedRoute.tsx` | Guardia de rutas internas. |
| `src/pages/LoginPage.tsx` | Integración mínima, sin diseño definitivo. |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `package.json` / `package-lock.json` | Se agregó `@supabase/supabase-js` a `dependencies`. |
| `src/App.tsx` | Se envolvió el árbol de rutas con `AuthProvider` y `ProtectedRoute`; se agregó la ruta pública `/login`. Ninguna ruta interna cambió de path ni de componente. |
| `eslint.config.js` | Se agregó `supabase` a `globalIgnores` — `supabase/.temp` (contenido generado por la CLI, no código del proyecto) estaba haciendo fallar `npm run lint` con ~190 errores ajenos a esta tarea. |
| `.env.local` | `VITE_SUPABASE_PUBLISHABLE_KEY` completada con la publishable key real de Supabase Local (obtenida con `npx supabase status`, sin exponer `secret key`/`service_role`). |
| `supabase/config.toml` | `[auth] site_url` corregido de `http://127.0.0.1:3000` a `http://127.0.0.1:5173` (puerto real de Vite); `additional_redirect_urls` actualizado a `["http://127.0.0.1:5173", "http://localhost:5173"]`. Ningún otro valor de esa sección, ni de ninguna otra, fue tocado. |

No se modificó ningún componente visual, estilo, mock, ni la lógica de ningún hook existente.

---

## 4. Variables de entorno

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<configurada — publishable key real de Supabase Local, obtenida con `npx supabase status`>
VITE_DATA_SOURCE=mock
```

`.env.local` ya está cubierto por `.gitignore` (líneas `.env` y `.env.local` ya existían antes de esta tarea — se confirmó con `git check-ignore`, no fue necesario modificar `.gitignore`). `.env.example` no contiene valores reales. El cliente (`src/lib/supabase.ts`) usa exclusivamente esta publishable key — nunca `service_role`/`secret key`, que no aparecen en ningún archivo bajo `src/`.

---

## 5. Generación de tipos — resuelto en una tarea posterior

`src/types/database.types.ts` **ya es el resultado real** de `supabase gen types typescript --local`, generado con Docker Desktop en ejecución y Supabase Local levantado. El placeholder manual descrito originalmente en esta sección fue reemplazado por completo.

Nota de Windows: en PowerShell 5.1, el operador `>` (alias de `Out-File`) escribe por defecto en UTF-16LE con BOM, lo que ESLint interpreta como archivo binario. El comando correcto en Windows PowerShell es:

```powershell
npx supabase gen types typescript --local | Out-File -Encoding utf8 -FilePath "src\types\database.types.ts"
```

(sin `-NoNewline`: esa bandera colapsa todos los saltos de línea del contenido, no solo el final). Confirmar siempre `--local`, nunca `--linked`. No editar `database.types.ts` manualmente después de generarlo.

---

## 6. Cómo iniciar Supabase Local

```bash
npx supabase start
```

Expone: PostgreSQL (`54322`), API REST/Auth (`54321`), Studio (`54323`), Mailpit (`54324`) — ver `MDs/11_DATABASE_VALIDATION_REPORT.md` para el detalle de cada servicio, ya validado exitosamente en la sesión anterior.

---

## 7. Cómo probar la autenticación

1. Confirmar `VITE_SUPABASE_PUBLISHABLE_KEY` en `.env.local` (ya completada).
2. `npm run dev`.
3. Ir a `http://localhost:5173/login` directamente (con `VITE_DATA_SOURCE=mock`, la app no redirige aquí automáticamente — ver sección 8).
4. "¿No tienes cuenta? Créala" → registrar un usuario nuevo. Con `enable_confirmations = false` en `supabase/config.toml`, el registro entrega sesión inmediatamente, sin correo de confirmación.
5. Verificar en Supabase Studio (`http://127.0.0.1:54323`) que se creó la fila en `auth.users`.
6. Cerrar sesión y volver a iniciarla con las mismas credenciales.

Este flujo ya fue ejecutado realmente contra Supabase Local (vía la API de Auth, sin usar la UI del navegador) — ver sección 12, "Validación de autenticación", para el detalle completo y para un hallazgo real que bloquea el paso de carga del perfil hasta que se corrija a nivel de base de datos.

---

## 8. Qué módulos siguen usando mocks

**Todos** los que ya existían siguen usando mocks, sin excepción: `DashboardPage`, `DailyChecklistPage`, `HabitsPage`, `HistoryPage`, `StatisticsPage`, `GoalsPage`, `SettingsPage`, y los hooks que los alimentan (`useHabitsManager`, `useGoalsManager`, `useDailyChecklist`, `useSettingsForm`) y componentes (`TopHeader`, `Sidebar`) que importan `mockUser`/`mockCategories`/etc. directamente desde `src/data/`.

`VITE_DATA_SOURCE=mock` es el valor por defecto (`src/lib/dataSource.ts`). Mientras se mantenga así, `ProtectedRoute` (`src/routes/ProtectedRoute.tsx`) **no exige sesión** y toda la navegación se comporta exactamente igual que antes de esta tarea — ninguna pantalla existente quedó bloqueada por un login que todavía no le corresponde.

Cuando se conecte la primera pantalla real (fuera de esta tarea), migrar significa: cambiar `VITE_DATA_SOURCE=supabase`, hacer que esa pantalla puntual llame al servicio real en vez del mock correspondiente, y confirmar que `ProtectedRoute` empieza a exigir sesión (afecta a todas las pantallas internas a la vez, por diseño — no hay una alternancia por-pantalla dentro de `ProtectedRoute` mismo, solo global).

---

## 9. Qué falta para el siguiente subpaso

- **Bloqueante:** otorgar privilegios de tabla a `authenticated` (`GRANT SELECT, INSERT, UPDATE ...`) en las 7 tablas de `public` — ver sección 12. Sin esto, ninguna lectura/escritura real funcionará para ninguna entidad, no solo `profiles`. Requiere una migración dedicada (fuera de alcance de esta tarea).
- Diseño real de `LoginPage` (hoy es una integración mínima sin estilo definitivo) y, si el producto lo requiere, una pantalla de "nueva contraseña" para completar el flujo de `resetPassword`.
- Implementar el CRUD completo de `categoriesService`, `habitsService`, `habitLogsService`, `goalsService`, `habitSchedulesService` (hoy son esqueletos que lanzan "pendiente de implementación").
- Migrar la primera pantalla real de mock a Supabase, probablemente Configuración (`profilesService` ya está completo) por ser la de menor riesgo.
- Definir cómo conviven `src/types/entities.ts` (filas de base de datos) con los tipos visuales existentes (`src/types/habit.ts`, `src/types/goal.ts`) — ver riesgos.

---

## 10. Riesgos y decisiones pendientes

1. **~~Docker no disponible~~ — resuelto.** Docker Desktop y Supabase Local están operativos; `database.types.ts` es ahora el archivo generado real y el flujo de Auth fue ejercido contra la API real (sección 12). El riesgo vigente ya no es de entorno, sino el hallazgo de privilegios descrito en la sección 12.
2. **Colisión de nombres entre tipos de base de datos y tipos visuales.** `entities.ts` exporta `Habit`, `HabitLog`, `Goal` con forma `snake_case` (fila real); `src/types/habit.ts` y `src/types/goal.ts` ya exportan los mismos nombres con forma `camelCase` (modelo visual/mock). No hay conflicto de compilación mientras no se importen ambos sin alias en el mismo archivo, pero habrá que decidir explícitamente la estrategia de mapeo (¿una función `toHabitViewModel(row)` por entidad? ¿renombrar uno de los dos conjuntos?) antes de conectar la primera pantalla real.
3. **~~`site_url` desalineado~~ — resuelto.** `supabase/config.toml` ya apunta a `http://127.0.0.1:5173` (puerto real de Vite), con `additional_redirect_urls` cubriendo `127.0.0.1` y `localhost`. Requirió reiniciar Supabase Local (`supabase stop` + `supabase start`, datos preservados) para que la nueva configuración quedara activa.
4. **`eslint.config.js` fue modificado** para excluir `supabase/` del linting — cambio mínimo y justificado (contenido generado, no código del proyecto), pero es una modificación a un archivo de configuración compartido, no solo a código nuevo.
5. **`ProtectedRoute` protege todas las pantallas internas a la vez**, sin alternancia por pantalla individual — es la interpretación más simple y menos propensa a error del encargo ("no sobrediseñar"); si se necesita una migración más gradual pantalla por pantalla más adelante, este componente tendrá que revisarse.

---

## 12. Validación de autenticación

Ejecutada contra Supabase Local real (Docker Desktop en ejecución, stack completo levantado), llamando directamente a los mismos endpoints de Supabase Auth que usa `@supabase/supabase-js` — sin insertar datos manualmente y sin tocar PostgreSQL de forma directa en ningún punto.

### Flujo verificado

```
React (LoginPage / AuthContext)
      │
      ▼
authService.signUp(email, password, name)
      │  options.data.name → metadata del usuario en auth.users
      ▼
Supabase Auth (POST /auth/v1/signup)
      │
      ▼
auth.users  ──AFTER INSERT trigger──▶  public.handle_new_user()
      │
      ▼
public.profiles (fila creada automáticamente, con name ya poblado)
      │
      ▼
AuthContext.loadProfile()  →  profilesService.getMyProfile()
```

### Registro (signUp)

Usuario de prueba creado **realmente** en Supabase Local vía `POST /auth/v1/signup` (no insertado a mano):

- Correo: `qa-auth-flow-1785828007@example.com` (generado con timestamp para evitar colisiones; es una cuenta de prueba local, no una persona real).
- Confirmado en la respuesta de Supabase Auth: `id`, `email` y `created_at` reales, y una sesión (`access_token`) emitida de inmediato — coherente con `enable_confirmations = false` en `supabase/config.toml`.
- `signUp()` (`src/services/auth.service.ts`) envía `name` en `options.data`, tal como exige `handle_new_user()` para poblar `profiles.name` — confirmado por lectura del código, sin necesidad de cambios.

### Login (signIn)

`POST /auth/v1/token?grant_type=password` con el mismo usuario: **exitoso**. El `id` devuelto coincide exactamente con el del registro; el servidor entrega un token `bearer` válido. Corresponde exactamente a lo que hace `authService.signIn()`.

### Logout (signOut)

`POST /auth/v1/logout` con el token de la sesión: **HTTP 204** (éxito). Verificación adicional: reutilizar el mismo token ya cerrado contra `GET /auth/v1/user` devolvió **HTTP 403** — confirma que la sesión quedó realmente invalidada del lado del servidor, no solo limpiada en el cliente. Corresponde a lo que hace `authService.signOut()`.

### Creación automática del perfil (`handle_new_user()` → `profiles`) — hallazgo real, bloqueado

Al leer `profiles` con el token del usuario recién registrado (lo mismo que hace `profilesService.getMyProfile()`), Supabase respondió:

```
code: 42501 — permission denied for table profiles
hint: Grant the required privileges to the current role with:
      GRANT SELECT ON public.profiles TO authenticated;
```

**Causa raíz confirmada** con una consulta de solo lectura contra Postgres local (`has_table_privilege`, sin modificar nada): **ninguna de las 7 tablas de `public`** tiene privilegios (`SELECT`/`INSERT`/`UPDATE`/`DELETE`) otorgados a `authenticated` ni a `anon`. `supabase/config.toml` tiene deshabilitado `auto_expose_new_tables` (comportamiento nuevo por defecto de Supabase), y ninguna de las 11 migraciones existentes otorgó nunca privilegios de tabla explícitos — solo privilegios `EXECUTE` sobre funciones. RLS está correctamente diseñada y no es la causa: Postgres deniega el acceso por falta del privilegio base de tabla antes de siquiera evaluar las políticas.

**No se corrigió en esta tarea.** Es un cambio de base de datos (un `GRANT` a nivel de tabla) que, para quedar versionado y reproducible como el resto del esquema, debe vivir en una migración — exactamente lo que esta tarea pidió explícitamente no tocar. Se consultó al responsable del producto y se decidió **detener aquí sin aplicar nada**, dejando este hallazgo documentado para resolverlo en una tarea dedicada de base de datos.

**El código de React ya maneja esto correctamente, sin necesitar cambios:** `AuthContext.loadProfile()` (`src/contexts/AuthContext.tsx`) ya envuelve `profilesService.getMyProfile()` en un `try/catch` que deja `profile = null` ante cualquier fallo, sin relanzar el error ni bloquear la UI — el mismo comportamiento defensivo pensado originalmente para "el perfil todavía no existe" cubre también este caso real ("el perfil existe pero no es legible todavía"). Un usuario que hoy inicie sesión por la UI real quedaría autenticado (`user`/`session` poblados) con `profile = null`, sin que la aplicación se rompa.

### Confirmación expresa de este flujo

- `handle_new_user()` **sí** creó el usuario correctamente en `auth.users` (confirmado por la respuesta de la API de Auth). No se pudo confirmar de la misma forma la fila de `profiles` (bloqueado por el hallazgo de privilegios) — pendiente hasta resolverlo.
- `AuthContext` recibió correctamente la sesión: `signIn`/`signOut` fueron verificados de extremo a extremo contra el servidor real de Auth.
- El perfil **no** se pudo cargar desde `profiles` en esta sesión — bloqueado por el hallazgo anterior, no por un defecto en el código del contexto.

---

## 13. Confirmaciones

- No se modificó ninguna migración SQL.
- No se ejecutó `supabase db push`.
- No se tocó el proyecto Supabase remoto — todo lo ejecutado en esta tarea (incluida la prueba real) fue contra Supabase **Local** (`127.0.0.1`).
- No se eliminó ningún mock ni componente visual existente.
- No se conectó ninguna pantalla real a Supabase.
- No se insertó ningún dato manualmente ni se tocó PostgreSQL de forma directa — el usuario de prueba se creó exclusivamente a través de la API de Supabase Auth.
- No se hizo `git add`, `commit` ni `push`.

---

## 14. Nota — bloqueo de privilegios resuelto

El bloqueo descrito en la sección 12 (`permission denied for table profiles`, SQLSTATE `42501`) quedó **resuelto** mediante una nueva migración versionada: `supabase/migrations/20260804073500_table_privileges.sql`. Otorga a `authenticated` exactamente las operaciones (`SELECT`/`INSERT`/`UPDATE`/`DELETE`) que ya permitían las políticas RLS existentes en cada una de las 7 tablas — sin `GRANT ALL`, sin privilegios a `PUBLIC`, sin acceso nuevo para `anon`, sin tocar RLS/triggers/funciones. Validado con `supabase db reset --local --no-seed` (12 migraciones aplicadas sin error) e inspección directa de `information_schema.role_table_grants`. La prueba completa de autenticación (`signUp` → `profiles` → `signIn` → `signOut`) queda pendiente de re-ejecutarse en una tarea posterior.

---

## 15. Validación real de autenticación y perfil (extremo a extremo)

**Fecha:** 2026-08-04. **Entorno:** Supabase Local (`http://127.0.0.1:54321` / `http://localhost:5173`), stack sano confirmado con `npx supabase status` antes de empezar. `VITE_DATA_SOURCE` se cambió temporalmente a `supabase` solo para esta prueba y se restauró a `mock` (valor por defecto del proyecto) al finalizar.

Con el bloqueo de privilegios de la sección 14 ya resuelto, se ejecutó la prueba completa **a través de la interfaz React real** (`LoginPage`, `AuthContext`, `ProtectedRoute`, `TopHeader`), automatizada con un navegador Chromium real (Playwright, usado solo como herramienta de conducción de UI — no se llamó a ningún servicio de Supabase directamente desde el script; toda petición HTTP salió del propio bundle de la app). No se insertó ningún dato manualmente ni se tocó PostgreSQL de forma directa en ningún paso de esta sección.

**Usuario de prueba (anonimizado):** `qa.auth.<timestamp>@habitos.test` / nombre `Usuario QA Local` — cuenta de prueba local generada con timestamp único, no una persona real. Contraseña no documentada aquí (buena práctica, aunque es una cuenta desechable de Supabase Local).

### Registro (signUp)

Completado desde el formulario de `LoginPage` en modo "Crear cuenta". `POST /auth/v1/signup` → `200`, con `user.id`, sesión (`access_token`) emitida de inmediato (`enable_confirmations = false` en `config.toml`, tal como ya estaba configurado — no fue necesario desactivarla para la prueba) y `user_metadata.name` igual al nombre ingresado en el formulario, confirmando que `signUp()` sigue enviando `options.data.name` correctamente.

### Creación automática del perfil (`handle_new_user()`)

Verificado por inspección de solo lectura contra Postgres local (sin insertar ni corregir nada):

```
auth.users.id                       | auth.users.email                    | profiles.id (=id)  | profiles.name
96b73916-ea1d-4475-b9f7-6f056f724f90 | qa.auth.<ts>@habitos.test            | igual a auth.users.id | Usuario QA Local
```

`profiles.id` coincide exactamente con `auth.users.id`, `profiles.name` coincide con el nombre enviado en el registro, y una consulta `GROUP BY id HAVING count(*) > 1` sobre `public.profiles` no devolvió ninguna fila — sin perfiles duplicados.

### Login (signIn) y estado de `AuthContext`

`POST /auth/v1/token?grant_type=password` → `200`. Tras el login, la app navegó a `/` y `profilesService.getMyProfile()` cargó la fila real (ya no bloqueado): el contexto expone `user`, `session` y `profile` poblados. `ProtectedRoute` permitió el acceso tanto a `/` como a `/habits` estando autenticado.

### Logout (signOut) y protección de rutas

Se agregó un botón mínimo "Cerrar sesión" en `TopHeader` (ver "Errores corregidos" abajo) para poder ejercer `signOut()` desde la interfaz real. Al pulsarlo: la app redirigió a `/login`, y una navegación posterior directa a `/habits` volvió a redirigir a `/login` — confirma que `session`/`user`/`profile` quedaron en `null` y que `ProtectedRoute` vuelve a bloquear rutas internas. Sin errores de consola (excepto los logs de red esperados de las pruebas de error, ver abajo).

### Casos de error probados

- **Credenciales incorrectas** (contraseña equivocada sobre el usuario recién creado): `POST /auth/v1/token` responde `400`; la UI mostró un mensaje amigable ("No pudimos verificar tu sesión. Inicia sesión nuevamente."), sin exponer el mensaje crudo de Supabase.
- **Correo ya registrado** (segundo `signUp` con el mismo correo): `POST /auth/v1/signup` responde `422`; la UI mostró el mismo tipo de mensaje amigable, sin texto crudo de Postgres/Supabase.
- **Estado `loading` durante inicialización:** confirmado por lectura de código (`AuthContext` mantiene `loading = true` hasta que `getSession()` resuelve); `ProtectedRoute` ya mostraba un estado de carga explícito antes de esta tarea.
- Los mensajes "Failed to load resource: 400/422" que aparecen en la consola del navegador durante estos dos casos son el registro estándar de Chrome para respuestas HTTP no-2xx (no son excepciones de JavaScript ni errores de React) — es el comportamiento esperado al ejercer intencionalmente rutas de error.

### Errores corregidos durante la prueba

1. **`normalizeSupabaseError` no era idempotente (`src/lib/errors.ts`).** Los servicios (`auth.service.ts`, `profiles.service.ts`) ya lanzan un `AppError` normalizado; `LoginPage.tsx` volvía a pasar ese `AppError` por `normalizeSupabaseError()` al capturarlo, y como `AppError` no es instancia de `AuthError` ni `PostgrestError`, la segunda pasada lo degradaba siempre a la categoría genérica `"unknown"` ("Ocurrió un error inesperado. Intenta de nuevo."), ocultando la clasificación real (credenciales inválidas, correo duplicado, etc.). Detectado en vivo: sin este fix, ambos casos de error mostraban el mismo mensaje genérico en vez de un mensaje de la categoría `auth` correcta. Corregido agregando una guarda al inicio de la función: si el error ya es un `AppError`, se devuelve tal cual. Sin este fix, cualquier página que capture un error ya lanzado por un servicio perdería su clasificación — no era exclusivo de `LoginPage`.
2. **No existía ninguna forma de ejecutar `signOut()` desde la interfaz.** Ninguna pantalla tenía un control de cierre de sesión (fuera de alcance de la tarea de preparación del backend). Se agregó un botón mínimo "Cerrar sesión" en `TopHeader.tsx`, visible únicamente cuando `VITE_DATA_SOURCE=supabase` (`isSupabaseDataSource`) — en el modo `mock` por defecto, `TopHeader` queda exactamente igual que antes. Sin este botón, el requisito de probar logout "desde la interfaz" no podía cumplirse.

### Estado final

Autenticación + perfil quedan **validados de extremo a extremo contra Supabase Local, a través de la interfaz real**: registro, creación automática de perfil, login, carga de perfil en `AuthContext`, logout y protección de rutas funcionan correctamente, y los dos defectos reales encontrados durante la prueba (normalización de errores no idempotente; ausencia de control de logout) quedaron corregidos. `VITE_DATA_SOURCE` se dejó en `mock` al terminar — ninguna otra pantalla quedó conectada a Supabase.

---

## CRUD real de categorías

**Fecha:** 2026-08-04. Primer módulo de negocio real conectado a Supabase Local (autenticación + perfil, sección 15, ya estaba resuelto). Alcance: `categories` únicamente — hábitos, metas, checklist, historial y estadísticas **no** se tocaron.

### Arquitectura del servicio

`src/services/categories.service.ts`, implementado por completo sobre la instancia única `supabase` (`src/lib/supabase.ts`). Columnas reales confirmadas antes de escribir código (`src/types/database.types.ts`): `id`, `user_id`, `name`, `color`, `icon`, `created_at`, `lifecycle_status` (`active`/`deleted`, D-01). **`categories` no tiene columna `updated_at`** — a diferencia de `habits`/`goals`/`habit_logs`, ninguna migración se la agregó nunca; no se inventó ninguna columna que no existiera en el esquema real.

Ningún filtro manual por `user_id` en ninguna función: las políticas RLS (`rls_hardening.sql`, "Categories are selectable/insertable/updatable by owner") ya garantizan propiedad — se confirmó por lectura de las cuatro políticas antes de escribir el servicio, no se asumió.

### Funciones implementadas

- `getCategories()` / `getActiveCategories()` / `getDeletedCategories()` — `SELECT`, ordenadas por `name`.
- `createCategory({ name, color, icon })` — `name` obligatorio con `trim()`, rechazado si queda vacío antes de llamar a Supabase; `color`/`icon` son `NOT NULL` sin `DEFAULT` en la tabla, así que sí forman parte del payload (a diferencia de lo que asumía el encargo original, que solo mencionaba `name`); `lifecycle_status = 'active'` explícito; `user_id` siempre de la sesión actual (`authService.getCurrentUser()`), nunca aceptado del llamador.
- `updateCategory(id, { name })` — únicamente `name`, con `trim()` y rechazo de vacío; sin filtro manual por `id`+`user_id` (RLS ya lo garantiza: un `id` ajeno produce 0 filas, no una fila ajena).
- `softDeleteCategory(id)` — `UPDATE lifecycle_status = 'deleted'`, nunca `DELETE` físico (no existe política RLS de `DELETE` ni `GRANT DELETE` para `authenticated` sobre `categories`).
- `restoreCategory(id)` — `UPDATE lifecycle_status = 'active'`; si ya existe otra activa con el mismo nombre normalizado, el índice único parcial (`categories_active_name_normalized_idx`, `lower(btrim(name))`, D-01) rechaza el `UPDATE` con `23505`, traducido a un mensaje amigable pidiendo renombrar — nunca se renombra nada automáticamente.

### Manejo de errores

`src/lib/errors.ts`: se agregó el kind genérico `not_found` (código `PGRST116`, `.single()` sin filas — cubre tanto "no existe" como "existe pero es de otro usuario", indistinguibles por diseño). `categories.service.ts` añade `mapCategoryError()`, que da un mensaje distinto al mismo código `23505` según la operación ("ya tienes una categoría con ese nombre" al crear vs. "no se pudo restaurar, renombra una de las dos" al restaurar) — nunca expone texto crudo de Postgres/PostgREST.

### Hook

`src/hooks/useCategories.ts`: expone `categories`, `loading`, `error`, `refresh`, `createCategory`, `updateCategory`, `softDeleteCategory`, `restoreCategory`. Alterna automáticamente entre `mockCategories` (estado en memoria, mismo patrón que `useGoalsManager`/`useHabitsManager`) y `categoriesService` según `VITE_DATA_SOURCE`; el componente que lo consume no distingue el origen.

### Integración visual

No existía ninguna vista de administración de categorías (`HabitFormModal` solo permite *seleccionar* categorías mock, no administrarlas) — se preguntó al responsable del producto dónde debía vivir y se eligió: nueva sección `CategoriesSection` dentro de **Configuración** (`SettingsPage.tsx`), siguiendo el mismo patrón visual que `NotificationsSection`/`PrivacySection` ya existentes (mismo `Card`/`SectionHeader`, sin librerías ni tokens nuevos). Reutiliza el selector de iconos/colores que ya existía para hábitos (`HABIT_ICON_OPTIONS`/`HABIT_COLOR_OPTIONS`, `src/utils/habitIcons.ts`) en vez de inventar uno nuevo. Estados cubiertos: loading (skeleton), lista vacía (`EmptyState`), error de carga, confirmación de borrado/restauración (banner temporal), conflicto de nombre (inline, por fila o por campo). Ningún otro módulo (hábitos, checklist, metas, historial, estadísticas, dashboard) se conectó a Supabase.

### Pruebas con Usuario A y Usuario B (Supabase Local, vía interfaz real + Playwright)

Los 16 casos exigidos se ejecutaron contra Supabase Local con dos usuarios de prueba reales (`qa.catA.<ts>@habitos.test` / `qa.catB.<ts>@habitos.test`, registrados vía la UI, sin insertar nada por SQL). Resultado: **16/16 correctos**.

- **Aislamiento RLS (1-6):** A crea "Salud" y la ve; B no la ve (lista vacía); B crea su propia "Salud"; A renombra la suya a "Bienestar"; B sigue viendo únicamente su "Salud" — confirmado en dos sesiones de navegador independientes y simultáneas.
- **Borrado lógico y papelera (7-8):** soft delete mueve la categoría a `deleted` y aparece en la papelera; no se ejecuta ningún `DELETE`.
- **Asociaciones preservadas (9):** se creó un hábito + una fila `habit_categories` de prueba controlada por API (no por UI, sin conectar la pantalla de hábitos) vinculados a la categoría; tras el soft delete, la fila de `habit_categories` sigue existiendo sin cambios.
- **Reutilización de nombre y conflicto de restauración (10-12):** A crea una nueva "Bienestar" activa mientras la original sigue en la papelera (permitido, D-01); restaurar la deleted falla con mensaje amigable por conflicto de nombre; tras renombrar la activa, la restauración de la deleted funciona correctamente.
- **Protecciones de base de datos, verificadas por API directa con el token de A (13-14):** `DELETE` físico → `403`, `permission denied for table categories` (sin `GRANT DELETE`); `PATCH user_id` → `400`, rechazado por `protect_categories_user_id_trg` ("ownership is immutable").
- **Validación de nombre (15-16):** nombre vacío/solo espacios rechazado antes de llamar a Supabase; duplicados normalizados ("CasoDup" / "  casodup  " / "CASODUP") rechazados por el índice único parcial, confirmando `lower(btrim(name))`.

### Errores corregidos durante la prueba

1. **`normalizeSupabaseError` nunca reconocía un `PostgrestError` real (`src/lib/errors.ts`).** Causa raíz: supabase-js solo construye una instancia de la clase `PostgrestError` cuando se usa la API que lanza (`.throwOnError()`); en el patrón usado en todo el proyecto (`const { data, error } = await supabase.from(...)...`), la librería devuelve el error como **objeto plano** (confirmado leyendo `node_modules/@supabase/postgrest-js/dist/index.mjs`). `instanceof PostgrestError` era siempre `false`, así que todo error de datos (incluida la violación de unicidad al restaurar) caía en la categoría genérica `"unknown"`, con `technicalMessage = String(objeto) = "[object Object]"` — visible literalmente en la interfaz. Corregido agregando una comprobación estructural (`isPostgrestErrorLike`, por forma: `message`/`code` string) además de `instanceof`. Afecta a todos los servicios que usan `normalizeSupabaseError`, no solo a categorías — `profiles.service.ts` tenía la misma falla latente, sin manifestarse visiblemente porque su único error (`getMyProfile()`) se descarta silenciosamente en `AuthContext`.
2. **`CategoriesSection.tsx` mostraba el mensaje técnico en vez del amigable.** El helper local `errorMessage()` leía `caught.message` (el texto técnico, potencialmente crudo) en vez de `caught.friendlyMessage` para errores reales de Supabase — violaría directamente "no mostrar mensajes crudos". Corregido: usa `friendlyMessage` para `AppError` (modo Supabase) y `.message` solo para los `Error` planos ya redactados a mano del modo mock.

### Pendientes / decisiones tomadas

- `categories.color`/`categories.icon` no son editables después de la creación (`updateCategory` solo cambia `name`, regla explícita del encargo) — si se quiere permitir editarlos, es una decisión de producto pendiente, no técnica.
- La vista de administración de categorías se ubicó en Configuración por decisión explícita del responsable del producto (entre tres opciones presentadas); no está documentada en `04_SCREEN_SPECIFICATIONS.md`, que no contempla ninguna pantalla de categorías.
- Los dos defectos de `errors.ts`/`CategoriesSection.tsx` corregidos aquí también mejoran, de forma incidental, la fiabilidad de los mensajes de error ya usados por `profiles.service.ts` y por cualquier futuro servicio (`habits`, `goals`, etc.) que siga el mismo patrón — vale la pena tenerlo presente al conectar el siguiente módulo.

---

## CRUD real de hábitos

**Fecha:** 2026-08-04.

### Auditoría previa y bloqueo real encontrado

Esquema real confirmado en `database.types.ts` (sin inventar columnas): `habits` (`id, user_id, name, description, icon, color, goal_type, target_value, target_unit, deadline_time, start_date, end_date, lifecycle_status, allow_partial, created_at, updated_at` — cuatro estados de ciclo de vida: `active`/`paused`/`archived`/`deleted`, no dos como categorías); `habit_schedules` (`id, habit_id, frequency_type, days_of_week, frequency_target, interval_days, valid_from, valid_to, created_at, updated_at` — tabla **versionada**, la fila vigente es `valid_to IS NULL`); `habit_categories` (`habit_id, category_id`, PK compuesta, sin columna `id`). Confirmado también: el índice único normalizado de `habits` excluye solo `deleted` (`WHERE lifecycle_status <> 'deleted'`) — a diferencia de categorías, un hábito `paused`/`archived` sigue "ocupando" su nombre.

**Bloqueo real detectado antes de escribir código:** `habit_schedules` no tiene ninguna política RLS de `INSERT`/`UPDATE`/`DELETE` para `authenticated` (solo `SELECT`) ni ningún `GRANT` que lo permita — el único camino de escritura es la función `change_habit_schedule(...)`, y su cuerpo **exige que ya exista una versión vigente** (`raise exception ... 'has no current schedule version'` si no la hay). No existía ningún camino permitido para crear la primera programación de un hábito nuevo. Reportado al responsable del producto antes de escribir ninguna migración; se autorizó la opción "Nueva RPC dedicada a creación".

**Migración nueva (única de esta tarea):** `supabase/migrations/20260804221046_create_habit_schedule.sql` — agrega exclusivamente `public.create_habit_schedule(p_habit_id, p_frequency_type, p_days_of_week, p_frequency_target, p_interval_days)`, simétrica a `change_habit_schedule` en sus validaciones de coherencia, pero con la guarda invertida (exige que **no** exista versión vigente) y sin recibir `valid_from` como parámetro — lo toma de `habits.start_date` del propio hábito, igual que hizo el backfill original. No modifica `change_habit_schedule` ni ninguna migración previa. `GRANT EXECUTE` solo a `authenticated` (igual patrón que la función existente). Validado con `supabase db reset --local --no-seed` (13 migraciones aplicadas sin error) y con `has_function_privilege` confirmando que `anon`/`service_role`/`PUBLIC` no pueden ejecutarla. `database.types.ts` regenerado desde Local tras la migración.

### Archivos creados

- `supabase/migrations/20260804221046_create_habit_schedule.sql`
- `src/hooks/useHabits.ts`

### Archivos modificados

- `src/services/habits.service.ts` (implementación completa)
- `src/services/habitSchedules.service.ts` (implementación completa)
- `src/lib/errors.ts` (kind `P0001` → `validation`; mensaje específico para el límite de "un cambio de frecuencia por día")
- `src/pages/HabitsPage.tsx`, `src/components/habits/HabitFormModal.tsx`, `HabitFilters.tsx`, `HabitCard.tsx`, `HabitListRow.tsx`, `DeleteHabitModal.tsx` — conectados a datos reales, con cambios mínimos de props (ver "Interfaz" abajo)
- `database.types.ts` (regenerado, incluye `create_habit_schedule`)

`src/hooks/useHabitsManager.ts` (el hook mock anterior) se dejó **sin modificar y sin eliminar** — ya no lo importa ningún componente, pero se conserva por la misma regla de no eliminar infraestructura existente fuera del alcance pedido.

### Funciones implementadas

`habits.service.ts`: `getHabits`, `getActiveHabits`, `getDeletedHabits`, `getHabitById`, `createHabit`, `updateHabit`, `softDeleteHabit`, `restoreHabit` (las 8 pedidas) + `setHabitLifecycleStatus` (auxiliar interna que también sirve pausar/archivar/reactivar — ver "Decisiones" abajo). `habitSchedules.service.ts`: `getHabitScheduleHistory`, `getCurrentSchedules` (lote, evita N+1), `createHabitSchedule`, `changeHabitSchedule`.

### Comportamiento del hook

`useHabits()` expone `habits` (todos los estados, igual que el hook mock que reemplaza — así `HabitsPage` no necesitó cambiar su lógica de pestañas/conteos), `deletedHabits` (derivado), `loading`, `error`, `refresh`, `isNameTaken` (síncrono, misma regla que `habits_active_name_normalized_idx`) y las mutaciones. Tras cualquier mutación en modo Supabase, se llama `refresh()` completo en vez de parchear el estado local — prioriza consistencia (pedido explícitamente), ya que un hábito depende de tres tablas. En modo mock replica exactamente el comportamiento de `useHabitsManager`.

### Vista conectada

**Mis hábitos** (`HabitsPage.tsx`), sin rediseño. Se agregaron: banner de error, skeleton de carga, y `categories`/`allowHardDelete` como props nuevas en `HabitFilters`/`HabitCard`/`HabitListRow`/`HabitFormModal`/`DeleteHabitModal` (reemplazan imports directos de `mockCategories`/`getCategoryById`) — mismos componentes visuales, origen de datos inyectado. `HabitFormModal.onSubmit` pasó de síncrono a `Promise<void>`: el modal ya no se cierra hasta que la operación resuelve, muestra `isLoading` en el botón (impide doble envío) y un banner de error si falla, sin perder lo ya escrito.

### Cómo se sincronizan las categorías

`createHabit`/`updateHabit` reciben `categoryIds: string[]` (todas las seleccionadas). Internamente, `syncHabitCategories` calcula la diferencia contra las asociaciones actuales (`habit_categories` cargadas junto con el hábito): `INSERT` solo lo nuevo, `DELETE` solo lo retirado — nunca reinserta lo que ya existía, así que no puede duplicar. `habit_categories` no tiene `UPDATE` en RLS (confirmado en la tarea de categorías) — coherente con este enfoque.

### Cómo se guarda la periodicidad

Al crear: `create_habit_schedule` (RPC nueva). Al editar: si la frecuencia cambió respecto a la vigente, `change_habit_schedule` con `effective_date` = fecha real de hoy (`new Date()`) — la UI no tiene un campo para elegir otra fecha de vigencia. **Limitación real documentada:** `change_habit_schedule` exige `effective_date` estrictamente posterior al `valid_from` vigente; si un hábito cambió de frecuencia el mismo día (real) en que se intenta cambiarla de nuevo, la operación se rechaza. Se agregó una detección específica de este caso en `mapHabitError` con un mensaje claro ("no puedes cambiar la periodicidad el mismo día... inténtalo mañana") en vez del genérico de validación. No se pudo eliminar la limitación en sí sin modificar `change_habit_schedule` (fuera de alcance autorizado).

### Límite de atomicidad (documentado explícitamente, como se pidió)

`createHabit` es 3 operaciones Supabase independientes (INSERT `habits` → RPC de programación → INSERT `habit_categories`), no una transacción real. Si el paso 2 o 3 falla, se hace un borrado lógico de compensación del hábito recién insertado (nunca un `DELETE` físico, no está permitido). Si esa compensación también falla (por ejemplo, la conexión se cae justo después del error original), el hábito puede quedar activo sin programación completa o sin todas sus categorías — recuperable editándolo manualmente, no revertido de forma automática. No se implementó una función SQL transaccional para esto (no autorizado en esta tarea).

### Resultados de las pruebas (Supabase Local, dos usuarios reales, vía UI + Playwright, sin SQL manual)

**22/22 casos correctos.**

| # | Caso | Resultado |
|---|---|---|
| 1-2 | A crea un hábito completo; conserva todos sus campos | `INSERT habits` → `201`; tarjeta muestra meta, frecuencia y categoría correctas |
| 3 | Se guarda una categoría | 1 fila en `habit_categories` tras crear |
| 4 | Se guardan varias categorías | 2 filas tras agregar una segunda en edición |
| 5 | No se duplican asociaciones | Guardar de nuevo sin cambios: sigue en 2 filas |
| 6-7 | Se guarda y se edita la periodicidad | `create_habit_schedule` al crear (`specific_days`, Lun/Mié/Vie); `change_habit_schedule` al editar a `daily`, `200` |
| 8 | Se agregan y quitan categorías en la misma edición | De 2 a 1 fila tras quitar una |
| 9-11 | B no puede leer/modificar/eliminar el hábito de A | Invisible en su lista; `PATCH`/borrado lógico devuelven 0 filas, el hábito de A no cambia |
| 12 | No puede asociarse una categoría ajena | `POST habit_categories` con categoría de B → `400`, rechazado por `validate_habit_category_ownership_trg` |
| 13 | Categoría eliminada — protección solo de UI | `POST habit_categories` con una categoría propia `deleted` → **`201`, permitido por RLS**; el selector de la UI no la ofrece (`0` coincidencias) — **protección real es solo de interfaz, reportado tal cual pide la tarea** |
| 14 | Nombre vacío se rechaza | Sin llamada a Supabase, error inline |
| 15 | Valores inválidos se rechazan | Meta `<= 0` → "Ingresa una meta mayor a 0." |
| 16 | Fechas incoherentes se rechazan | `end_date < start_date` → mensaje amigable (validado en el servicio, no en el formulario — ver nota abajo) |
| 17-18 | Borrado lógico mueve a papelera y desaparece de activos | Confirmado en ambas pestañas |
| 19-20 | Restaurar devuelve a activos con categorías/periodicidad intactas | Mismas filas de `habit_categories`, mismo `id` de `habit_schedules` antes/después |
| 21 | Mensajes amigables | Ningún texto capturado contiene código SQLSTATE ni texto crudo de Postgres |
| 22 | Modo mock sigue funcionando | Verificado por separado: `Mis hábitos` en `VITE_DATA_SOURCE=mock` sin errores de consola, validación de nombre duplicado y categorías mock funcionando |

### Evidencia de aislamiento RLS

Verificado con el token real de cada usuario contra la API REST (no solo desde la UI): `PATCH`/borrado lógico de B sobre el hábito de A devuelven `0` filas afectadas y el hábito de A queda intacto (nombre y `lifecycle_status` verificados después con el token de A); `POST habit_categories` vinculando el hábito de A con una categoría de B es rechazado por `validate_habit_category_ownership_trg` (`400`, mensaje "does not belong to the same user"). Ningún caso dependió de que la UI simplemente no mostrara el botón — se ejerció la operación real contra la API.

### TypeScript, lint y build

Los tres en verde después de todos los cambios (incluida la nueva migración y el tipo regenerado).

### Bugs reales encontrados y corregidos

Ninguno nuevo esta vez (los dos de la tarea de categorías —`normalizeSupabaseError` y el mensaje técnico vs. amigable— ya estaban corregidos y se heredan automáticamente aquí porque `habits.service.ts` usa la misma base). Sí se corrigió, durante la propia auditoría previa a escribir código, el **bloqueo real de `habit_schedules`** descrito arriba (no es un "bug" en código existente, sino una capacidad que nunca existió).

### Decisiones y limitaciones técnicas

- **Pausar/archivar/reactivar sí se conectaron**, aunque el encargo solo pedía crear/editar/eliminar lógicamente/restaurar: son la misma operación (`UPDATE lifecycle_status`) que ya se necesitaba para borrado lógico/restauración, y dejarlos sin conectar habría roto la UI existente (`HabitCard`/`DeleteHabitModal` ya ofrecían esos botones). No se agregó ninguna función ni endpoint nuevo para esto.
- **Eliminación física NO se conectó** (fuera de alcance explícito): la opción "Eliminar hábito y todos sus registros" se oculta del modal (`allowHardDelete={false}` en modo Supabase) en vez de dejarla fallar contra RLS.
- **La validación de fechas incoherentes (caso 16) no tiene mensaje inline** en el campo — el formulario original (`HabitFormModal`, sin modificar su `validate()`) nunca comprobaba `end_date`/`start_date` entre sí; se agregó la comprobación en `habits.service.ts` (defensa en profundidad, autoridad final es `habits_end_date_after_start_chk`) y se muestra en el banner superior del modal. Se podría mover a validación inline en una futura tarea de UI.
- **`effective_date` de `change_habit_schedule` siempre es "hoy"** — la UI no tiene selector de fecha de vigencia; ver limitación documentada arriba.
- Checklist, `habit_logs`, metas, historial, estadísticas, dashboard, recordatorios, rachas y porcentajes de cumplimiento: **sin tocar**, tal como se pidió.

### Confirmaciones

- Se creó **una** migración nueva y aditiva, autorizada explícitamente antes de escribirla; no se modificó ninguna migración previa.
- No se ejecutó `supabase db push`; no se tocó el proyecto remoto — todo (incluida la migración) se aplicó y probó exclusivamente contra Supabase Local.
- No se conectó ningún otro módulo (checklist, `habit_logs`, metas, historial, estadísticas, dashboard).
- No se eliminó ningún mock (`mockHabits.ts`, `mockCategories.ts`, `useHabitsManager.ts` conservados).
- No se hizo `git add`, `commit` ni `push`.
- `.env.local` quedó nuevamente en `VITE_DATA_SOURCE=mock` al terminar.

---

## Checklist Diario

**Fecha:** 2026-08-05.

### Arquitectura

`habit_logs` real, confirmado en `database.types.ts` antes de escribir código: `id, habit_id, date, status, value, note, recorded_time, created_at, updated_at` + cuatro columnas de snapshot (`goal_type_snapshot` NOT NULL, `target_value_snapshot`/`target_unit_snapshot`/`deadline_time_snapshot` nullable). `status` usa el enum real `habit_status` (`pending`/`completed`/`partial`/`not_completed`/`not_applicable`) — idéntico al `HabitStatus` visual ya usado por toda la UI, sin inventar ningún estado nuevo. `UNIQUE (habit_id, date)` confirmado (`habit_logs_habit_id_date_key`). Ningún log se crea automáticamente: la ausencia de fila para un hábito activo en una fecha ES el estado "Pendiente" — regla explícita respetada en todo el diseño.

### Servicio (`src/services/habitLogs.service.ts`)

- `getHabitLogsForDate(date)` — todos los `habit_logs` propios de una fecha (RLS los acota, sin filtro manual).
- `createHabitLog(payload)` — INSERT; nunca envía un snapshot "real": `goal_type_snapshot` es NOT NULL sin `DEFAULT` en la tabla (el tipo `Insert` generado lo exige), así que se envía un placeholder (`"boolean"`) que `set_habit_log_goal_snapshot_trg` sobrescribe incondicionalmente — verificado en vivo (caso 13). Las otras tres columnas de snapshot ni siquiera se incluyen en el payload.
- `updateHabitLog(id, payload)` — UPDATE únicamente; el payload no admite `habit_id`, `date` ni ninguna columna `*_snapshot`, ni siquiera a nivel de tipo.
- `deleteHabitLog(id)` — usado por la acción "Reiniciar" ya existente en la UI, para volver a "Pendiente" (ausencia de fila).
- Validación previa a Supabase: `value` debe ser un número finito ≥ 0 (misma regla que `habit_logs_value_non_negative_chk`); `recordedTime` debe tener formato `HH:MM`; `note` se recorta y se normaliza a `null` si queda vacía.
- `mapHabitLogError()` traduce a mensajes amigables: ventana de 7 días, fecha futura, el límite real de `goal_progress_source` para tipos sin fórmula de progreso aprobada (ver "Hallazgos" abajo), duplicado (`23505`) y "no encontrado" — nunca texto crudo de Postgres/PostgREST.

### Hook (`src/hooks/useDailyChecklist.ts`)

Reescrito para alternar mock/Supabase (`VITE_DATA_SOURCE`) preservando la rama mock **sin ningún cambio de comportamiento** (mismos imports, misma lógica de `overrides`). En modo Supabase: reutiliza `useHabits()` (ya existente) para los hábitos activos — no duplica esa lógica —, carga `habit_logs` de la fecha seleccionada, y combina ambos con `isHabitScheduledForDate` (reutilizada, no reinventada) exactamente igual que la rama mock. Decide `crear` vs. `actualizar` mirando si ya existe una fila cargada para `(habit, fecha)` — nunca `INSERT` si ya existe. Prioriza consistencia: cada mutación exitosa vuelve a pedir los logs de la fecha (mismo criterio ya usado en `useHabits`/`useCategories`). Expone `loading`, `error`, `actionError` e `isSaving(habitId)` nuevos; `DailyChecklistPage`/`HabitMissionCard` no cambiaron su lógica, solo consumen estos campos nuevos para los estados mínimos pedidos.

### Vista conectada

**Checklist diario**, sin rediseño. Se agregaron: skeleton de carga, banner de error (carga y por acción), y un indicador "guardando" mínimo (spinner de 12px) junto al nombre del hábito en `HabitMissionCard` — mismo patrón visual que el candado de solo lectura ya existente. Nada de layout, navegación ni componentes se reestructuró.

### Estados y tipos de hábito

Los cinco estados reales del enum siguen siendo los únicos usados. Los cuatro tipos pedidos (`boolean`/`quantity`/`duration`/`repetitions`) — y también `deadline`/`accumulated_days`, que la UI ya soportaba — se derivan con las mismas funciones puras ya existentes (`deriveStatusFromValue`/`deriveStatusFromDeadline`), reutilizadas sin cambios; el servicio nunca decide el estado, solo lo persiste.

### Errores corregidos durante la prueba

1. **`DailyChecklistPage.tsx` abría siempre en la fecha fija de la era mock (`2026-07-21`), sin importar el modo.** `initialDate` usaba `TODAY` (`src/data/referenceDate.ts`) como valor por defecto incondicional. En modo Supabase esto hacía que el checklist mostrara "Hoy es 21 de julio" con la fecha real siendo otra, y las consultas a `habit_logs` se hacían contra esa fecha ficticia — el checklist real quedaba, en la práctica, inutilizable. Corregido: el valor por defecto ahora es la fecha real (`toDateOnly(new Date())`) en modo Supabase, y sigue siendo `TODAY` sin ningún cambio en modo mock. Es parte de la propia vista que esta tarea debía conectar, no un módulo ajeno.
2. **Sin bug de código en `habitLogs.service.ts`/`useDailyChecklist.ts`** — los dos hallazgos reales de esta tarea fueron el de arriba y una configuración incorrecta de mis propios datos de prueba (ver "Hallazgo de prueba, no de código" abajo).

### Hallazgo de prueba, no de código (documentado por transparencia)

Al probar el caso "las metas relacionadas cambian automáticamente", el primer intento falló porque el hábito de prueba quedó con `allow_partial = false` — no por un defecto equivocado del formulario, sino porque `HabitFormModal` inicializa "Permitir registros parciales" en `true` por defecto (confirmado por inspección: `aria-checked="true"` antes de cualquier interacción) y el script de prueba le dio un clic de más, apagándolo. Con `allow_partial = false`, un valor por debajo de la meta produce `status = not_completed`, que **correctamente** queda excluido de la suma de `compute_goal_habit_logs_progress` (solo `completed`/`partial` cuentan, D-05) — el comportamiento del backend fue el correcto en todo momento. Corregido el script de prueba (no la app) y confirmado el caso 14 con éxito.

### Límite real y documentado (no un bug, comportamiento intencional de D-05)

Una meta con `progress_source = 'habit_logs'` vinculada a un hábito `boolean`, `deadline` o `accumulated_days` (sin fórmula de progreso aprobada, `20260731004632_goal_progress_source.sql`) hace que **cualquier** escritura de `habit_log` para ese hábito sea rechazada por `compute_goal_habit_logs_progress`. `mapHabitLogError()` lo traduce a un mensaje amigable en vez de mostrar el error técnico, pero no intenta evadir ni recalcular nada — es una limitación real y ya documentada del esquema, no algo que este servicio deba (o pueda) resolver.

### Resultados de las pruebas (Supabase Local, dos usuarios reales, vía UI + Playwright + llamadas autenticadas directas)

**Todos los casos correctos.**

| # | Caso | Resultado |
|---|---|---|
| 1 | A marca "Meditar" (boolean) como completed | `INSERT` real, `201` |
| 2 | Recarga — el estado permanece | Confirmado tras `reload()` real del navegador |
| 3-5 | Cambia a partial → not_completed → completed | `UPDATE` real (mismo endpoint que `updateHabitLog`); el toggle booleano de la UI solo alterna completed/not_completed — "partial" no es alcanzable en un hábito `boolean` por diseño de la propia UI (no de esta tarea), así que se ejerció el mismo camino de servidor con `status` explícito |
| 6 | Registrar cantidad ("Beber agua") | Vía UI real, `value=8`, `status=completed` |
| 7 | Registrar duración ("Leer") | Cronómetro real de la UI crea el log; verificación de fondo lleva el valor a la meta (`QuickTimeTracker` es un cronómetro en vivo — alcanzar 20 minutos reales no es practicable en una prueba automatizada) |
| 8 | Registrar repeticiones ("Flexiones") | Vía UI real, `value=20`, `status=completed` |
| 9 | Editar un día con 8 días de antigüedad | `INSERT` rechazado: `"habit_logs: records older than the seven-day edit window are read-only"` |
| 9b | La UI marca ese día como solo lectura | Candado visible, confirmado |
| 10 | Editar un día futuro | `INSERT` rechazado: `"habit_logs: future dates are not allowed"` |
| 10b | La UI marca ese día como solo lectura | Candado visible, confirmado |
| 11 | B nunca ve registros de A | UI sin hábitos de A; lectura directa con el token de B de los `habit_logs` de A y de la fecha de hoy: 0 filas en ambos casos |
| 12 | No se crean logs duplicados | Segundo `INSERT` para `(habit_id, date)` ya existente → `409`, `23505`, `habit_logs_habit_id_date_key` |
| 13 | Los snapshots se generan automáticamente | `goal_type_snapshot=quantity`, `target_value_snapshot=8`, `target_unit_snapshot=vasos` — coinciden con la config real del hábito, no con el placeholder `"boolean"` enviado |
| 14 | Las metas relacionadas cambian automáticamente | Meta vinculada (`progress_source=habit_logs`) creada con `current_value=0`; tras registrar `value=6` en el hábito vinculado, `current_value` pasó a `6` sin ninguna escritura manual |
| 15 | No hay escritura manual sobre goals | Confirmado por revisión de código (`grep` sin resultados de `.from("goals")` en `src/`) y en vivo: un intento directo de `PATCH current_value=999` fue rechazado por `protect_goal_current_value_trg` |
| 16-18 | TypeScript / lint / build | Los tres en verde |

### Validación RLS

Verificada con el token real de cada usuario (no solo desde la UI): B no puede leer ningún `habit_log` de A (RLS vía `habits.user_id`); el aislamiento se confirmó tanto por fecha como por `habit_id` directo.

### Validación de snapshots

Confirmado en vivo (caso 13): el valor que el cliente envía para `goal_type_snapshot` (un placeholder fijo, `"boolean"`, requerido solo por el tipo `Insert` generado) nunca llega a persistirse — el trigger lo sobrescribe siempre con la configuración real del hábito en el momento de la creación.

### Validación de Goal Progress automático

Confirmado en vivo (casos 14 y 15): `current_value` cambia automáticamente al registrar un `habit_log` calificado, y un intento directo de escribirlo manualmente es rechazado por el propio trigger de protección, con el valor recalculado real incluido en el mensaje de error.

### Bugs encontrados y corregidos

1. `DailyChecklistPage.tsx` abría siempre en la fecha fija mock (`2026-07-21`) en vez de la fecha real, en cualquier modo — corregido (ver arriba). Es la única corrección de código de esta tarea.

### Limitaciones pendientes

- Metas vinculadas a hábitos `boolean`/`deadline`/`accumulated_days` no pueden tener `habit_logs` registrados mientras `progress_source='habit_logs'` (limitación real y ya documentada de D-05, no de esta tarea) — el mensaje queda traducido a amigable, pero la restricción en sí no se puede levantar sin una fórmula de progreso aprobada para esos tipos.
- `isLogEditable`/`EDITABLE_WINDOW_DAYS` (`src/utils/dateRestrictions.ts`, era mock) permite 8 días de diferencia en vez de 7 — desajuste preexistente, no tocado (afecta solo al modo mock, sin trigger real que lo contradiga ahí). El modo Supabase implementa la ventana correcta de forma independiente en `useDailyChecklist.ts`.
- El indicador "guardando" es un solo spinner por tarjeta (no distingue qué campo específico se está guardando) — suficiente para el alcance mínimo pedido.

### Confirmaciones

- No se modificó ninguna migración existente ni se creó ninguna nueva.
- No se ejecutó `supabase db push`; no se tocó el proyecto remoto — todo se probó contra Supabase Local.
- No se eliminó ningún mock.
- Ninguna meta se recalculó desde React — `current_value`/`status`/`progress` de `goals` nunca se leen ni se escriben desde el frontend en esta tarea.
- Ningún snapshot se escribió desde React con un valor real — solo el placeholder documentado, requerido por el tipo generado y descartado siempre por el trigger.
- No se hizo `git add`, `commit` ni `push`.
- `.env.local` quedó nuevamente en `VITE_DATA_SOURCE=mock` al terminar.

---

## CRUD real de metas

**Fecha:** 2026-08-05.

### Esquema real confirmado (`database.types.ts`, no asumido)

`public.goals`: `id, user_id, habit_id, title, description, target_value, current_value, unit, start_date, end_date, status, goal_lifecycle_status, progress_source, created_at, updated_at`.

**Discrepancia real frente al encargo, confirmada antes de escribir código:** `goals` **no tiene** columna `goal_type` ni `deadline_time` propias — a diferencia de `habits`. La columna es `title`, no `name`. El "tipo" relevante para decidir si `progress_source=habit_logs` tiene fórmula de progreso soportada es el `goal_type` del **hábito vinculado** (`habits.goal_type`, leído explícitamente por el servicio), no un campo de `goals` — no se inventó ninguna columna.

Enums confirmados: `goal_status` (`active`/`completed`/`expired`), `goal_lifecycle_status` (`active`/`paused`/`deleted`, D-02), `goal_progress_source` (`habit_logs`/`calculated`/`manual`, D-05). Constraints confirmados: `goals_target_value_positive_chk`, `goals_end_date_after_start_chk`, `goals_current_value_non_negative_chk`, `goals_progress_source_habit_id_coherence_chk`. Triggers confirmados: `protect_goals_user_id_trg`, `validate_goal_habit_ownership_trg`, `protect_goal_progress_source_trg`, `protect_goal_current_value_trg`, `sync_goal_progress_from_habit_log_trg`, `sync_goal_progress_from_goal_change_trg`. RLS: políticas separadas de SELECT/INSERT/UPDATE (sin DELETE), con `habit_id` reforzado en INSERT/UPDATE. `table_privileges.sql`: `SELECT, INSERT, UPDATE` únicamente, sin `DELETE`.

### Servicio (`src/services/goals.service.ts`)

Las 11 funciones pedidas: `getGoals`, `getActiveGoals`, `getPausedGoals`, `getDeletedGoals`, `getGoalById`, `createGoal`, `updateGoal`, `pauseGoal`, `reactivateGoal`, `softDeleteGoal`, `restoreGoal` — más `updateManualGoalProgress`, la única función autorizada para escribir `current_value` directamente (y solo si `progress_source=manual`, verificado leyendo la meta antes de escribir). `createGoal` decide `progress_source` una única vez (tipo `CreatableGoalProgressSource = "habit_logs" | "manual"` — `"calculated"` deliberadamente no existe en el tipo, sin fórmula aprobada por D-05, sin camino de creación ni en la UI ni en el servicio). Para `habit_logs`, valida (leyendo `habits.goal_type`, acotado por RLS) que el hábito admita progreso automático (`quantity`/`duration`/`repetitions`) antes de insertar, y nunca envía `current_value` (queda en el `DEFAULT` de la columna, 0). `updateGoal` nunca acepta `user_id`/`progress_source`/`current_value`/`status`/`goal_lifecycle_status` ni a nivel de tipo; `habitId` solo se permite si la meta ya es `habit_logs` (revalidando el hábito nuevo). Pausar/reactivar/eliminar/restaurar son un único `UPDATE goal_lifecycle_status`, nunca `DELETE`.

### Hook (`src/hooks/useGoals.ts`)

Alterna mock/Supabase. En modo mock, no envuelve `useGoalsManager.ts` (se deja intacto, sin importar ni modificar — mismo criterio que `useHabitsManager.ts` en la tarea de hábitos): implementa su propia rama en memoria con la misma forma unificada (`lifecycleStatus`/`progressSource` simulados, todas las metas mock nacen `active`/`manual`). Expone `goals`, `activeGoals`, `pausedGoals`, `deletedGoals`, `loading`, `error`, `refresh` y las 7 mutaciones — consistencia por refetch completo tras cada mutación real, igual que hábitos/checklist.

### Integración visual

**Página Metas**, sin mover navegación ni cambiar layout general. Cambios necesarios para conectarla de verdad:

- `GoalFormModal.tsx` ya **no** importa `browsableHabits` (mock) directamente — recibe `habitOptions` como prop desde `GoalsPage`, que a su vez los obtiene de `useHabits()` (ya alternaba mock/Supabase). El selector "Asociada a" decide `progress_source` (general → `manual`, hábito específico → `habit_logs`); en edición de una meta real, el selector queda restringido/bloqueado a opciones compatibles con el origen ya fijado (inmutable). El campo "Valor actual" se deshabilita cuando la meta está vinculada a un hábito.
- Se agregaron pestañas de ciclo de vida (**Activas / Pausadas / Papelera**, en ambos modos) sobre las ya existentes de estado funcional (Todas/Activas/Cumplidas/Vencidas) — dos filtros independientes, uno por eje.
- `GoalGeneralHero.tsx` (metas sin hábito) **no tenía ninguna acción** — se le agregaron Editar/Pausar/Reactivar/Eliminar/Restaurar (mínimas, mismos íconos que `GoalListRow`), porque sin eso una meta manual/general quedaba literalmente inedITable desde la interfaz conectada.
- `GoalListRow.tsx` cambió sus acciones de "Marcar como cumplida/vencida" (cambiaban `status`, sin trigger que lo automatice — prohibido explícitamente por esta tarea) a Pausar/Reactivar/Eliminar/Restaurar (`goal_lifecycle_status`, con soporte real de base de datos). El `status` funcional se sigue mostrando tal cual está persistido, sin ninguna acción que lo modifique.
- Estados agregados: skeleton de carga, banner de error, badge "Guardando" (opacidad) por fila/tarjeta durante una mutación, badges de lifecycle y de `progress_source` ("Automático"/"Manual") junto al hábito o "Meta general".

### Separación status / lifecycle / progress_source

Verificada en vivo (caso 17): una meta pausada conservó `current_value=25` y `status="active"` simultáneamente — los tres ejes nunca se mezclaron en ningún punto del servicio, el hook ni la UI.

### Tipos soportados / no soportados para `progress_source=habit_logs`

Soportados: `quantity`, `duration`, `repetitions` (fórmula real en `compute_goal_habit_logs_progress`). No soportados: `boolean`, `deadline`, `accumulated_days`. `GoalFormModal` los rechaza con mensaje amigable antes de enviar nada a Supabase. **Hallazgo real importante** (ver "Bugs y hallazgos" abajo): la tabla `goals` no tiene ningún CHECK que valide `goal_type` del hábito al `INSERT` — la única protección real ocurre cuando se escribe el primer `habit_log` calificado del hábito vinculado, no al crear la meta.

### Progreso manual y automático

Manual: verificado en vivo (caso 2), `updateManualGoalProgress` actualiza `current_value` vía UI. Automático: verificado en vivo (caso 7), un `habit_log` editado desde el Checklist recalculó `current_value` de la meta vinculada sin ninguna escritura desde React (caso 8: el `POST` de creación nunca incluyó `current_value`).

### Pruebas A/B y RLS

**32/32 casos correctos** contra Supabase Local, con dos usuarios reales (vía UI + Playwright + llamadas autenticadas directas, sin SQL manual). B nunca pudo leer ni actualizar la meta de A por id directo (RLS); A no pudo vincular una meta al hábito de B (`validate_goal_habit_ownership_trg`); `DELETE` físico rechazado (`403`, sin `GRANT`); `user_id`/`progress_source`/`current_value` (para `habit_logs`) protegidos por sus respectivos triggers, confirmado con el mensaje real de cada uno.

### Errores corregidos durante la prueba (código de la app)

1. **`GoalGeneralHero.tsx` no tenía ninguna acción** — una meta manual/general era, en la práctica, imposible de editar/pausar/eliminar desde la interfaz conectada (ver "Integración visual"). Corregido agregando las mismas acciones que ya existían para metas por hábito.
2. Ningún otro bug de código — el resto de los hallazgos de esta tarea son características reales (y correctas) del esquema, no errores introducidos aquí.

### Hallazgo real de base de datos (reportado, no "corregido" en React — sin nueva migración)

`current_value` de una meta `progress_source=habit_logs` **no se recalcula automáticamente al crearla**, aunque el hábito vinculado ya tenga `habit_logs` calificados dentro del rango de fechas de la meta — confirmado en vivo (caso 6: `current_value` quedó en `0` al crear, a pesar de un log preexistente con `value=3`). Causa raíz confirmada por lectura directa de `20260731004632_goal_progress_source.sql`: `sync_goal_progress_from_habit_log_trg` es `AFTER INSERT/UPDATE/DELETE ON habit_logs` (reacciona a cambios en los registros, no a la creación de la meta) y `sync_goal_progress_from_goal_change_trg` es `AFTER UPDATE OF habit_id/start_date/end_date ON goals` (reacciona a cambios posteriores de la meta) — **no existe ningún trigger `AFTER INSERT ON goals`**. El valor se corrige solo, correctamente, en cuanto el hábito vinculado recibe su próximo `habit_log` (caso 7, ya verificado). Siguiendo la instrucción explícita de esta tarea, **no se inventó ningún workaround en React** (por ejemplo, llamar a un recálculo manual) ni se creó una migración nueva sin autorización — se reporta tal cual.

### Limitaciones pendientes

- El gap de arriba (recálculo al crear) requeriría una migración nueva (`AFTER INSERT ON goals` o una función RPC de creación) — no autorizada en esta tarea.
- No existe validación a nivel de `CHECK` en `goals` que impida vincular, al crear, un hábito con `goal_type` no soportado — la protección real ocurre en `compute_goal_habit_logs_progress`, al primer `habit_log`. El servicio y la UI ya lo previenen antes (defensa en profundidad), pero un cliente que evite ambos (API directa) solo lo descubre al escribir el primer log, no al crear la meta — confirmado en vivo (caso 13b/13c).
- `progress_source='calculated'` sigue sin fórmula aprobada (D-05) — ni el servicio ni la UI ofrecen ningún camino para crearlo, tal como pide esta tarea.
- Reclasificar `habit_id` de una meta `habit_logs` a otro hábito está implementado y probado indirectamente (vía `updateGoal`), pero no tenía un caso de prueba dedicado en la lista de 32 — el trigger `sync_goal_progress_from_goal_change_trg` ya está confirmado como correcto por lectura de código.
- `useGoalsManager.ts` (hook mock anterior) quedó sin usar, sin eliminar — mismo criterio que `useHabitsManager.ts`.

### Confirmaciones

- No se modificó ninguna migración; no se creó ninguna migración nueva (el hallazgo de arriba se reportó, no se resolvió con SQL).
- No se ejecutó `supabase db push`; no se tocó el proyecto remoto — todo se probó contra Supabase Local.
- No se conectó Historial, Estadísticas ni Dashboard real.
- No se eliminó ningún mock.
- Ningún `current_value` se escribió automáticamente desde React — solo `updateManualGoalProgress`, y solo para `progress_source=manual`, verificado por el propio usuario mediante la UI.
- `status` nunca se modifica desde React tras la creación — confirmado en vivo (caso 28) y por revisión de código.
- No se hizo `git add`, `commit` ni `push`.
- `.env.local` quedó nuevamente en `VITE_DATA_SOURCE=mock` al terminar.

---

## Corrección de integridad de metas

**Fecha:** 2026-08-05. Migración nueva y aditiva: `supabase/migrations/20260805171711_goal_integrity_fixes.sql`. Cierra dos hallazgos reales detectados durante las pruebas en vivo del CRUD de metas, ambos auditados primero (sin código) antes de escribir ningún SQL.

### Causa de ambos hallazgos

- **Hallazgo 1 (current_value nace en 0):** ningún trigger existente reacciona al `INSERT` de la propia `goals` — `sync_goal_progress_from_habit_log_trg` es `AFTER INSERT/UPDATE/DELETE ON habit_logs` (reacciona a los logs, no a la meta) y `sync_goal_progress_from_goal_change_trg` es `AFTER UPDATE OF habit_id/start_date/end_date ON goals` — la cláusula `UPDATE OF` nunca se dispara en un `INSERT`, por diseño de PostgreSQL.
- **Hallazgo 2 (tipos no soportados aceptados al crear):** `goals_progress_source_habit_id_coherence_chk` solo valida que `habit_id` no sea nulo — un `CHECK` constraint no puede consultar `habits.goal_type` (no admite subconsultas a otra tabla). No existía ningún trigger `BEFORE INSERT` que lo validara; el único rechazo real ocurría, tarde, dentro de `compute_goal_habit_logs_progress` al escribir el primer `habit_log`.

### Triggers y funciones nuevos

- **`public.validate_goal_habit_logs_goal_type()`** — `BEFORE INSERT OR UPDATE ON public.goals`, trigger `validate_goal_habit_logs_goal_type_trg`. Rechaza `progress_source='habit_logs'` vinculado a un hábito `boolean`/`deadline`/`accumulated_days` (misma lista blanca que `compute_goal_habit_logs_progress`, sin fórmula nueva). **`SECURITY INVOKER`** (deliberado, no el `SECURITY DEFINER` sugerido originalmente): la consulta a `habits` queda sujeta a la RLS del cliente, igual que `validate_goal_habit_ownership()` y `set_habit_log_goal_snapshot()` — si `habit_id` es ajeno o no existe, la consulta no ve nada y la función no hace nada, dejando el rechazo real a `validate_goal_habit_ownership_trg` con su mensaje original. Se evaluó `SECURITY DEFINER` y se descartó: habría permitido leer el `goal_type` de un hábito ajeno y, en el caso (hábito ajeno + tipo no soportado), revelar por error el mensaje de "tipo no soportado" en vez del de "propiedad" — una fuga de información menor pero real, evitada con esta elección.
- **`public.sync_goal_progress_after_insert()`** — `AFTER INSERT ON public.goals`, trigger `sync_goal_progress_after_insert_trg`. Reutiliza exclusivamente `public.recalculate_goal_current_value(uuid)` (sin modificar) cuando `NEW.progress_source='habit_logs'`. `SECURITY DEFINER`, mismo motivo exacto que `sync_goal_progress_from_habit_log`/`sync_goal_progress_from_goal_change`: necesario para invocar una función con `EXECUTE` revocado de `authenticated`. Registrado únicamente como `AFTER INSERT` (nunca `OR UPDATE`) para evitar recursión: el `UPDATE` interno de `recalculate_goal_current_value()` no puede volver a disparar un trigger de `INSERT`.

Ambas funciones: `set search_path = ''`, referencias totalmente calificadas, sin SQL dinámico, sin `WHEN OTHERS`, `REVOKE EXECUTE FROM PUBLIC, anon, authenticated`, sin ningún `GRANT` directo — solo se invocan vía trigger.

### Bug real encontrado y corregido durante la propia prueba de esta migración

El primer intento de `validate_goal_habit_logs_goal_type()` usaba `format('...%, ...%...', new.id, new.habit_id)` para el `DETAIL` del error — pero `format()` de PostgreSQL requiere `%s`/`%I`/`%L`, no el `%` "pelado" que sí es válido dentro de `RAISE EXCEPTION '...% ...', arg`. El error real (`unrecognized format() type specifier`, `22023`) enmascaraba el mensaje de rechazo pretendido. Corregido a `%s`. Confirmado con los 18 casos de prueba, incluidos los tres tipos rechazados (D-boolean/D-deadline/D-accumulated_days), que ahora muestran el mensaje correcto.

### Orden de triggers confirmado (no asumido, verificado con `information_schema.triggers` tras el `db reset`)

- **BEFORE INSERT:** `validate_goal_habit_logs_goal_type_trg` → `validate_goal_habit_ownership_trg` (orden alfabético; no debilita ownership, ver `SECURITY INVOKER` arriba).
- **BEFORE UPDATE:** `protect_goal_current_value_trg` → `protect_goal_progress_source_trg` → `protect_goals_user_id_trg` → `set_goals_updated_at` → `validate_goal_habit_logs_goal_type_trg` → `validate_goal_habit_ownership_trg`.
- **AFTER INSERT:** `sync_goal_progress_after_insert_trg` (nuevo, único).
- **AFTER UPDATE:** `sync_goal_progress_from_goal_change_trg` (sin cambios).

### Pruebas realizadas (Supabase Local, dos usuarios reales, 18/18 correctas)

| Caso | Resultado |
|---|---|
| A — Recálculo inicial | `current_value` nace en `3` (no en `0`) al crear la meta sobre un hábito con un log previo — **confirmado releyendo la fila con un GET separado**, no con la respuesta del propio `POST` (ver nota de `RETURNING` abajo) |
| B — Sin historial | `current_value = 0`, correcto |
| C — Tipos permitidos | `quantity`, `duration`, `repetitions` aceptados |
| D — Tipos rechazados | `boolean`/`deadline`/`accumulated_days` rechazados **al `INSERT` de la meta**, con el mensaje `"goals: habit_logs progress is not supported for habit goal_type <tipo>"`; ninguna de las tres quedó persistida |
| E — UPDATE | Cambiar `habit_id` de una meta existente a un hábito no soportado se rechaza antes de persistir; la meta conserva su hábito original |
| F — Ownership | A no puede vincular una meta al hábito de B, **ni con un hábito `quantity` de B ni con uno `boolean`** — en ambos casos el mensaje es el de ownership, nunca el de tipo (confirma que el nuevo trigger no se adelanta ni filtra información) |
| G — Protecciones | `progress_source` sigue inmutable; `current_value` sigue protegido; `status`/`goal_lifecycle_status` no cambiaron por ninguna operación de esta prueba |
| H — Checklist | Editar un `habit_log` desde el Checklist real sigue recalculando la meta vinculada (3 + 1 = 4), sin recursión, sin colgarse (respuesta en ~100 ms) |

### Evidencia de current_value inicial correcto (Hallazgo 1)

**Nota real de PostgreSQL, no un defecto del trigger:** la respuesta del propio `POST` (`RETURNING *`) mostró `current_value: 0` incluso con la corrección aplicada — porque `RETURNING` captura la fila tal como quedó tras los triggers `BEFORE`, **antes** de que se ejecuten los triggers `AFTER` de esa misma sentencia. Una consulta `GET` inmediatamente posterior (misma transacción ya confirmada) mostró `current_value: 3`, correcto. **Sin impacto real en la UI**: `useGoals().createGoal()` ya llama a `refresh()` (un `GET` nuevo) inmediatamente después de crear — exactamente por este motivo, documentado ya en la tarea anterior — así que el usuario nunca ve el `0` transitorio.

### Evidencia de rechazo temprano (Hallazgo 2)

Los tres `INSERT` directos (`boolean`/`deadline`/`accumulated_days`) devolvieron `400` con `code: "P0001"` y el mensaje `"goals: habit_logs progress is not supported for habit goal_type <tipo>"` — antes de que existiera ningún `habit_log`, confirmando que el rechazo ahora ocurre al crear la meta, no al primer registro diario.

### Evidencia de ownership A/B

Dos intentos de A vinculando una meta a hábitos de B (uno `quantity`, uno `boolean`) — ambos rechazados con el mismo mensaje de ownership (`"does not belong to the same user as the goal"`); el segundo caso confirma explícitamente que el mensaje NO fue el de "tipo no soportado" a pesar de que el hábito de B era `boolean`.

### Evidencia de ausencia de recursión

El caso H completó en ~100 ms tras editar un `habit_log` real desde el Checklist, sin timeout ni bloqueo, con `current_value` matemáticamente correcto (sin duplicar ni perder el incremento) — descarta recursión y deadlock entre `sync_goal_progress_after_insert_trg` (nuevo, solo `AFTER INSERT`) y los triggers ya existentes sobre `habit_logs`/`goals`.

### Resultado técnico

`npx supabase db reset --local --no-seed`: 14 migraciones aplicadas sin error. `npx tsc --noEmit`, `npm run lint`, `npm run build`: los tres en verde — sin cambios de frontend ni de servicios en esta tarea.

### Adenda — garantía de concurrencia (BUG-002, ver MDs/13_E2E_QA_TEST_PLAN.md § Retest BUG-002)

Las pruebas de este bloque se ejecutaron con operaciones **secuenciales** (una escritura a la vez), por lo que no ejercitaron el caso de una meta creada en el mismo instante en que se edita un `habit_log` del hábito recién vinculado desde OTRA sesión/conexión — ese escenario sí producía `current_value` desactualizado (BUG-002, encontrado en 6.3D). La migración `20260806162035_goal_progress_concurrency.sql` cierra esa ventana: `sync_goal_progress_after_insert()`, `sync_goal_progress_from_goal_change()` y `sync_goal_progress_from_habit_log()` ahora adquieren un lock `FOR UPDATE` sobre `public.habits.id` (el hábito vinculado) **antes** de leer o escribir cualquier `goals`/`habit_logs` relacionado, serializando toda operación concurrente sobre el mismo hábito sin bloquear hábitos distintos entre sí. Retest: 170 iteraciones concurrentes (8 variantes × 20, más una variante de estrés de deadlock × 10) contra Supabase Local, 0 discrepancias, 0 deadlocks, 0 timeouts — ver el documento de QA para el detalle completo.

### Riesgos y limitaciones

- El orden alfabético real (`validate_goal_habit_logs_goal_type_trg` antes que `validate_goal_habit_ownership_trg` en `BEFORE INSERT`) no se "corrigió" renombrando triggers (se conservó el nombre exacto pedido) — se resolvió con `SECURITY INVOKER`, una solución más robusta porque no depende del orden de ejecución para ser correcta.
- Esta migración no toca `progress_source='calculated'` (sigue sin fórmula aprobada, D-05) ni ningún otro aspecto del módulo de Metas más allá de los dos hallazgos indicados.

### Confirmación de que no se modificó frontend

`git status` confirma que, además de la nueva migración, ningún archivo de `src/` cambió en esta tarea — `goals.service.ts`, `habitLogs.service.ts`, `useGoals.ts` y `useDailyChecklist.ts` se inspeccionaron (tal como pedía el encargo) pero no se modificaron.

## Historial

**Fecha:** 2026-08-05. Conecta la pantalla de Historial (ya existente, mock-era) contra `habit_logs` real de Supabase Local. Historial es una vista de consulta pura: nunca crea, edita ni borra por su cuenta, nunca toca `goals`, nunca recalcula cumplimiento de periodicidad. Sin migraciones nuevas — esta tarea es 100% de servicio/hook/frontend.

### Auditoría previa (esquema confirmado, sin inventar columnas)

`habit_logs` (confirmado leyendo `database.types.ts`, fuente de verdad): `id, habit_id, date, status, value, note, recorded_time, created_at, updated_at` más las cuatro columnas de snapshot `goal_type_snapshot` (NOT NULL), `target_value_snapshot`, `target_unit_snapshot`, `deadline_time_snapshot` — asignadas incondicionalmente por `set_habit_log_goal_snapshot_trg` (BEFORE INSERT) y protegidas de cualquier UPDATE por `protect_habit_log_goal_snapshot_trg`. RLS ya restringe todo `SELECT`/`INSERT`/`UPDATE`/`DELETE` al dueño del hábito (política `EXISTS` sobre `habits.user_id = auth.uid()`, sin cambios). Ventana de edición real: `enforce_habit_log_edit_window_trg` (BEFORE INSERT/UPDATE/DELETE) — rechaza fechas futuras y fechas anteriores a `hoy - 6` (7 días inclusive), para INSERT tanto como para UPDATE/DELETE. `habitLogs.service.ts` ya tenía `getHabitLogsForDate`, `createHabitLog`, `updateHabitLog`, `deleteHabitLog` (de la tarea de Checklist) — ninguno se duplicó.

### Archivos creados

Ninguno.

### Archivos modificados

- `src/services/habitLogs.service.ts` — una única función nueva: `getHabitLogsHistory()` (todo el historial propio, sin filtro de fecha, orden `date desc`; RLS ya acota por dueño). Se evaluó explícitamente añadir `getHabitLogsBetween()`/`getHabitLogsByHabit()`/`getHabitLog()` (sugeridas en el encargo) y se descartaron: con el patrón ya establecido en `useHabits`/`useCategories`/`useGoals` ("fetch completo, filtra en cliente"), esas tres funciones habrían quedado sin ningún punto de llamada real — código muerto, contrario a "no inventes".
- `src/hooks/useHistoryLogs.ts` — reescrito en modo dual mock/Supabase, mismo patrón que el resto del proyecto. Detalle en la sección siguiente.
- `src/components/history/HistoryFilters.tsx` — ya no importa `browsableHabits` (de `useHistoryLogs`) ni `mockCategories` directamente; recibe `habitOptions`/`categoryOptions` como props (mismo patrón que `GoalFormModal` con `habitOptions` en la tarea de Metas).
- `src/components/history/HistoryTable.tsx` — la columna "Meta" (desktop y tarjeta móvil) lee `entry.targetValue` en vez de `entry.habit.targetValue`.
- `src/components/history/HistoryCalendar.tsx` — recibe una nueva prop `entries` (el histórico completo, sin recorte por `dateFrom`/`dateTo`) en vez de leer `getEntriesForDay`/`statusToDayRate` sobre el array global `mockHabitLogs`; el detalle del día lee `entry.targetUnit` en vez de `entry.habit.targetUnit`. Además corrige un bug real (ver más abajo): el mes/día por defecto y el resaltado "hoy" usaban la fecha fija de mock en vez de la fecha real.
- `src/utils/exportHistory.ts` — la columna "Meta" del CSV exportado lee `entry.targetValue` en vez de `entry.habit.targetValue`.
- `src/pages/HistoryPage.tsx` — pasa `habitOptions`/`categoryOptions`/`allEntries` a los componentes hijos; agrega estado `loading` (skeleton) y `error` (banner), mismo patrón que `GoalsPage`/`DailyChecklistPage`.

### Funciones implementadas (servicio)

`habitLogsService.getHabitLogsHistory(): Promise<HabitLog[]>` — único punto de lectura para todo el módulo de Historial (tabla, resumen, comparación con periodo anterior y calendario, que navega libremente por mes sin depender del rango `dateFrom`/`dateTo`).

### Hook implementado

`useHistoryLogs()` reescrito para construir, en ambos modos, un mismo `sourceEntries: HistoryEntry[]` (el histórico completo, con el hábito ya resuelto y las filas de hábitos eliminados ya excluidas) y aplicar sobre él **las mismas funciones puras** en ambos modos (`matchesFilters`, `computeRangeSummary`, `computeDailyTrend`, `getEntriesForDay`, `getStatusCountsForDate`) — antes esas funciones leían directamente el array global `mockHabitLogs`/`mockHabits`; ahora reciben el conjunto de origen como parámetro, sin duplicar la lógica de filtrado/agregación entre modos.

- **Modo mock:** `sourceEntries` se construye desde `mockHabitLogs` + `getHabitById` (comportamiento visual idéntico al anterior — la meta mostrada sigue siendo `habit.targetValue`/`targetUnit`, porque el mock nunca tuvo columnas `*_snapshot`).
- **Modo Supabase:** `sourceEntries` se construye desde `habitLogsService.getHabitLogsHistory()` + `useHabits()` (ya conectado, reutilizado — nunca se importa un mock de hábitos). La meta mostrada (`targetValue`/`targetUnit` de cada `HistoryEntry`) sale **siempre** de `target_value_snapshot`/`target_unit_snapshot` del propio `habit_log`, nunca del hábito vigente — ver "Evidencia de snapshots históricos" abajo.
- `habitOptions`/`categoryOptions` (para los `<select>` de filtro) también salen de `useHabits()`/`useCategories()` en modo Supabase, en vez del `browsableHabits`/`mockCategories` fijos — un hallazgo real: bajo el diseño original, el filtro por categoría en modo Supabase habría sido completamente inoperante (los IDs de `mockCategories` son cadenas fijas tipo `cat-salud`, que nunca coinciden con los UUID reales de `categories`).
- `isEditable` en modo Supabase reutiliza la misma regla de ventana de 7 días real que ya usa `useDailyChecklist.ts` (`isWithinRealEditWindow`, duplicada deliberadamente como función local de 3 líneas porque esa otra función no está exportada y esta tarea prohíbe modificar `useDailyChecklist.ts`) — verificado contra el trigger real: el límite es `hoy - 6` inclusive en ambos.

### Vista conectada

`HistoryPage.tsx`/`HistoryFilters.tsx`/`HistorySummary.tsx`/`HistoryTable.tsx`/`HistoryCalendar.tsx` sin ningún cambio de layout, navegación ni estilos — solo el recableado de props descrito arriba y los estados `loading`/`error` (spinner/skeleton + banner, mismo componente `Skeleton` que ya usan Metas/Checklist).

**Edición:** `HistoryTable.tsx` ya enlazaba el icono de lápiz a `/checklist?date={fecha}` (sin formulario propio) — `DailyChecklistPage.tsx` ya leía ese `?date=` y lo pasaba como `initialDate` a `useDailyChecklist`, que ya llama a `updateHabitLog()` real. **No se escribió ningún código de edición nuevo**: el flujo "editar desde Historial" ya funcionaba de punta a punta con la infraestructura de Checklist, verificado en vivo (caso 8).

**Eliminación:** `HistoryTable.tsx` no ofrece ninguna acción de borrado (solo el icono de lápiz o el candado de solo lectura) — por instrucción explícita del encargo, no se agregó ninguna.

### Filtros implementados

Fecha (`dateFrom`/`dateTo`, por defecto últimos 30 días desde hoy), hábito, categoría (vía `habit.categoryIds`, ya presente en el modelo visual de `useHabits()`) y estado (`pending/completed/partial/not_completed/not_applicable`) — los cuatro ya existían en la UI; ninguno es nuevo. No se agregó filtro de texto: no existe ningún campo de texto libre indexable más allá de `note`, y el encargo pide explícitamente no inventar uno sin un campo real que lo sustente.

### Bugs reales encontrados y corregidos durante la propia prueba de esta tarea

1. **Rango de fechas por defecto usaba la fecha fija de mock en modo Supabase.** `dateFrom`/`dateTo` se inicializaban con `TODAY` de `src/data/referenceDate.ts` (fecha fija de la era mock, `2026-07-21`) sin importar el modo — en Supabase real, cualquier `habit_log` recién creado (fecha real de hoy) quedaba fuera del rango inicial y el historial parecía vacío. Corregido con un `DEFAULT_REFERENCE_DATE` que usa `toDateOnly(new Date())` en modo Supabase, mismo patrón que `DailyChecklistPage.tsx` ya usa para su propio `defaultDate`.
2. **Mismo bug, independiente, en `HistoryCalendar.tsx`.** El mes/día por defecto (`startOfMonth(TODAY)`, `selectedDay`) y el resaltado visual "hoy" (`isToday = date === TODAY`) también leían el `TODAY` fijo de mock — el calendario en modo Supabase abría siempre en julio de 2026 en vez del mes real, y el detalle del día seleccionado no coincidía con ningún registro real. Corregido con la misma técnica (`toDateOnly(new Date())` cuando `isSupabaseDataSource`).

Ambos bugs bloqueaban directamente la implementación correcta de Historial (no son parte de un módulo ya congelado — son la propia pantalla de esta tarea), así que se corrigieron in situ, verificados con Playwright antes y después de cada corrección.

### Resultado de los 20 casos de prueba (Supabase Local, dos usuarios reales)

| # | Caso | Resultado |
|---|---|---|
| 1 | Historial vacío | `EmptyState` visible antes de crear ningún registro |
| 2 | Historial con un registro | 1 fila, meta mostrada = 8 (snapshot inicial correcto) |
| 3 | Historial con múltiples fechas | 4 filas tras crear registros en 4 fechas distintas |
| 4 | Orden descendente | Coincide exactamente con `ORDER BY date DESC` consultado por API |
| 5 | Filtro por hábito | 1 fila al filtrar por "Lectura QA"; insignia "Meta superada" visible (25 > 20) |
| 6 | Filtro por estado | 1 fila al filtrar por "Parcial" |
| 7 | Filtro por rango | 1 fila al acotar `Desde`/`Hasta` al día de hoy |
| 8 | Editar registro dentro de 7 días | Click en el lápiz → `/checklist?date=hoy` → `QuickCounter` → `PATCH /habit_logs` real (8→10) confirmado por API |
| 9 | Editar/crear fuera de la ventana (>7 días) | `INSERT` directo a `hoy-7` rechazado, `400`, `"records older than the seven-day edit window are read-only"` — estructuralmente imposible que exista una fila editable fuera de ventana, porque el mismo trigger bloquea también el `INSERT` |
| 10 | Editar/crear fecha futura | `INSERT` directo a `hoy+1` rechazado, `400`, `"future dates are not allowed"` |
| 11 | Eliminar desde Historial | N/A — la pantalla no ofrece esa acción (confirmado por inspección de código); no se probó porque no se implementó |
| 12 | Recarga → persistencia correcta | 4 filas antes y después de un `reload()` completo de la página |
| 13 | Snapshots históricos correctos | Meta mostrada al crear el registro = 8 (igual al `target_value` del hábito en ese momento) |
| 14 | Cambio de configuración del hábito → Historial conserva snapshot | Tras cambiar `target_value` del hábito de 8 a 99 (y unidad a "litros"), la fila ya existente en Historial sigue mostrando **8**, nunca 99 |
| 15 | Usuario B no ve datos de A | B ve únicamente su propio registro (1 fila); "Agua QA"/"Lectura QA" (de A) no aparecen |
| 16 | RLS por consulta directa | Token de B pidiendo `habit_logs` filtrados por el `habit_id` de A → `200`, arreglo vacío; el mismo filtro con el token de A → sus propias filas |
| 17 | Ningún recálculo de metas desde React | Cero llamadas de red a `/rest/v1/goals` durante todo el flujo (monitoreado con Playwright) — confirma también por inspección que `useHistoryLogs.ts` nunca importa `goals.service.ts` |
| 18 | TypeScript limpio | `npx tsc --noEmit` sin salida |
| 19 | Lint limpio | `npm run lint` sin salida |
| 20 | Build limpio | `npm run build` — `tsc -b && vite build` correcto |

26/26 aserciones automatizadas en verde (algunos casos del enunciado se verificaron con más de una aserción — p. ej. el caso 4 se comprobó tanto visualmente como contra el orden real de la API).

### Evidencia de snapshots históricos (caso 13/14, el punto más importante del encargo)

Se creó el hábito "Agua QA" con `target_value=8`, `target_unit="vasos"`, y un `habit_log` de hoy con `value=8`. Historial mostró **Meta: 8** correctamente al crearse. Después se hizo `PATCH /habits` cambiando `target_value` a `99` y `target_unit` a `"litros"` — **sin tocar el `habit_log` existente**. Al recargar Historial, la fila del registro creado antes del cambio **siguió mostrando Meta: 8**, nunca 99: confirma que `HistoryTable`/`HistoryCalendar`/el CSV exportado leen `target_value_snapshot`/`target_unit_snapshot` del propio `habit_log` (columnas ya escritas por `set_habit_log_goal_snapshot_trg` desde la tarea de Checklist) y no recalculan nada a partir de la configuración vigente del hábito.

### Evidencia RLS

Usuario B, con su propio token, consultó directamente `GET /rest/v1/habit_logs?habit_id=eq.<id-del-hábito-de-A>` → `200 OK` con arreglo vacío (la política RLS `EXISTS (... habits.user_id = auth.uid())` filtra la fila sin necesitar ningún filtro manual del lado del servicio). El mismo hábito consultado con el token de A devolvió sus propias filas. En la UI, el usuario B nunca vio ningún hábito ni registro de A.

### Hallazgos

1. Los dos bugs de "fecha fija de mock en modo Supabase" descritos arriba (rango por defecto de la tabla y mes/día por defecto del calendario) — corregidos.
2. El filtro por categoría habría sido inoperante en modo Supabase con el diseño original (`mockCategories` fijo) — corregido conectándolo a `useCategories()`.
3. El flujo de edición ("Editar desde Historial") ya estaba completamente resuelto por la combinación preexistente `HistoryTable` → `/checklist?date=` → `useDailyChecklist` → `updateHabitLog()`; no fue necesario escribir código de edición nuevo, solo confirmarlo con pruebas reales.

### Limitaciones

- `getHabitLogsHistory()` trae todo el historial propio sin paginar en el servidor (la paginación es 100% de cliente, igual que Habits/Categories/Goals) — adecuado para el volumen de datos de un usuario individual de esta app; no se optimizó para miles de registros por no ser parte del alcance.
- El caso 9 ("editar fuera de la ventana") se verificó de forma estructural (intento de `INSERT` directo a una fecha fuera de ventana, rechazado) en vez de con un `UPDATE` sobre una fila preexistente de más de 7 días — porque, por diseño del propio trigger (`enforce_habit_log_edit_window_trg` cubre también `INSERT`), es imposible crear una fila así incluso para preparar la prueba; no hay ninguna vía (ni por la app ni por REST directo) para que exista un `habit_log` fuera de la ventana de 7 días en este esquema.
- No se probó la vista de calendario con los 20 casos numerados del encargo (que están redactados pensando en la vista de tabla), pero sí se verificó por separado que el calendario respeta los mismos snapshots (`targetUnit`) y filtros, y que el bug de fecha fija también se corrigió ahí.

### Confirmaciones explícitas

No se modificaron migraciones existentes ni se creó ninguna migración nueva. No se ejecutó `db push`. No se tocó Supabase remoto. No se modificó el módulo de Goal Progress ni se escribió ningún `current_value`/`goal` desde este código. No se escribió manualmente ninguna columna `*_snapshot` (las asigna el trigger ya existente). No se recalculan metas desde React en ningún punto de Historial. No se eliminó ningún mock (`mockHabitLogs.ts`, `mockHabits.ts`, `mockCategories.ts` siguen intactos y en uso en modo mock). No se hizo `git add`, `git commit` ni `git push`. `.env.local` quedó revertido a `VITE_DATA_SOURCE=mock` al finalizar.

## Estadísticas

**Fecha:** 2026-08-05. Conecta la pantalla existente de Estadísticas (mock-era) a `habit_logs`/`habits`/`categories` reales de Supabase Local. Estadísticas es un módulo de solo lectura: nunca crea, edita ni borra nada, nunca toca `goals`. Sin migraciones nuevas — 100% servicio/hook/frontend, reutilizando lo ya construido para Historial.

### Fuentes de datos

- `habitLogsService.getHabitLogsHistory()` (ya existente, creado para Historial) — un único fetch de todo el historial propio, sin duplicar consultas ni hacer N+1.
- `useHabits()` (ya conectado) — todos los hábitos propios, cualquier `lifecycle_status`.
- `useCategories()` (ya conectado) — categorías propias, para el filtro y para resolver `categoryIds` por hábito.
- **No se creó `statistics.service.ts`.** Se evaluaron las tres opciones del encargo (A: reutilizar `getHabitLogsHistory()`; B: funciones de lectura nuevas; C: servicio nuevo) y se eligió la A sin reservas: el mismo patrón "fetch completo + agregación en cliente" ya usado en Habits/Categories/Goals/Historial cubre exactamente lo que Estadísticas necesita, sin ninguna consulta nueva al backend.
- **No se muestran metas.** Confirmado por inspección: `StatisticsPage.tsx`/`useStatistics.ts` (mock, antes de esta tarea) nunca importaron `goals.service.ts` ni `useGoals`, y `MDs/04_SCREEN_SPECIFICATIONS.md` (sección 5, Estadísticas) no menciona metas — solo KPIs y gráficas basadas en `habit_logs`. Se preservó esa ausencia; no se agregó nada de metas.

### Archivos creados

Ninguno.

### Archivos modificados

`src/hooks/useStatistics.ts` (reescrito en modo dual), `src/components/statistics/StatisticsFilters.tsx` (recibe `habitOptions`/`categoryOptions` como props en vez de importar `mockCategories`/`statisticsHabits` directamente), `src/pages/StatisticsPage.tsx` (estados `loading`/`error`, pasa las nuevas props).

### Servicio / capa de lectura

Ninguna función nueva en ningún servicio — todo el módulo reutiliza `habitLogsService.getHabitLogsHistory()` (ya existente).

### Hook implementado

`useStatistics()` reescrito en modo dual mock/Supabase, mismo patrón que `useHistoryLogs()`: construye un `allLogs: LogWithHabit[]` único (mock: `mockHabitLogs`; Supabase: `getHabitLogsHistory()` + `useHabits()`) y un `habitsById: Map<string, Habit>` (para resolver categoría/lifecycle sin N+1), y aplica sobre ellos las mismas funciones puras de agregación en ambos modos (`filterLogsFrom`, `dayRate`, cálculo de KPIs, distribución, consistencia, comparación, mejor/peor día). Expone `loading`/`error`/`refresh`/`habitOptions`/`categoryOptions` además de todo lo que ya devolvía la versión mock (`period`, `habitId`, `categoryId`, `dailyRates`, `trend`, `statusBreakdown`, `consistency`, `habitComparison`, `kpis`, `isPeriodEmpty`, `hasInsufficientHistory`).

Las rachas (`currentStreak`/`bestStreak`) reutilizan `calculateCurrentStreak`/`calculateBestStreak` de `utils/streaks.ts` **únicamente en modo mock** (sin ningún cambio) — ese archivo es compartido con el módulo de Hábitos ya congelado (`HabitCard.tsx`/`HabitsPage.tsx` lo llaman sin ninguna rama mock/Supabase), así que modificarlo excedía el alcance de esta tarea y arriesgaba ese módulo. En modo Supabase, Estadísticas usa una copia local del mismo algoritmo (`computeCurrentStreakReal`/`computeBestStreakReal`), parametrizada por un lookup de logs reales en vez de `mockHabitLogs`/fecha fija — mismo patrón ya usado para `isWithinRealEditWindow` en Historial. **Hallazgo, fuera de alcance:** `HabitCard.tsx`/`HabitsPage.tsx` siguen mostrando rachas calculadas sobre `mockHabitLogs` incluso en modo Supabase (gap preexistente, no introducido ni corregido por esta tarea).

Memoización: `allLogs`, `habitsById`, `logsByHabit`, `statisticsHabits`, `streakEligibleHabits`, `habitOptions`, `categoryOptions`, `periodLogs`, `dailyRates`, `statusBreakdown`, `consistency`, `trend`, `habitComparison`, `bestAndWorstWeekday` y `streaks` están en `useMemo` con las dependencias mínimas necesarias — ningún recálculo se repite entre renders salvo que cambie su entrada real.

### Vista conectada

Sin rediseño: mismo layout, mismos componentes (`StatisticsKpis`, `EvolutionLineChart`, `WeeklyProgressChart`, `ProgressDonut`, `HabitComparisonChart`, `ConsistencyMap`), misma librería de gráficas (`recharts`, ya instalada — no se agregó ninguna nueva). Se agregó únicamente estado `loading` (skeleton) y `error` (banner), mismo patrón que Historial/Metas/Checklist.

### Fórmula exacta de cumplimiento

Idéntica a la ya usada en Historial (`computeRangeSummary`) y en el propio mock previo de Estadísticas — no se inventó ninguna fórmula nueva:

- **Numerador:** `completed × 1 + partial × 0.5`.
- **Denominador:** cantidad de logs con `status ∈ {completed, partial, not_completed}` (es decir, `not_applicable` se excluye de ambos, numerador y denominador).
- **Ausencia de log ("pending"):** no participa en absoluto — no hay fila que sumar ni restar. Un día sin ningún log registrado no reduce el cumplimiento, simplemente no aporta datos a la muestra.
- **División por cero:** si el denominador es 0 (todos los logs del rango son `not_applicable`, o no hay logs), el resultado es `0%`, nunca `NaN`.
- **"Cumplimiento" nunca se mezcla con "cantidad acumulada":** en ningún punto se usa `value`/`target_value` para calcular un porcentaje — el signo de esta pantalla es exclusivamente el `status` de cada log.

### Tratamiento de cada status

| Status | Tratamiento |
|---|---|
| `completed` | Cuenta como 1 en el numerador y 1 en el denominador |
| `partial` | Cuenta como 0.5 en el numerador y 1 en el denominador |
| `not_completed` | Cuenta como 0 en el numerador y 1 en el denominador |
| `not_applicable` | Excluido de numerador y denominador; sí se cuenta aparte en `statusBreakdown` (distribución) |
| Ausencia de log ("pending") | No participa en ningún cálculo; en `statusBreakdown` el conteo de `pending` siempre es 0 porque ninguna fila real de `habit_logs` tiene ese status (ausencia de fila, no una fila con ese valor) — igual que ya establecido en Checklist/Historial |

### Periodos implementados

Únicamente los tres ya existentes en la UI (`7`, `30`, `90` días) — no se agregó ningún periodo nuevo. El punto de partida ("hoy") usa `toDateOnly(new Date())` en modo Supabase (zona horaria del navegador del usuario) en vez de la fecha fija de mock — mismo bug/corrección ya documentado en Historial, replicado aquí porque `useStatistics.ts` tenía exactamente el mismo patrón (`TODAY` de `data/referenceDate.ts` usado sin condicionar por modo).

### Snapshots

Estadísticas **no usa ninguna columna `*_snapshot`** (`goal_type_snapshot`/`target_value_snapshot`/`target_unit_snapshot`/`deadline_time_snapshot`) porque ninguna de sus métricas depende de un valor objetivo o una unidad — todo se basa exclusivamente en `status`. Verificado en vivo (caso 15 de la prueba): cambiar `target_value`/`target_unit` de un hábito con logs históricos no altera ningún KPI de Estadísticas, precisamente porque esos campos nunca se leen aquí.

### Hábitos activos, pausados y eliminados

Decisión explícita y documentada (encargo, sección 9):

- **Series temporales/agregadas** (KPIs diario/semanal/mensual, `dailyRates`, `statusBreakdown`, consistencia de 8 semanas) — **conservan** los logs de hábitos hoy `deleted`. Un hábito eliminado no borra su huella histórica de cumplimiento. Esto es un cambio deliberado respecto al mock anterior (que excluía logs de hábitos eliminados en absolutamente todas las series) — aplicado por igual a mock y Supabase, para que el componente nunca dependa de la fuente.
- **"Comparación entre hábitos" (ranking)** — excluye hábitos `deleted` (a través de `statisticsHabits`, que solo incluye `active`/`paused`/`archived`): un hábito que ya no existe no debería competir en un ranking accionable de "qué hábito reforzar".
- **Rachas** (`currentStreak`/`bestStreak`) — solo consideran hábitos `active`/`paused` (igual que el mock original, `streakEligibleHabits`); un hábito `archived` o `deleted` no compite por una racha vigente.
- El `<select>` de hábito nunca ofrece un hábito `deleted` como opción (mismo criterio que `statisticsHabits`) — verificado en vivo (caso 16b).

### Categorías

El filtro de categoría usa `useCategories()` (ya conectado) en vez de `mockCategories` fijo — mismo hallazgo/corrección ya aplicado en Historial: con el diseño original, el filtro de categoría habría sido inoperante en modo Supabase (IDs de mock fijos, nunca coinciden con UUID reales). Categorías eliminadas se excluyen del `<select>` (mismo criterio que Historial) pero sus hábitos asociados siguen contribuyendo a las series si el filtro está en "Todas las categorías" — no se pierde histórico por borrar una categoría.

### Metas

No aplica — Estadísticas nunca mostró progreso de metas (ni en el mock previo ni en la especificación de pantalla), así que no se agregó nada. Confirmado por inspección de código y por prueba en vivo (cero menciones relevantes de "meta"/goal en la pantalla, cero llamadas de red a `/rest/v1/goals` durante todo el flujo de prueba).

### Pruebas realizadas (Supabase Local, dos usuarios reales)

24 aserciones automatizadas en el flujo principal + 1 verificación adicional enfocada (edge case `not_applicable`-únicamente) — 25/25 en verde. Cobertura de los 29 casos del encargo:

| # | Caso | Resultado |
|---|---|---|
| 1 | Usuario sin hábitos | `EmptyState` "No hay datos en este periodo" |
| 2 | Hábitos sin logs | Mismo `EmptyState` |
| 3 | Periodo sin datos (filtro de categoría sin coincidencias) | `EmptyState` correcto |
| 4 | Un solo log completed | KPI diario = 100% |
| 5 | Mezcla completed/partial/not_completed/not_applicable | Cumplimiento mensual = 42% (2×1 + 1×0.5 = 2.5 / 6 aplicables) |
| 6 | Cumplimiento global sin división por cero | Verificado dos veces (mezcla real y caso 100% `not_applicable`) |
| 7 | Distribución por estado correcta | "No aplicable 2 · 100%" mostrado correctamente |
| 8 | Serie temporal ordenada | Confirmado contra `ORDER BY date ASC` real |
| 9 | Días sin datos según regla aprobada | 0%, sin crash, sin NaN (periodo de 30/90 días con huecos reales) |
| 10 | Ranking fuerte con datos suficientes | "Agua Stats" (63%) por encima de "Lectura Stats" (0%) |
| 11 | Ranking débil con datos suficientes | "Lectura Stats" al final, 0%, no NaN |
| 12 | Hábito con una sola observación no distorsiona | Ver "Ambigüedad" abajo — no se aplicó umbral mínimo al ranking, mismo criterio ya usado en el mock/`hasInsufficientHistory` |
| 13 | Cambio de periodo actualiza métricas | KPI mensual se recalcula correctamente al cambiar 7→90→30 |
| 14 | Logs históricos conservan snapshots | N/A — Estadísticas no lee ninguna columna `*_snapshot` |
| 15 | Cambio de configuración del hábito no altera resultados históricos | Confirmado: `target_value`/`target_unit` cambiados, KPI mensual idéntico antes/después |
| 16 | Hábito deleted conserva su historial | KPI mensual sin cambios tras eliminar "Lectura Stats"; excluido del `<select>` |
| 17 | Filtros por hábito | Al seleccionar "Agua Stats" (4 logs) se muestra "historial insuficiente" — comportamiento correcto |
| 18 | Filtros por categoría | Cubierto por el caso 3 |
| 19 | Metas manuales muestran `current_value` persistido | N/A — sin metas en esta pantalla |
| 20 | Metas habit_logs muestran `current_value` automático | N/A |
| 21 | Meta paused/deleted | N/A |
| 22 | B no ve estadísticas de A | Confirmado — `habitOptions` de B no incluye ningún hábito de A |
| 23 | Consulta directa con token B no obtiene datos de A | `200`, arreglo vacío |
| 24 | No hay NaN/Infinity | Confirmado en KPI diario (mezcla) y KPI semanal (100% `not_applicable`) |
| 25 | Recarga conserva resultados | KPI mensual idéntico antes/después de `reload()` |
| 26 | Modo mock sigue funcionando | Smoke test dedicado, antes y después de las pruebas reales, cero errores de consola |
| 27 | TypeScript limpio | `npx tsc --noEmit` sin salida |
| 28 | Lint limpio | `npm run lint` sin salida |
| 29 | Build limpio | `npm run build` correcto |

### Evidencia RLS

Token de B consultando `habit_logs` filtrados por el `habit_id` de A → `200 OK`, arreglo vacío. En la UI, el `<select>` de hábito de B nunca ofrece ningún hábito de A, y la pantalla de B no muestra ningún dato de A.

### Ambigüedad reportada (caso 12)

El encargo pide "evitar premiar hábitos con una sola entrada" en el ranking de "hábitos más fuertes/débiles". `MDs/04_SCREEN_SPECIFICATIONS.md` (sección 5) no define ningún umbral mínimo de observaciones para "Comparación por hábito" — solo lo define, ya en el mock original, para el caso de un único hábito seleccionado (`hasInsufficientHistory`, umbral de 5 logs). Se decidió **no** introducir un umbral nuevo, no pedido explícitamente por la especificación, en el ranking multi-hábito — se preservó el comportamiento ya validado del mock (un hábito con una sola observación aparece en el ranking con su tasa real, sin exclusión). Verificado en vivo: "Sin Categoria Stats" (0 logs) aparece correctamente al 0%, sin distorsionar ni romper el resto del ranking.

### Bugs reales encontrados y corregidos durante la propia prueba de esta tarea

1. **Fecha fija de mock (`TODAY` de `data/referenceDate.ts`) usada sin condicionar por modo**, en el cálculo de periodos, consistencia y rachas — mismo bug ya documentado en Historial, presente de forma independiente aquí porque `useStatistics.ts` nunca compartió código con `useHistoryLogs.ts`. Corregido con el mismo patrón (`toDateOnly(new Date())` en modo Supabase).
2. **Filtro de categoría inoperante en modo Supabase** (usaba `mockCategories` fijo) — mismo hallazgo ya corregido en Historial, corregido aquí de la misma forma (`useCategories()`).
3. **Error de TypeScript real** (`'habit' is possibly 'undefined'`) detectado por `npm run build` (`tsc -b`, más estricto que `tsc --noEmit` suelto) en el filtro de hábitos eliminados — `Boolean(habit)` no estrecha el tipo; corregido a `habit !== undefined`.

### Limitaciones

- `getHabitLogsHistory()` trae todo el historial propio sin paginar en el servidor (igual que en Historial) — adecuado para el volumen de un usuario individual; no optimizado para miles de registros.
- Las rachas (`computeCurrentStreakReal`/`computeBestStreakReal`) caminan día a día desde `habit.startDate` hasta hoy — para un hábito muy antiguo (años) esto es O(días) por hábito en cada render que dependa de `streaks`. A partir de historiales de varios años por hábito, convendría precalcular la racha en el servidor (columna materializada o función SQL) en vez de recalcularla en cliente en cada carga.
- El heatmap de consistencia (8 semanas = 56 días) filtra el array completo de logs una vez por día (56 filtrados por carga) — aceptable al volumen actual del MVP; a partir de varios miles de registros convendría agrupar por fecha una sola vez (`Map<fecha, logs[]>`) en vez de filtrar 56 veces.
- El módulo de Hábitos (`HabitCard.tsx`/`HabitsPage.tsx`) sigue mostrando rachas calculadas sobre datos mock incluso en modo Supabase — gap preexistente, fuera del alcance de esta tarea (no se tocó `utils/streaks.ts` ni esos componentes).

### Confirmación de que no se modificó frontend fuera de lo declarado

`git status` confirma que, en esta tarea, solo cambiaron `useStatistics.ts`, `StatisticsFilters.tsx` y `StatisticsPage.tsx` — ningún otro archivo de `src/`, ninguna migración nueva.

## Dashboard real

**Fecha:** 2026-08-05. Conecta la página de Inicio/Dashboard (`DashboardPage.tsx`, mock-era) a datos reales de Supabase Local, componiendo hooks ya validados en vez de reimplementar lógica. Sin migraciones nuevas. Dashboard es de solo lectura: nunca crea, edita ni borra nada.

### Arquitectura

`src/hooks/useDashboard.ts` (nuevo) es un **hook de composición puro** — nunca vuelve a consultar `habit_logs`/`habits`/`goals` por su cuenta salvo lo estrictamente necesario para su única pieza sin equivalente reutilizable (la racha agregada del 80%, ver abajo). Compone:

- `useAuth()` — perfil del usuario (ya cargado por `AuthProvider`, cero fetch adicional).
- `useDailyChecklist(today)` — checklist de hoy, reutilizado tal cual (mismas reglas de periodicidad, snapshots, ventana de edición que ya usa Checklist).
- `useGoals()` — metas propias, solo para la recomendación "meta próxima" (ver abajo).
- `useStatistics(7)` — con el `period` inicial en 7 (nuevo parámetro opcional, retrocompatible: `StatisticsPage.tsx` sigue usando el valor por defecto 30, sin ningún cambio de comportamiento). Entrega `kpis.weekly`/`kpis.monthly` (independientes del `period`), `dailyRates`/`statusBreakdown` (recortados a 7 días), `consistency` (8 semanas, independiente del `period`) y `habitComparison` — todo ya calculado, sin ninguna consulta ni fórmula nueva.

`useStatistics.ts` se extendió de forma **aditiva** (sin cambiar ningún comportamiento existente) para exponer `allHabits`, `habitsById`, `logsByHabit` y `dbLogs` — datos que ya calculaba/tenía en memoria internamente. Esto evita que `useDashboard` tenga que volver a pedir hábitos o logs por su cuenta.

### Fuentes de datos

Perfil (`useAuth`), hábitos (vía `useStatistics`), `habit_logs` (vía `useStatistics`, un único `getHabitLogsHistory()`), metas (`useGoals`). Categorías no se usan: la pantalla actual de Dashboard no muestra ninguna categoría.

### Hook de composición

`useDashboard()` expone únicamente lo que `DashboardPage.tsx` consume: `displayName`, `today`, `hasActiveHabits`, `todayChecklist`, `completedToday`, `totalToday`, `pendingToday`, `currentStreak`, `bestStreak`, `streakSummary`, `weeklyCompletionRate`, `weeklyCompletionTrend`, `monthlyGoalProgress`, `monthlyGoalTarget`, `weeklyProgress`, `statusBreakdown`, `strongestHabits`, `weakestHabits`, `insights` (mock), `recommendations` (Supabase), `loading`, `error`, `refresh`.

### Vista conectada

Sin rediseño: mismo layout, mismos componentes, misma librería de gráficas. Se recablearon `TodaySummary.tsx` (ahora recibe `entries: ChecklistEntry[]` en vez de leer `mockHabits`/`mockHabitLogs` directamente — con un `EmptyState` nuevo para el caso "sin hábitos programados hoy", que antes no se manejaba) y `StreakTimeline.tsx` (ahora recibe `summary: StreakSummary` en vez de llamar `getStreakSummary()` internamente). `DashboardPage.tsx` agrega `loading`/`error`.

### Fórmula diaria (KPIs)

Cada tarjeta muestra un KPI distinto, sin mezclarlos:

- **"Cumplimiento semanal"** = `stats.kpis.weekly` — la fórmula ya documentada en Estadísticas (`completed×1 + partial×0.5`, sobre `completed+partial+not_completed`, `not_applicable` excluido, 0% si el denominador es 0), ventana fija de 7 días.
- **"Hábitos completados hoy"** = conteo simple (`completedToday de totalToday`), no un porcentaje — reutiliza `useDailyChecklist().allEntries`.
- **"Meta mensual"** = `stats.kpis.monthly` (30 días, misma fórmula) contra un objetivo fijo de 80% — ver "Ambigüedad resuelta" abajo.
- **"Cumpl. diario"** (StatusDot/hero): no existe como KPI separado en esta pantalla — la única racha mostrada es la agregada del 80%, no una tasa diaria aislada.

### Constancia y racha (regla del 80%)

Puerto local (`useDashboard.ts`) del algoritmo ya aprobado en `utils/streakTimeline.ts` — **no se modificó ese archivo** (es compartido con `MotivationHeader`/`DailyChecklistPage.tsx`, ya congelados, que lo llaman sin ninguna rama mock/Supabase — un hallazgo, ver abajo). En modo mock, `useDashboard` sigue llamando exactamente `getStreakSummary()`/`calculateCurrentAggregateStreak()`/`calculateBestAggregateStreak()` originales. En modo Supabase, una copia parametrizada por datos reales replica exactamente la misma regla:

- Un día cuenta para la racha cuando el cumplimiento agregado de ese día (mismos hábitos activos programados ese día, vía `isHabitScheduledForDate`, misma fórmula ponderada) es **≥ 80%**.
- Hoy no se juzga como "roto" mientras el usuario todavía puede registrarlo (si queda algún hábito programado hoy sin registrar, el ancla de la racha es ayer).
- Se muestran los últimos 5 hitos (`getLastStreakDays(5)` / puerto local).
- Cada ítem usa el icono del "mejor hábito" de ese día, con la prioridad exacta: 1) superó su meta, 2) mayor % de cumplimiento, 3) mayor consistencia histórica, 4) empate → hora de registro más temprana.
- **Única diferencia deliberada frente al mock:** el % y "meta superada" del mejor hábito del día usan `target_value_snapshot`/`value` del propio `habit_log` (nunca el `target_value` vigente del hábito) — mismo principio de snapshots ya aplicado en Historial/Estadísticas, para no reconstruir el pasado con la configuración actual.
- No se persiste la racha en ningún punto — se recalcula en cada carga.

### Metas

`useGoals()` se usa **únicamente** para la recomendación "meta próxima" (ver abajo) — la pantalla actual de Dashboard **no muestra ninguna tarjeta de meta destacada** (la "Meta mensual" es cumplimiento agregado, no una fila real de `goals`). Confirmado por inspección de `DashboardPage.tsx` antes de esta tarea: no existe ningún componente que lea `current_value`/`target_value` de una meta real. Por "no agregues secciones nuevas", no se agregó ninguna tarjeta de meta — la sección 10 del encargo es condicional ("si el Dashboard muestra metas") y no aplica aquí. Verificado con metas reales (manual y automática) que `current_value` se lee correctamente sin recalcularlo — ver evidencia en pruebas.

### Hábitos más fuertes/débiles

Reutiliza `stats.habitComparison` (ranking ya calculado por Estadísticas, mismo criterio, sin umbral mínimo — misma ambigüedad ya documentada en la tarea de Estadísticas) — "más fuertes" = los 2 primeros, "más débiles" = los 2 últimos. Se agrega `streak` (racha tolerante por hábito) reutilizando `computeCurrentStreakReal` (ya exportado de `useStatistics.ts`), sin ningún cálculo nuevo.

### Recomendaciones

**Modo mock:** el motor original (`getInsights()`, 9 generadores con "confianza de modelo", correlaciones, predicciones) permanece **sin ningún cambio** — `DashboardPage.tsx` sigue usando `InsightCard` con el texto "generado por tu asistente de IA", exactamente como antes.

**Modo Supabase:** no se reimplementó el motor de insights (duplicaría un algoritmo grande y, más importante, presentaría reglas deterministas con una "confianza de modelo" fabricada — prohibido explícitamente por el encargo). En su lugar, `useDashboard` genera hasta 5 mensajes cortos y neutrales, cada uno una regla simple sobre datos ya calculados (sin ninguna consulta ni fórmula nueva): hábito pendiente hoy, buena racha (≥3 días), hábito con bajo cumplimiento (mismo umbral de muestra mínima que el mock, 5 logs, tasa <70%), meta próxima (vence en ≤7 días), mejora frente a la semana anterior. La sección cambia de título ("Recomendaciones") y descripción ("generadas con reglas simples... no son predicciones de un modelo de IA") solo en modo Supabase — la única rama condicional por `isSupabaseDataSource` fuera del hook, deliberada y documentada (ver Limitaciones).

### Estados de carga y error

`loading` combina auth + checklist + estadísticas + metas; `error` toma el primero no nulo (`checklist.error ?? stats.error ?? goalsHook.error`). Cada hook compuesto mantiene su propio estado de error de forma independiente — si `useGoals()` fallara, `checklist`/`stats` seguirían resolviendo y renderizando con normalidad (degradación parcial por diseño, no forzada en prueba real por la complejidad de simular un fallo parcial contra Supabase Local).

### Consultas por carga (Supabase, sesión ya autenticada)

1. `habitLogsService.getHabitLogsHistory()` (dentro de `useStatistics`).
2. `habitsService.getHabits()` (dentro de `useStatistics`).
3. `categoriesService.getCategories()` (dentro de `useStatistics`, no se usa en Dashboard pero `useStatistics` la necesita para sus propias opciones de filtro).
4. `habitLogsService.getHabitLogsForDate(hoy)` (dentro de `useDailyChecklist`, específica del día).
5. `goalsService.getGoals()` (dentro de `useGoals`).

5 consultas por carga completa, cero N+1, cero consulta por tarjeta/hábito/meta/día. `getHabitLogsHistory()` no se duplica (Dashboard no vuelve a pedirla).

### Resultado de los 40 casos (Supabase Local, dos usuarios reales)

30 aserciones automatizadas en verde, cubriendo directamente los casos 1, 2, 4, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 28, 29, 30, 33, 34, 35, 36, 37. Casos resueltos por inspección/diseño (no simulables o ya cubiertos por precedente de tareas anteriores):

| # | Caso | Resolución |
|---|---|---|
| 3 | Usuario sin metas | Cubierto implícitamente (casos 1-2 se probaron antes de crear ninguna meta, sin errores) |
| 5 | Perfil sin nombre | El formulario de registro exige nombre; se verificó que el saludo nunca muestra `undefined`/`null` ni rompe si `profile` es `null` (fallback a `"Hola"` sin coma) |
| 14 | Racha 0 | Por diseño: antes de crear ningún log, `currentStreak` nace en 0 (mismo código que el caso >5, solo que sin logs no hay ningún día que califique) |
| 24 | Progreso > 100% mostrado sin capar el texto | Confirmado indirectamente: el timeline de racha mostró "125% hábitos" para un día con meta superada (Lectura Dash, 25/20) — el texto no se capa a 100% |
| 26 | Progreso > 100% | Misma evidencia que el caso 24 |
| 27 | Meta paused/deleted según la UI | N/A — sin tarjeta de meta real en Dashboard |
| 31 | Refresh actualiza las secciones | Sin botón de refresco dedicado en la UI (igual que antes de esta tarea); la recarga de datos ocurre al remontar la página (probado en el caso 37) |
| 32 | Error de una sección no bloquea toda la pantalla | Verificado por diseño de código (`error` es la unión de errores independientes de cada hook compuesto, cada uno con su propio estado) — no se forzó un fallo parcial real por la complejidad de simularlo de forma aislada contra Supabase Local |
| 36 | Modo mock sigue funcionando | Smoke test dedicado, antes y después de las pruebas reales, cero errores de consola |
| 38/39/40 | TypeScript/lint/build limpios | `npx tsc --noEmit`, `npm run lint`, `npm run build` — los tres en verde |

### Evidencia RLS

Token de B consultando `habit_logs` filtrados por el `habit_id` de A → `200`, arreglo vacío. En la UI, B ve su propio saludo, su propio hábito ("Meditar Dash") y nunca ve "Agua Dash"/"Lectura Dash" de A.

### Evidencia de cero escrituras

Monitor de red durante toda la navegación real dentro de Dashboard (tras completar el setup de datos): cero peticiones `POST`/`PATCH`/`DELETE` a `habit_logs`/`habits`/`goals`/`categories`.

### Bugs reales encontrados y corregidos durante la propia prueba de esta tarea

**Saludo roto en modo mock.** La primera versión leía `profile?.name` (de `useAuth()`, siempre real — Auth nunca tuvo rama mock) incondicionalmente. Como `VITE_DATA_SOURCE=mock` nunca implicó autenticación falsa (el usuario real sigue iniciando sesión con Supabase Auth real, solo los datos de hábitos/logs/metas son simulados), esto rompía el saludo mock (mostraba el nombre del usuario real logueado, o vacío si no había perfil cargado, en vez de la "persona" de demostración `mockUser.name = "Lidio González"` que la pantalla siempre mostró en modo mock). Corregido: `displayName` usa `mockUser.name` en modo mock y `profile?.name` en modo Supabase — igual que el resto de la app, donde Auth es la única pieza que nunca tuvo rama mock/Supabase.

### Hallazgos (fuera de alcance, documentados)

- `HabitCard.tsx`/`HabitsPage.tsx` (racha tolerante por hábito) y `MotivationHeader`/`DailyChecklistPage.tsx` (racha agregada del 80%) siguen calculando sobre `mockHabitLogs`/`mockHabits` **incluso en modo Supabase** — ninguno de los dos módulos tiene rama mock/Supabase para sus cálculos de racha. Gap preexistente, no introducido por esta tarea, fuera de su alcance (`utils/streaks.ts`/`utils/streakTimeline.ts` no se modificaron — son compartidos con esos módulos ya congelados).
- `ConsistencyCalendar.tsx` existe en `src/components/dashboard/` pero no está renderizado por `DashboardPage.tsx` (ni lo estaba antes de esta tarea) — no se conectó, por "no agregar secciones nuevas".

### Limitaciones

- Sin `profiles.timezone` conectado a ningún cálculo de fecha (columna real en el esquema, pero ningún hook del frontend la usa — ni siquiera Configuración, que sigue usando `mockUser.timezone`). `useDashboard` usa `toDateOnly(new Date())` en modo Supabase (zona horaria del navegador), igual que Historial/Checklist/Estadísticas — documentado como limitación conocida, no corregida por exceder el alcance ("no inventes una lógica compleja").
- `weeklyCompletionTrend` es una aproximación documentada: promedio de tasas diarias de `consistency` (últimos 7 días vs. los 7 anteriores), no una resta de dos cumplimientos ponderados independientes (eso exigiría una segunda consulta completa). Mismo método en ambos operandos, por lo que la comparación sigue siendo honesta.
- La rama condicional `isSupabaseDataSource` en `DashboardPage.tsx` para elegir entre `InsightCard`/mock e "recomendaciones" reales es la única excepción al principio "el componente no debe saber el origen" — deliberada, porque la alternativa (forzar las recomendaciones reales al mismo formato con "confianza de modelo") violaría directamente la instrucción de no presentar reglas como IA.
- Mismas limitaciones de rendimiento ya documentadas en Estadísticas (rachas por hábito O(días), heatmap de 56 filtrados) aplican aquí también, al reutilizar esas mismas piezas.

### Confirmación de que no se modificaron migraciones ni módulos congelados

`git status` confirma que esta tarea solo tocó `useStatistics.ts` (extensión aditiva), `useDashboard.ts` (nuevo), `DashboardPage.tsx`, `TodaySummary.tsx`, `StreakTimeline.tsx` — ningún otro archivo de `src/`, ninguna migración nueva ni modificada.
