# 11 — Reporte de Validación de Base de Datos (Supabase Local)

**Fecha de validación:** 2026-08-03
**Alcance:** Proyecto `habit-tracker`, esquema `public`, 11 migraciones versionadas en `supabase/migrations/`.
**Tipo de documento:** Reporte técnico de validación. No es una auditoría de código ni una propuesta de cambios — documenta la ejecución real y el resultado de las pruebas de reconstrucción de la base de datos en un entorno local.
**Método:** Ejecución directa de la CLI de Supabase (`supabase start`, `supabase db reset`) contra un stack local de Docker, sobre las migraciones ya corregidas y aprobadas en revisiones anteriores.
**Estado final:** Validación **exitosa**. La base de datos se reconstruye de forma completa, determinista y reproducible a partir de las migraciones versionadas.

---

## 1. Resumen ejecutivo

Se validó, en un entorno local aislado de Supabase, que las 11 migraciones que componen el esquema actual del proyecto se aplican en orden, sin errores y sin intervención manual, reconstruyendo la base de datos desde un estado vacío. Durante la primera ejecución se detectó una incidencia puntual — una dependencia implícita de una función no incluida en una instalación limpia —, se corrigió mediante un ajuste mínimo y focalizado en la migración afectada, y se repitió la validación con resultado exitoso.

Con esta validación, el esquema de base de datos queda confirmado como reproducible y estable, y el proyecto queda en condiciones de iniciar la siguiente etapa: la implementación del Backend.

---

## 2. Entorno de validación

La validación se ejecutó sobre el siguiente entorno local:

| Componente | Rol en la validación |
|---|---|
| **Windows 11 Home** | Sistema operativo anfitrión del entorno de desarrollo. |
| **Docker Desktop** (en ejecución) | Motor de contenedores que aloja los servicios locales de Supabase (Postgres, Auth, Storage, APIs, etc.), aislados del resto del sistema. |
| **WSL2** (configurado correctamente) | Subsistema de Linux que Docker Desktop utiliza en Windows para ejecutar los contenedores con rendimiento nativo. Es un requisito de infraestructura para que Docker Desktop funcione correctamente en Windows. |
| **Docker Engine** (Running) | Proceso del motor de Docker que efectivamente crea, arranca y orquesta los contenedores del stack de Supabase. |
| **Supabase CLI v2.111.0** | Herramienta de línea de comandos que orquesta el stack local: descarga las imágenes necesarias, aplica las migraciones en orden y expone los servicios locales. |
| **PostgreSQL** (vía Supabase Local) | Motor de base de datos real donde se aplican las migraciones — la misma versión de Postgres que se usa en producción, ejecutándose de forma local y desechable. |

Este entorno permite reproducir, de forma fiel y descartable, las condiciones de una instalación limpia de Supabase, sin afectar el proyecto remoto.

---

## 3. Migraciones ejecutadas

Se validó la aplicación completa y en orden de las 11 migraciones existentes en `supabase/migrations/`, sin omitir ninguna:

| # | Migración | Corrección que introduce |
|---|---|---|
| 1 | `20260728183417_init_schema.sql` | Esquema base: tablas, enums, funciones y políticas RLS iniciales. |
| 2 | `20260728183502_harden_functions.sql` | Endurecimiento de `search_path` en funciones sensibles. |
| 3 | `20260729015222_database_integrity.sql` | Constraints de integridad y validaciones de propiedad (H-01, H-02 y hallazgos relacionados). |
| 4 | `20260730235019_entity_lifecycle.sql` | Ciclo de vida de `categories` y `goals` (D-01, D-02). |
| 5 | `20260731001044_habit_schedules.sql` | Historial de frecuencia de hábitos como fuente de verdad única (D-03). |
| 6 | `20260731002637_habit_log_goal_snapshots.sql` | Snapshot histórico de la configuración de meta en cada registro diario (D-04). |
| 7 | `20260731004632_goal_progress_source.sql` | Fuente de progreso de metas y sincronización automática de `current_value` (D-05). |
| 8 | `20260731014259_habit_log_edit_window.sql` | Ventana de edición de siete días, con cálculo de fecha local por zona horaria (D-06). |
| 9 | `20260731015901_rls_hardening.sql` | Endurecimiento final de políticas RLS por tabla y operación. |
| 10 | `20260731021200_performance_indexes.sql` | Índices de soporte para las consultas y políticas ya existentes. |
| 11 | `20260731022414_final_cleanup.sql` | Limpieza final de objetos redundantes y coherencia de permisos. |

Todas las migraciones se aplicaron en el orden indicado, respetando su numeración cronológica, sin necesidad de reordenar ni de omitir ninguna.

---

## 4. Incidencia detectada durante la validación

Durante la primera ejecución del proceso de validación se detectó una incidencia puntual, propia del proceso normal de probar migraciones contra una instalación limpia:

- La migración `harden_functions.sql` incluía una instrucción `REVOKE EXECUTE` dirigida a la función `public.rls_auto_enable()`.
- Esa función no forma parte de una instalación limpia de Supabase local — solo existe en determinados entornos previamente configurados.
- Al ejecutarse contra una base de datos recién creada, la instrucción falló porque la función referenciada no existía, y la validación se detuvo en ese punto, tal como se espera de un proceso de verificación bien diseñado.
- La corrección aplicada sustituyó la instrucción directa por un bloque condicional que verifica la existencia de la función mediante `to_regprocedure()` antes de intentar revocar sus permisos, ejecutando el `REVOKE` únicamente si la función está presente.
- Con la corrección aplicada, se repitió la validación completa desde cero, con resultado exitoso.

Este hallazgo se documenta como parte normal del proceso de validación: su función es precisamente identificar este tipo de dependencias implícitas antes de que lleguen a un entorno compartido o de producción.

---

## 5. Resultado de las pruebas

Se ejecutaron dos comandos de validación, cada uno con un propósito distinto y complementario:

### `npx supabase start`

Inicializa el stack local completo de Supabase: levanta los contenedores de Docker necesarios, aplica sobre ellos las migraciones versionadas en orden y expone los servicios locales listos para usarse. Su ejecución exitosa confirma que el conjunto de migraciones puede aplicarse de principio a fin sobre una instancia nueva, sin errores.

**Resultado:** finalizó correctamente, con el stack completo operativo.

### `npx supabase db reset --local --no-seed`

Descarta el estado actual de la base de datos local y la reconstruye desde cero, reaplicando todas las migraciones en orden. La bandera `--no-seed` indica que la reconstrucción no debe insertar datos de prueba (`seed`), validando así el esquema puro, sin depender de datos precargados. Su ejecución exitosa confirma que el esquema es reproducible de forma determinista, no solo en la primera inicialización, sino también tras un reinicio completo.

**Resultado:** finalizó correctamente, sin errores ni advertencias pendientes de resolución.

Ambas ejecuciones, en conjunto, confirman que el esquema de base de datos puede reconstruirse de manera confiable cuantas veces sea necesario.

---

## 6. Servicios iniciados

Al completar `supabase start`, el stack local inició correctamente los siguientes servicios:

| Servicio | Propósito |
|---|---|
| **PostgreSQL** | Motor de base de datos relacional donde reside el esquema completo del proyecto. |
| **REST API** | Expone automáticamente el esquema de la base de datos como una API REST (PostgREST), consumida por el frontend y por futuras integraciones del backend. |
| **GraphQL** | Expone el mismo esquema mediante una API GraphQL alternativa, para consultas más flexibles cuando se requieran. |
| **Authentication** | Servicio de autenticación de usuarios (GoTrue) — gestiona registro, inicio de sesión y emisión de tokens, y es el origen del disparador que crea automáticamente el perfil de cada usuario nuevo. |
| **Storage** | Servicio de almacenamiento de archivos (por ejemplo, futuros avatares de perfil), integrado con las políticas de acceso del proyecto. |
| **Edge Functions** | Entorno de ejecución para funciones serverless personalizadas, disponible para lógica de backend que no deba vivir directamente en la base de datos. |
| **Studio** | Interfaz visual de administración local, equivalente al panel de Supabase en la nube, útil para inspeccionar tablas, políticas y datos durante el desarrollo. |
| **Mailpit** | Servidor de correo de pruebas que intercepta localmente los correos transaccionales (por ejemplo, confirmaciones de registro), sin enviarlos realmente, para poder inspeccionarlos durante el desarrollo. |
| **MCP** | Servidor de integración que permite a herramientas externas (como el asistente utilizado durante este proyecto) inspeccionar y consultar el proyecto Supabase de forma controlada. |

La disponibilidad simultánea de todos estos servicios confirma que el entorno local queda completamente operativo, no solo a nivel de base de datos.

---

## 7. Resultado de la validación

A partir de las pruebas ejecutadas, se concluye lo siguiente:

- **La base de datos puede reconstruirse completamente desde cero**, partiendo de un entorno vacío, sin intervención manual adicional más allá de la corrección puntual ya documentada.
- **Las migraciones son reproducibles**: dos ejecuciones independientes (`start` y `db reset`) produjeron el mismo resultado exitoso.
- **El orden de ejecución es correcto**: las 11 migraciones se aplicaron en su secuencia cronológica sin necesidad de ajustes de orden.
- **No existen dependencias rotas entre migraciones**: cada migración se apoya correctamente en los objetos creados por las anteriores, sin referencias a objetos inexistentes salvo la incidencia ya corregida.
- **La estructura de base de datos queda lista para iniciar el desarrollo del Backend**, con un esquema validado, reproducible y libre de errores conocidos.

---

## 8. Lecciones aprendidas

- **Validar migraciones en un entorno limpio es indispensable antes de avanzar.** Solo una instalación nueva, sin configuración previa, expone con certeza qué dependencias son realmente necesarias y cuáles se asumían presentes por error.
- **Ejecutar un `db reset` antes de conectar el frontend evita arrastrar estados intermedios.** Un entorno que fue modificado manualmente o probado de forma incremental puede ocultar problemas que solo aparecen al reconstruir el esquema desde cero — exactamente el escenario que enfrentará cualquier entorno nuevo (otro desarrollador, staging, producción).
- **Las dependencias implícitas, como la de `rls_auto_enable()`, deben detectarse activamente, no asumirse.** Este caso concreto confirma el valor de probar contra una instalación limpia antes de dar por cerrado un conjunto de migraciones: una función que "siempre estuvo disponible" en un entorno de trabajo puede no existir en otro, y solo una validación real lo revela.

---

## 9. Próximos pasos

Con la base de datos validada, el proyecto avanza a su siguiente hito:

### Paso 5 de 7 — Implementación del Backend

Esta etapa incluirá:

- Integración con Supabase desde la capa de servicios del frontend.
- Servicios de autenticación (registro, inicio de sesión, gestión de sesión).
- CRUD de hábitos.
- CRUD de categorías.
- CRUD de metas.
- CRUD de registros diarios (`habit_logs`).
- Integración de todo lo anterior con la interfaz ya construida en React.

Esta etapa se apoyará directamente sobre el esquema validado en este reporte, sin requerir cambios adicionales de base de datos salvo que surja una necesidad funcional nueva y documentada.
