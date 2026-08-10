# 09 — Auditoría de Base de Datos (Supabase / PostgreSQL)

**Revisión: 4 — Versión final provisional**
**Fecha de esta revisión:** 2026-07-28
**Alcance:** Proyecto Supabase `habit-tracker` (`xgasncrztfwotjlghlfg`), esquema `public`.
**Tipo de auditoría:** Solo lectura. No se ejecutaron migraciones, ni se modificaron tablas, columnas, índices, funciones, triggers ni políticas durante la Revisión 1, la Revisión 2, la Revisión 3, ni durante esta Revisión 4.
**Estado de la base de datos:** Sin modificaciones desde la Revisión 2 — sigue vacía (0 filas en las 6 tablas), esquema idéntico al auditado previamente.
**Estado del documento:** Auditoría cerrada provisionalmente. Esta Revisión 4 consolida y cierra el ciclo de auditoría de solo lectura iniciado en la Revisión 1 — ver sección 23, "Cierre provisional de la auditoría".
**Condiciones que justificarían reabrir la auditoría (crear una Revisión 5):** que se modifique el esquema de la base de datos; que se apliquen nuevas migraciones; que se ejecuten las pruebas funcionales con dos usuarios; que se implementen una o más de las decisiones arquitectónicas pendientes (D-01 a D-07); o que se detecte nueva evidencia técnica no contemplada en esta revisión.
**Nota sobre decisiones futuras:** a partir de esta revisión, la resolución de las decisiones pendientes (D-01 a D-07) deberá documentarse en un archivo independiente, `MDs/10_DATABASE_DECISIONS.md`, que **no se crea en esta revisión**. Este documento (`09_DATABASE_AUDIT.md`) queda como el registro histórico de la auditoría, no como el lugar donde se registran las decisiones que se tomen después.
**Método:** Inspección directa vía MCP de Supabase (`list_tables`, `list_migrations`, `get_advisors`, `execute_sql` de solo lectura) + revisión del repositorio local (`git`, sistema de archivos) + lectura completa de los documentos funcionales en `MDs/`.
**Convención:** todo dato que no pudo confirmarse directamente contra la base de datos, el repositorio o los documentos del proyecto está marcado explícitamente como **"No confirmado"**. No se asume ni se inventa nada.

---

## 1. Resumen ejecutivo

El esquema actual (6 tablas: `profiles`, `categories`, `habits`, `habit_categories`, `habit_logs`, `goals`) mantiene un modelo relacional correcto y aislamiento de datos por usuario vía RLS. Esta revisión no encontró nuevos problemas de seguridad de aislamiento, pero sí identificó **riesgos funcionales de integridad histórica** que no se habían profundizado en la Revisión 2:

1. La frecuencia de un hábito se sobrescribe directamente en `habits`, sin historial — si el producto empieza a calcular estadísticas reales sobre datos que abarcan un cambio de frecuencia, el cálculo histórico quedaría incorrecto (sección 11).
2. Los campos que definen una meta (`target_value`, `goal_type`, etc.) también se sobrescriben directamente — cambiar la meta de un hábito alteraría retroactivamente el cumplimiento ya mostrado en periodos pasados (sección 12).
3. `goals.current_value` no tiene una fuente de verdad única ni un mecanismo de recálculo definido (ampliación de H-03, sección 16).
4. La regla "solo los últimos 7 días son editables" no tiene una capa que la garantice hoy, y además no considera la zona horaria guardada en `profiles.timezone` (H-05, ampliado en sección 15).

Ninguno de estos puntos es una falla de seguridad — son huecos de **diseño funcional** que conviene resolver antes de construir Estadísticas/Historial sobre datos reales, no antes de conectar el frontend en modo básico.

**Veredicto preliminar:** ver sección 21 para la clasificación separada de desarrollo vs. producción.

---

## 2. Inventario completo de tablas

Fuente: `mcp__supabase__list_tables` (verbose), `information_schema.columns` vía SQL directo. Datos confirmados contra la base de datos real. Sin cambios respecto a la Revisión 2 (la base de datos no fue modificada).

### 2.1 `profiles`

1:1 con `auth.users`. Guarda perfil de aplicación y preferencias (incluye lo que en el frontend gestiona `useSettingsForm.ts`).

| Columna | Tipo | Default | Nullable | Observación |
|---|---|---|---|---|
| `id` | uuid | — | No | PK, FK → `auth.users.id` |
| `name` | text | `''::text` | No | |
| `avatar_url` | text | — | Sí | |
| `timezone` | text | `'America/Mexico_City'::text` | No | relevante para H-25 (ventana de edición y zona horaria) |
| `week_starts_on` | smallint | `1` | No | CHECK `week_starts_on = ANY (ARRAY[0,1])` |
| `time_format` | enum `time_format` | `'12h'::time_format` | No | valores: `12h`, `24h` |
| `language` | text | `'es'::text` | No | |
| `notify_streak_at_risk` | boolean | `true` | No | |
| `notify_abandoned_habit` | boolean | `true` | No | |
| `notify_weekly_summary` | boolean | `true` | No | |
| `notify_reminders` | boolean | `false` | No | recordatorio general, no por hábito — ver sección 19 |
| `created_at` | timestamptz | `now()` | No | auditoría |
| `updated_at` | timestamptz | `now()` | No | auditoría, mantenida por trigger |

Sin columna de estado ni borrado lógico propio (se elimina en cascada si se elimina el `auth.users` asociado). **No existe columna de tema/apariencia persistida** — ver sección 19.

### 2.2 `categories`

| Columna | Tipo | Default | Nullable | Observación |
|---|---|---|---|---|
| `id` | uuid | `gen_random_uuid()` | No | PK |
| `user_id` | uuid | — | No | FK → `auth.users.id` |
| `name` | text | — | No | sin límite de longitud ni unicidad normalizada (ver H-07, H-06 ampliado en sección 13) |
| `color` | text | — | No | |
| `icon` | text | — | No | |
| `created_at` | timestamptz | `now()` | No | auditoría |

Sin `updated_at`, sin columna de estado, sin borrado lógico (ver decisión pendiente D-01).

### 2.3 `habits`

| Columna | Tipo | Default | Nullable | Observación |
|---|---|---|---|---|
| `id` | uuid | `gen_random_uuid()` | No | PK |
| `user_id` | uuid | — | No | FK → `auth.users.id` |
| `name` | text | — | No | sin límite de longitud ni unicidad normalizada (ver H-07, H-06 ampliado) |
| `description` | text | — | Sí | |
| `icon` | text | — | No | |
| `color` | text | — | No | |
| `frequency_type` | enum `frequency_type` | — | No | Tipo válido por sí solo, sin coherencia validada contra columnas dependientes (H-11). **Se sobrescribe directamente sin historial — ver H-23 y sección 11** |
| `days_of_week` | smallint[] | — | Sí | sin `CHECK` de rango 0-6 (H-13) |
| `frequency_target` | smallint | — | Sí | sin `CHECK > 0` (H-14) |
| `interval_days` | smallint | — | Sí | sin `CHECK > 0` (H-14) |
| `goal_type` | enum `goal_type` | — | No | Sin coherencia validada contra `target_value`/`target_unit`/`deadline_time` (H-12). **Se sobrescribe directamente sin historial — ver H-24 y sección 12** |
| `target_value` | numeric | — | Sí | sin `CHECK` de signo (H-08). Ver H-24 (historial de metas) |
| `target_unit` | text | — | Sí | texto libre, sin coherencia validada contra `goal_type` (H-12) |
| `deadline_time` | time | — | Sí | sin validar que solo se use cuando `goal_type = 'deadline'` (H-12) |
| `start_date` | date | — | No | |
| `end_date` | date | — | Sí | sin `CHECK` cruzado contra `start_date` (H-09) |
| `lifecycle_status` | enum `habit_lifecycle_status` | `'active'::habit_lifecycle_status` | No | `active`, `paused`, `archived`, `deleted` — columna de estado / borrado lógico. Sin `paused_at`/`archived_at`/`deleted_at` — ver sección 19 |
| `allow_partial` | boolean | `false` | No | |
| `created_at` | timestamptz | `now()` | No | auditoría |
| `updated_at` | timestamptz | `now()` | No | auditoría, mantenida por trigger |

### 2.4 `habit_categories` (tabla puente N:M)

Sin cambios respecto a Revisión 2. Ver H-01.

### 2.5 `habit_logs`

Sin cambios estructurales respecto a Revisión 2. La decisión de la regla de negocio #9 (una sola fila por `habit_id`/`date`, acumulación atómica) sigue vigente — ver sección 9.

### 2.6 `goals`

| Columna | Tipo | Default | Nullable | Observación |
|---|---|---|---|---|
| `id` | uuid | `gen_random_uuid()` | No | PK |
| `user_id` | uuid | — | No | FK → `auth.users.id` |
| `title` | text | — | No | |
| `description` | text | — | Sí | |
| `habit_id` | uuid | — | Sí | FK → `habits.id`; nulo = meta general. Sin validar mismo `user_id` (H-02). `ON DELETE CASCADE` — **reclasificado en sección 14, ya no se presenta como defecto automático** |
| `target_value` | numeric | — | No | sin `CHECK` de signo (H-08). Sujeto al mismo riesgo de historial que en `habits` — ver H-24 |
| `current_value` | numeric | `0` | No | Ampliado en sección 16: sin `progress_source`, sin mecanismo de recálculo definido (H-03) |
| `unit` | text | — | No | |
| `start_date` / `end_date` | date | — | No | sin `CHECK` cruzado (H-09) |
| `status` | enum `goal_status` | `'active'::goal_status` | No | Sin valor equivalente a "eliminada" — decisión de producto pendiente (D-02) |
| `created_at` / `updated_at` | timestamptz | `now()` | No | auditoría |

---

## 3. Claves primarias y foráneas

Sin cambios respecto a la Revisión 2 (la base de datos no fue modificada). Ver Revisión 2 §3 — reproducido aquí por completitud.

| Tabla | PK | FK | Referencia | ON DELETE | ON UPDATE |
|---|---|---|---|---|---|
| `profiles` | `id` | `id` | `auth.users.id` | CASCADE | NO ACTION |
| `categories` | `id` | `user_id` | `auth.users.id` | CASCADE | NO ACTION |
| `habits` | `id` | `user_id` | `auth.users.id` | CASCADE | NO ACTION |
| `habit_categories` | `(habit_id, category_id)` | `habit_id` | `habits.id` | CASCADE | NO ACTION |
| `habit_categories` | ″ | `category_id` | `categories.id` | CASCADE | NO ACTION |
| `habit_logs` | `id` | `habit_id` | `habits.id` | CASCADE | NO ACTION |
| `goals` | `id` | `user_id` | `auth.users.id` | CASCADE | NO ACTION |
| `goals` | ″ | `habit_id` | `habits.id` (nullable) | CASCADE | NO ACTION |

Evidencia (consulta ejecutada en Revisión 1, no repetida por no haber cambios en el esquema):
```sql
select tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name,
       ccu.table_name as foreign_table, rc.update_rule, rc.delete_rule
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu using (constraint_name)
left join information_schema.constraint_column_usage ccu using (constraint_name)
left join information_schema.referential_constraints rc using (constraint_name)
where tc.table_schema = 'public'
order by tc.table_name, tc.constraint_type;
```

---

## 4. Relaciones

Sin cambios estructurales respecto a la Revisión 2.

```
auth.users (Supabase Auth)
   │ 1:1 (CASCADE, vía trigger)
   ├──► profiles
   │
   │ 1:N (CASCADE)
   ├──► categories
   │        ▲
   │        │ N:M (habit_categories, CASCADE en ambos lados)
   │        │
   ├──► habits ◄───────┘
   │        │ 1:N (CASCADE)
   │        ├──► habit_logs
   │        │
   │        │ 1:N (CASCADE, opcional — habit_id nulo permitido)
   │        └──► goals
   │
   │ 1:N (CASCADE)
   └──► goals (vía user_id, independiente del hábito)
```

**Sobre `goals.habit_id ON DELETE CASCADE`:** desde la Revisión 3 se reclasifica como **contrato de implementación ligado a una decisión de producto**, no como una falla del esquema. La Revisión 4 añade un matiz importante: la política RLS de `habits` usa `ALL` (que incluye `DELETE`), por lo que el propietario de un hábito puede ejecutar un `DELETE` físico directamente vía la API de Supabase, sin pasar necesariamente por una acción explícita de "eliminación destructiva" en la interfaz — ver el análisis completo y actualizado en la sección 14.

---

## 5. Políticas RLS

Sin cambios en el contenido de las políticas (no se modificó la base de datos). Se añade una columna de **Estado** para trazabilidad, y se documenta la evaluación pendiente sobre el rol `public` vs `authenticated` (H-17).

| Tabla | Política | Operación | Roles | USING | WITH CHECK | Estado |
|---|---|---|---|---|---|---|
| `profiles` | Profiles are viewable by owner | SELECT | public | `auth.uid() = id` | — | Correcta |
| `profiles` | Profiles are updatable by owner | UPDATE | public | `auth.uid() = id` | *(nulo, ver H-18)* | Correcta con observación menor |
| `categories` | Categories are manageable by owner | ALL | public | `auth.uid() = user_id` | `auth.uid() = user_id` | Correcta |
| `habits` | Habits are manageable by owner | ALL | public | `auth.uid() = user_id` | `auth.uid() = user_id` | Correcta |
| `habit_categories` | Habit categories manageable by owner | ALL | public | `EXISTS(habits h WHERE h.id = habit_id AND h.user_id = auth.uid())` | igual | Correcta con observación (H-01) |
| `habit_logs` | Habit logs manageable by owner | ALL | public | `EXISTS(habits h WHERE h.id = habit_id AND h.user_id = auth.uid())` | igual | Correcta |
| `goals` | Goals are manageable by owner | ALL | public | `auth.uid() = user_id` | `auth.uid() = user_id` | Correcta con observación (H-02) |

Sin cambios en la conclusión de la Revisión 2 sobre `public` vs `authenticated` (H-17): sigue sin ser explotable hoy, sigue recomendado como mejora de defensa en profundidad, sigue sin aplicarse.

### Validación de escenarios de aislamiento

Sin cambios respecto a Revisión 2: **sin vulnerabilidades evidentes en inspección estática; pendiente de pruebas con dos usuarios** (ver sección 18, ampliada en esta revisión con 13 casos adicionales).

---

## 6. Funciones y triggers

Sin cambios respecto a la Revisión 2 (la base de datos no fue modificada). Se mantiene la evaluación de `handle_new_user()` documentada en la Revisión 2 (H-22): `search_path = public`, cuerpo revisado, sin vector de ataque identificado, registrado como observación de buena práctica sin afirmar inseguridad.

| Función | Lenguaje | SECURITY | search_path | EXECUTE (anon/authenticated/service_role) |
|---|---|---|---|---|
| `set_updated_at()` | plpgsql | INVOKER | `''` | false / false / false |
| `handle_new_user()` | plpgsql | DEFINER | `public` | false / false / false |
| `rls_auto_enable()` | plpgsql | DEFINER | `pg_catalog` | false / false / false |

---

## 7. Índices

Sin cambios respecto a la Revisión 2. Se mantienen los hallazgos H-19, H-20, H-21.

---

## 8. Migraciones

Sin cambios: siguen sin existir localmente (`supabase/migrations/`, `supabase/config.toml`, `supabase/seed.sql` no confirmados en el repositorio). Se mantiene H-04.

| Versión | Nombre | Estado |
|---|---|---|
| `20260728183417` | `init_schema` | Aplicada en remoto |
| `20260728183502` | `harden_functions` | Aplicada en remoto |

---

## 9. Comparación contra las reglas de negocio

Sin cambios respecto a la Revisión 2, salvo la actualización de referencias cruzadas. La regla #9 permanece **resuelta**: una sola fila por `(habit_id, date)`, acumulación atómica en la capa de servicios. Las reglas #10/#11 (ventana de 7 días) se amplían en la sección 15. Las reglas #18/#19 (papelera e historial en eliminación) se amplían en la sección 14.

Tabla completa preservada de la Revisión 2 — ver también secciones 11, 12, 14 y 15 de esta revisión para el análisis ampliado de las reglas #1, #2, #9, #10, #11, #18, #19, #20.

---

## 10. Posibles tablas faltantes

Actualización de esta revisión: la entrada de `habit_schedules` se traslada y se desarrolla en profundidad en la sección 11 (a petición explícita de esta revisión). El resto de la tabla de la Revisión 2 se mantiene sin cambios.

| Tabla candidata | ¿Falta hoy? | Razonamiento |
|---|---|---|
| **`habit_schedules`** | Ver clasificación completa en la sección 11 | — |
| **`habit_log_entries`** | No, por ahora | Sin cambios respecto a Revisión 2 — sigue relacionado con la decisión ya tomada sobre la regla #9 |
| `user_settings` / `notification_preferences` | No | Sin cambios |
| `streak_snapshots` | No, por ahora | Sin cambios |
| `recommendations` / `recommendation_events` | No, por ahora | Sin cambios |
| `goal_progress` | Candidata para una fase próxima | Ver también la estrategia C de la sección 12 (configuración vigente por rango de fechas), que es conceptualmente afín |
| `deleted_items` | No, aunque hay una inconsistencia relacionada | Sin cambios — ver D-01, D-02 |
| `audit_logs` | No | Sin cambios |

---

## 11. Historial de configuración — frecuencia de hábitos (`habit_schedules`)

### Escenario analizado

> Enero: Entrenar lunes, miércoles y viernes.
> Febrero: Entrenar martes y jueves.

Con el esquema actual, `habits.frequency_type` / `days_of_week` / `frequency_target` / `interval_days` son columnas que representan **la configuración vigente en este momento**, no un historial. Si el usuario cambia la frecuencia en febrero, la fila de `habits` se sobrescribe: **la aplicación deja de tener forma de saber que en enero la programación era "lunes, miércoles y viernes"**.

Esto no rompe nada mientras las estadísticas se calculen únicamente sobre lo ya ocurrido en términos de `habit_logs` (que sí quedan con su fecha real). El problema aparece en cualquier cálculo que necesite comparar **cumplimiento contra lo programado**, por ejemplo:

- "¿Cuántos de los días programados de enero cumpliste?" — sin saber que en enero se programaban lunes/miércoles/viernes, esta pregunta no puede responderse correctamente una vez que febrero sobrescribió la configuración.
- Cálculo de racha o de porcentaje de cumplimiento que dependa de "días esperados" en vez de "días con registro".
- Recomendaciones que analicen patrones de frecuencia a lo largo del tiempo.

Hoy el frontend (`useStatistics.ts`, `useHistoryLogs.ts`) calcula estadísticas **a partir de los registros reales (`habit_logs`)**, no de "días programados esperados" — por eso el prototipo actual con datos mock no expone este problema. El riesgo se activa **en el momento en que se implemente cualquier métrica que dependa de la programación histórica**, no antes.

### Clasificación

**Necesaria antes de implementar estadísticas reales que dependan de la programación esperada (no necesaria para el MVP de registro/consulta básica).**

Razonamiento:
- No es necesaria para que el MVP funcione: crear, editar, completar hábitos y consultar el historial de lo ya registrado no requiere saber qué frecuencia estaba vigente en el pasado.
- Si se implementan estadísticas o rachas que comparen "cumplido vs. programado" (y no solo "cumplido vs. registrado"), sin esta tabla el cálculo sería incorrecto para cualquier hábito cuya frecuencia haya cambiado alguna vez.
- No se clasifica como innecesaria, porque el riesgo es real y ya está anticipado por el propio producto (Estadísticas ya calcula "mejor día", "cumplimiento semanal", etc., que son exactamente el tipo de métrica afectada).

### Propuesta conceptual (no implementada)

```
habit_schedules
├── id            uuid, PK
├── habit_id      uuid, FK → habits.id
├── frequency_type       enum frequency_type
├── days_of_week          smallint[]
├── frequency_target      smallint
├── interval_days         smallint
├── valid_from    date  -- desde cuándo rige esta configuración
├── valid_to      date, nullable  -- hasta cuándo rigió (null = vigente)
└── created_at    timestamptz
```

**Cómo conservaría la programación histórica:** cada vez que el usuario cambia la frecuencia de un hábito, en vez de sobrescribir las columnas de `habits`, se cerraría la fila vigente de `habit_schedules` (`valid_to = fecha del cambio`) y se insertaría una nueva fila con `valid_from = fecha del cambio` y `valid_to = null`. Para saber "qué frecuencia regía el 15 de enero", se consultaría la fila de `habit_schedules` cuyo rango `[valid_from, valid_to)` contenga esa fecha.

### El riesgo de mantener dos fuentes de verdad

Si `habits` conserva sus columnas de frecuencia **y** además existe `habit_schedules`, ambas podrían desincronizarse. Ejemplo concreto: `habits.days_of_week = [1, 3, 5]` mientras la fila vigente de `habit_schedules` ya quedó en `[2, 4]` — ¿cuál es la verdadera? Sin una regla explícita sobre cuál manda, cualquier consulta que use la fuente equivocada mostraría información incorrecta.

**Alternativa recomendada — `habit_schedules` como fuente de verdad única:** `habits` deja de tener columnas de frecuencia con significado propio (o se eliminan por completo). La configuración vigente se obtiene siempre consultando la fila de `habit_schedules` con `valid_to IS NULL`, o mediante una vista conceptual como `current_habit_schedule` que exponga esa fila por hábito. No hay segunda copia que pueda desincronizarse porque no existe.

**Alternativa secundaria — `habits` conserva una copia como caché de lectura:** si por rendimiento se prefiere mantener las columnas de frecuencia en `habits` para no tener que hacer join en cada lectura, esa copia **no puede actualizarse directamente desde React** — el cliente nunca debe poder escribir `habits.days_of_week` de forma independiente de `habit_schedules`. Debe sincronizarse transaccionalmente: un trigger o función controlada en PostgreSQL actualiza `habits` y `habit_schedules` en la misma operación, de modo que nunca queden en estados distintos ni siquiera momentáneamente.

### Restricciones conceptuales necesarias para `habit_schedules`

- No permitir rangos de fecha superpuestos para un mismo `habit_id`.
- No permitir más de una fila vigente (`valid_to IS NULL`) por `habit_id`.
- `valid_to` debe ser posterior a `valid_from` cuando no es nulo.
- `valid_from` debe ser obligatorio (`NOT NULL`).
- `frequency_type` debe ser coherente con sus columnas dependientes (mismo requisito que H-11 sobre `habits`).
- `habit_id` debe pertenecer a un hábito del usuario autenticado (equivalente al patrón de RLS ya usado en `habit_logs`).
- El cambio de frecuencia (cerrar la versión vigente y abrir una nueva) debe ejecutarse como una operación atómica — ambas escrituras dentro de la misma transacción, nunca como dos pasos independientes desde el cliente.

No se crea esta tabla ni se ejecuta ningún SQL en esta revisión — queda documentada como decisión pendiente **D-03**.

---

## 12. Historial de configuración — metas del hábito

### Escenario analizado

> Enero: meta "Tomar 8 vasos de agua". El usuario registra 8 vasos → 100 % de cumplimiento.
> Febrero: el usuario cambia la meta a 10 vasos.

Si el porcentaje de enero se recalculara usando el `target_value` **actual** (10) en vez del que estaba vigente en enero (8), el 100 % de enero se convertiría incorrectamente en 80 %, sin que el usuario haya hecho nada distinto ese mes. Esto aplica igual a `target_unit`, `goal_type`, `deadline_time`, y a los conceptuales `minimum_target`/`ideal_target` mencionados en la sección 19 (no existen hoy en el esquema, pero si se agregaran en el futuro tendrían el mismo problema).

**Regla general:** las estadísticas históricas no deben recalcularse usando la configuración vigente **hoy** de una meta u objetivo — deben usar la configuración que estaba vigente **en la fecha del registro que se está evaluando**.

### Estrategias evaluadas (ninguna implementada)

#### A. Snapshot dentro de `habit_logs`

Agregar columnas como `target_value_snapshot`, `target_unit_snapshot`, `goal_type_snapshot`, `minimum_target_snapshot`, `ideal_target_snapshot` a `habit_logs`, copiando el valor vigente de la meta en el momento de crear cada registro.

| Aspecto | Evaluación |
|---|---|
| Ventajas | Muy simple de consultar — cada fila de `habit_logs` es autosuficiente, no requiere joins ni lógica de rangos de fechas. Cálculo de porcentaje histórico trivial (`value / target_value_snapshot`) |
| Desventajas | Duplica datos de configuración en cada fila. Si se cambia la meta pero no hay `habit_log` de ese día (por ejemplo, un día "not_applicable" sin snapshot), no hay forma de saber qué meta regía ese día específico. No captura la meta vigente para días *sin* registro |
| Complejidad de implementación | Baja |
| Impacto en Estadísticas | Directo y sencillo — las consultas ya existentes solo cambiarían de columna (`target_value` → `target_value_snapshot`) |
| Recomendación para el MVP | **Es la opción más simple y suficiente si la única necesidad es no romper el porcentaje ya calculado de días con registro real** |

**Requisito de integridad para esta estrategia (aplica también a B y C si en algún momento se materializa un snapshot en cualquier tabla):** los valores de snapshot **no deben ser datos que el cliente React pueda enviar libremente**. Si el cliente controlara `target_value_snapshot`, nada impediría, por ejemplo, que enviara `value = 5` junto con `target_value_snapshot = 1`, generando un cumplimiento aparente de 500 % sin relación con la meta real que estaba vigente. Los campos de snapshot deben copiarse **desde la configuración vigente del hábito en el momento del registro**, mediante una operación confiable del lado de la base de datos — una función RPC, un trigger, una función de PostgreSQL controlada, o una inserción orquestada en la base de datos — nunca a partir de un valor que el cliente proponga directamente. El cliente solo debe enviar el progreso real del usuario (`value`, `status`, `note`, etc.); cuál era la meta vigente lo determina el servidor, no el cliente. Esta condición se clasifica como **requisito de integridad obligatorio** para cualquier estrategia basada en snapshots, no como una mejora opcional.

#### B. Versionado del hábito o de su configuración (`habit_versions`, `habit_goal_versions`)

Tabla dedicada con una fila por cada configuración de meta vigente en un rango de fechas, similar en espíritu a `habit_schedules` de la sección 11.

| Aspecto | Evaluación |
|---|---|
| Ventajas | Fuente de verdad única y explícita, sirve tanto para días con registro como sin él, permite reconstruir "qué meta regía cualquier fecha" incluyendo huecos, reutilizable para auditoría/UI ("esta meta cambió el 1 de febrero") |
| Desventajas | Requiere joins por rango de fechas en cada consulta de Estadísticas/Historial, mayor complejidad de mantenimiento (cerrar/abrir versiones en cada edición) |
| Complejidad de implementación | Media-alta |
| Impacto en Estadísticas | Cada consulta histórica necesita resolver "qué versión de la meta aplica a esta fecha" antes de calcular el porcentaje — más lógica, pero más correcta y completa |
| Recomendación para el MVP | Recomendable para una fase posterior, cuando ya existan usuarios reales cambiando configuraciones con frecuencia y se necesite trazabilidad completa, no solo el cálculo de porcentaje |

#### C. Configuración vigente por rango de fechas (calculada, sin tabla nueva de snapshot por fila)

Variante de B pero sin nueva tabla: usar `habit_schedules`/una tabla de versiones de meta como configuración "por rango", y **calcular** el porcentaje histórico en tiempo de consulta resolviendo qué configuración regía cada fecha, en vez de guardar el snapshot en cada log.

| Aspecto | Evaluación |
|---|---|
| Ventajas | Evita la duplicación de la estrategia A, mantiene una única fuente de verdad (igual que B), sin necesidad de escribir el snapshot en cada `INSERT` de `habit_logs` |
| Desventajas | Consultas de Estadísticas más complejas (requieren resolver el rango vigente por fecha en cada cálculo); rendimiento algo menor que leer una columna ya calculada |
| Complejidad de implementación | Media-alta (misma tabla que B, distinta forma de consumirla) |
| Impacto en Estadísticas | Similar a B |
| Recomendación para el MVP | Es esencialmente B con una forma de consulta distinta — mismo nivel de recomendación: fase posterior |

### Recomendación general para esta revisión

Para el volumen y alcance actuales (aplicación de un usuario, base de datos vacía), **ninguna estrategia se implementa todavía**. Se documenta como decisión pendiente **D-04**. Si se necesita una solución mínima antes de tener `habit_versions` completo, la estrategia A (snapshot en `habit_logs`) es la de menor esfuerzo y evita el error descrito en el escenario, aunque con la limitación ya señalada sobre días sin registro.

---

## 13. Unicidad normalizada de nombres (ampliación de H-06)

La Revisión 2 recomendaba `UNIQUE(user_id, name)`. Esa restricción, tal cual, **no evita duplicados equivalentes**: `"Tomar agua"`, `"tomar agua"`, `"TOMAR AGUA"` y `" Tomar agua "` son, para Postgres, cuatro valores distintos de texto, así que un `UNIQUE` simple sobre `name` permitiría las cuatro simultáneamente.

### Propuesta conceptual (no ejecutada)

```sql
CREATE UNIQUE INDEX habits_unique_active_name
ON public.habits (
  user_id,
  lower(btrim(name))
)
WHERE lifecycle_status <> 'deleted';
```

**Por qué sería mejor que un `UNIQUE(user_id, name)` simple:**
- `lower(...)` normaliza mayúsculas/minúsculas — `"Tomar agua"` y `"TOMAR AGUA"` colisionarían como el mismo valor.
- `btrim(...)` elimina espacios al inicio/final — `" Tomar agua "` colisionaría con `"Tomar agua"`.
- La cláusula `WHERE lifecycle_status <> 'deleted'` es un **índice único parcial**: la restricción de unicidad solo aplica a hábitos que no estén en papelera.

**Cómo afecta a hábitos enviados a papelera:** al excluir `lifecycle_status = 'deleted'` de la restricción, un hábito en papelera **deja de ocupar el nombre**. Esto permite crear un hábito nuevo con el mismo nombre normalizado mientras el original sigue en la papelera.

**¿Se puede reutilizar el nombre después del borrado lógico?** Sí — ese es justamente el efecto del índice parcial: en cuanto `lifecycle_status` pasa a `'deleted'`, ese nombre queda libre para un hábito nuevo (o para restaurar y luego renombrar, según cómo se implemente la restauración). Si el hábito se restaura (`lifecycle_status` vuelve a `'active'`) mientras ya existe otro hábito activo con el mismo nombre normalizado, la restauración fallaría por violar el índice — comportamiento correcto, pero que el frontend/servicios deberían anticipar con un mensaje claro ("ya existe un hábito activo con ese nombre").

**Estrategia equivalente para `categories`:**
```sql
CREATE UNIQUE INDEX categories_unique_active_name
ON public.categories (
  user_id,
  lower(btrim(name))
)
WHERE <condición equivalente de no-eliminado>;
```

**Qué ocurre si `categories` no tiene borrado lógico (situación actual, decisión pendiente D-01):** sin una columna de estado, no existe una condición `WHERE` equivalente a `lifecycle_status <> 'deleted'` que excluir. En ese caso el índice único normalizado tendría que aplicarse **sobre todas las filas sin excepción** (`CREATE UNIQUE INDEX ... ON categories (user_id, lower(btrim(name)))`, sin cláusula `WHERE`). Esto es funcionalmente correcto hoy, pero **si más adelante se decide agregar borrado lógico a `categories` (D-01), este índice tendría que actualizarse** para excluir las categorías eliminadas, de la misma forma que se propone para `habits`. Es un argumento adicional a favor de resolver D-01 antes de aplicar la unicidad normalizada en `categories`, para no tener que rehacer el índice después.

No se ejecuta ningún SQL de esta sección. Queda como ampliación de H-06 en el plan de corrección (sección 20).

---

## 14. `ON DELETE CASCADE` en `goals.habit_id` — reclasificación

En la Revisión 2, el `CASCADE` de `goals.habit_id` se documentó como hallazgo (H-10), presentado de forma que podía leerse como un defecto del esquema. Esta revisión lo reclasifica.

### Las dos acciones funcionales del producto (confirmadas en `MDs/01_PRODUCT_CONTEXT.md` y `MDs/04_SCREEN_SPECIFICATIONS.md`)

El modal de eliminación de hábito documentado en el proyecto contempla **tres** opciones, no dos:

1. **Archivar hábito** — cambia `lifecycle_status` a `'archived'`. No borra nada.
2. **Eliminar solo el hábito** — debe usar **borrado lógico** (`lifecycle_status = 'deleted'`). No debe ejecutar `DELETE` físico. El hábito desaparece del Dashboard y de "Mis hábitos" (fuera de la papelera), pero sus `habit_logs` y `goals` asociadas **permanecen intactos** en la base de datos, y el hábito puede restaurarse desde la papelera.
3. **Eliminar hábito y todos sus registros** — esta es la única acción que debería traducirse en un `DELETE` físico de la fila de `habits`. Aquí es donde el `ON DELETE CASCADE` de `habit_logs.habit_id`, `habit_categories.habit_id` y `goals.habit_id` **hace exactamente lo que el producto pide**: borra en cascada los registros, relaciones y metas asociadas a ese hábito específico.

### Clasificación

**`ON DELETE CASCADE` es un contrato de implementación correcto para la opción 3, y una decisión de producto ya tomada por la documentación original (no una decisión pendiente).** No es, por sí solo, un defecto.

El **riesgo real** no está en el `CASCADE` en sí, sino en que **nada a nivel de base de datos impide que un error de implementación en el frontend/servicios ejecute un `DELETE` físico cuando el usuario en realidad eligió la opción 2 ("eliminar solo el hábito")**. Si eso ocurriera, se perdería historial que el producto espera conservar.

**Reformulación del hallazgo (se mantiene el ID H-10, estado actualizado):**

| Opción de la interfaz | Acción esperada en base de datos |
|---|---|
| Archivar hábito | `UPDATE habits SET lifecycle_status = 'archived' WHERE id = ...` |
| Eliminar solo el hábito | `UPDATE habits SET lifecycle_status = 'deleted' WHERE id = ...` — **nunca** `DELETE` |
| Eliminar hábito y todos sus registros | `DELETE FROM habits WHERE id = ...` — el `CASCADE` es el mecanismo correcto y deseado aquí |

### El matiz agregado en la Revisión 4: la política RLS de `habits` usa `ALL`

La política `Habits are manageable by owner` (sección 5) cubre la operación `ALL`, lo cual **incluye `DELETE`**. Esto significa que, hoy, el propietario de un hábito podría ejecutar un `DELETE` físico **directamente contra la API de Supabase**, sin que exista ninguna barrera a nivel de base de datos que lo obligue a pasar por la acción explícita de "eliminación destructiva" del modal de tres opciones. La tabla de arriba describe el contrato *deseado* entre interfaz y base de datos, pero **nada en el esquema actual lo hace cumplir** — es un contrato de intención, no una garantía.

### Recomendación arquitectónica (no aplicada en esta revisión)

- `SELECT`, `INSERT` y `UPDATE` pueden conservar la política normal tal como está.
- El borrado lógico debe seguir ejecutándose mediante `UPDATE` de `lifecycle_status` — esto ya funciona correctamente con la política actual.
- El `DELETE` físico directo debería restringirse — por ejemplo, retirando `DELETE` de la política `ALL` de `habits` (quedando solo `SELECT`/`INSERT`/`UPDATE`) y exponiendo la eliminación permanente exclusivamente a través de una función RPC específica y claramente nombrada, del estilo `permanently_delete_habit(habit_id)`.
- Esa RPC debería: verificar que quien la invoca sea efectivamente el propietario del hábito; confirmar que la operación solicitada es la destructiva (no una llamada accidental); ejecutar el `DELETE` de la fila de `habits`; dejar que el `CASCADE` existente elimine `habit_logs`, `habit_categories` y `goals` asociados; y devolver un resultado controlado (éxito/error), en vez de exponer el `DELETE` crudo de la tabla.
- La capa de servicios (frontend) debería exponer funciones distintas y no intercambiables: `archiveHabit()`, `softDeleteHabit()`, `restoreHabit()`, `permanentlyDeleteHabit()` — de modo que un error de programación no pueda confundir la acción reversible con la destructiva.

No se cambia ninguna política RLS ni se crea la RPC en esta revisión — queda como parte de la recomendación asociada a H-10.

**H-10 actualizado:** *Resuelto documentalmente en cuanto al uso correcto de `CASCADE` para la opción "eliminar hábito y todos sus registros"; abierto respecto a la restricción del `DELETE` físico directo, hoy permitido por la política `ALL` de `habits` sin pasar por una RPC controlada.*

---

## 15. Ventana de edición de "últimos 7 días" — análisis ampliado

### Por operación

| Operación | ¿Debe permitirse fuera de la ventana de 7 días? | Justificación |
|---|---|---|
| **INSERT** de un registro retroactivo (fecha pasada, sin registro previo) | **Definido como decisión funcional pendiente (D-06)** — la documentación del producto no distingue explícitamente "crear tarde" de "editar tarde". Interpretación razonable: si nunca existió un registro para ese día y sigue dentro de los últimos 7 días, debe poder crearse (esto es lo que hoy hace el Checklist al navegar a un día reciente sin registro). Fuera de esos 7 días, no debería permitirse crear un registro nuevo, por la misma razón que no se permite editarlo |
| **UPDATE** de un registro existente | Solo dentro de los últimos 7 días (regla de negocio #10 explícita) |
| **DELETE** de un registro existente | La documentación no lo menciona explícitamente como una acción distinta de "editar". Tratamiento recomendado: **igual que UPDATE** (solo dentro de la ventana), salvo que el producto defina lo contrario |

### Casos límite

- **El séptimo día exacto:** la regla dice "los últimos 7 días son editables". Esto requiere una definición precisa de qué cuenta como "hoy − 6" vs. "hoy − 7" (inclusive/exclusive). **No confirmado** en la documentación del producto cuál de los dos límites aplica exactamente — queda como punto a definir junto con D-06.
- **Fechas futuras:** ninguna de las tablas o reglas de negocio documentadas contempla registrar hábitos con fecha futura. Se asume que no debería permitirse (`date > CURRENT_DATE` inválido), pero **no está validado hoy en ninguna capa** — no hay `CHECK` en `habit_logs.date` que lo impida.
- **Registros `not_applicable`:** la regla de negocio dice que "no aplicable" no suma ni rompe racha, pero no dice nada sobre si un registro `not_applicable` está sujeto a la misma ventana de edición que los demás estados. Se asume que sí (es un registro como cualquier otro, solo que con un estado particular), pero **no está confirmado explícitamente**.
- **`service_role` / administradores:** `service_role` bypasea RLS por diseño de Supabase, así que técnicamente **sí podría** saltarse cualquier restricción de ventana de edición implementada como política RLS. Esto es aceptable siempre que `service_role` nunca se exponga al frontend (ver prueba #7 de la sección 18) y se use solo para tareas administrativas legítimas (por ejemplo, un job de corrección de datos autorizado).

### El problema de la zona horaria

`profiles.timezone` guarda, por ejemplo, `America/Mexico_City`. Si la ventana de 7 días se calculara comparando `habit_logs.date` contra `CURRENT_DATE` del **servidor** de Postgres (que normalmente corre en UTC), el resultado sería incorrecto para cualquier usuario cuya zona horaria esté desfasada de UTC: cerca de la medianoche, "hoy" para el usuario y "hoy" para el servidor pueden ser fechas distintas. Ejemplo concreto: a las 11:30 p.m. hora de Ciudad de México (`UTC-6`), ya son las 5:30 a.m. del día siguiente en UTC — un registro que el usuario considera "de hoy" podría evaluarse por el servidor como "de ayer", desplazando incorrectamente qué días caen dentro o fuera de la ventana editable.

**Cualquier implementación de esta regla debe calcular "hoy" usando `profiles.timezone` del usuario, no `CURRENT_DATE` del servidor sin ajustar.** Este es un hallazgo nuevo de esta revisión — ver H-25.

### Alternativas de implementación evaluadas (ninguna implementada)

| Alternativa | Descripción | Ventaja | Desventaja |
|---|---|---|---|
| Política RLS (`WITH CHECK` con lógica de fecha) | Agregar una condición de fecha al `WITH CHECK` de la política de `habit_logs` | Se aplica automáticamente a cualquier cliente que use la API, sin depender de que el frontend lo respete | Las políticas RLS no tienen acceso directo y cómodo a `profiles.timezone` de la fila relacionada sin un subquery adicional; añade complejidad a la política existente |
| Función RPC dedicada | Una función `update_habit_log(...)` que valida la ventana internamente antes de escribir | Centraliza la lógica en un solo lugar, puede usar `profiles.timezone` con claridad | El cliente podría seguir usando el endpoint REST genérico de la tabla si no se revoca el acceso directo, salvo que se combine con RLS |
| Trigger (`BEFORE UPDATE`/`BEFORE DELETE` en `habit_logs`) | Un trigger que calcule la fecha límite usando la zona horaria del dueño del hábito y rechace la operación si está fuera de rango | Se aplica sin importar por qué vía se intente la escritura (RPC, REST directo, etc.) — la más difícil de saltarse accidentalmente | Requiere un `JOIN` a `habits` y a `profiles` dentro del trigger para obtener `timezone`; lógica de fecha más compleja de mantener que una política simple |
| Validación en `src/services` (capa de aplicación, frontend) | El código de `src/services` (que forma parte del bundle de React ejecutado en el navegador del usuario) valida la ventana antes de llamar a Supabase | Fácil de implementar y de leer; da al usuario un mensaje de error inmediato y claro | **No es una frontera de seguridad.** Un usuario podría evitar por completo esa función y llamar directamente a la API REST/PostgREST de Supabase con su propio JWT, saltándose cualquier validación escrita en `src/services` |
| Combinación de base de datos y `src/services` | `src/services` valida primero (mejor mensaje de error para el usuario), y un trigger o política en PostgreSQL actúa como garantía final e ineludible | Cubre tanto la experiencia de usuario (mensaje claro y rápido) como la garantía real (no se puede evadir) | Mayor esfuerzo de implementación y mantenimiento — dos lugares que deben mantenerse coherentes |

### Aclaración importante: `src/services` no es un backend

`src/services` es una carpeta del proyecto **React**, ejecutada enteramente en el navegador del usuario junto con el resto del frontend. No es un servidor, no es una frontera de confianza, y no controla el acceso a los datos. Cualquier validación escrita ahí (por ejemplo, "no permitir editar `habit_logs` de hace más de 7 días") **solo mejora la experiencia de usuario** dentro de la aplicación oficial — no impide que alguien con las herramientas de desarrollador del navegador, o cualquier cliente HTTP, llame directamente al endpoint de Supabase y omita esa validación. **La garantía definitiva de cualquier regla de negocio debe existir en PostgreSQL** (política RLS, trigger, o función RPC que el cliente no pueda evitar), no únicamente en `src/services` ni en ningún otro código que corra en el navegador.

### Recomendación (reformulada)

**Para el MVP:**
- `src/services` (frontend) realiza la validación anticipada, para dar al usuario retroalimentación inmediata sin esperar un error del servidor.
- PostgreSQL garantiza la regla de forma obligatoria mediante una función RPC controlada, un trigger, o una política adecuada — la que se elija debe decidirse junto con D-06, pero **debe existir alguna**, no basta con la validación de frontend.

**Para producción:**
- Usar la combinación de validación en la aplicación (buena experiencia de usuario) **y** una garantía obligatoria en la base de datos (seguridad real).
- **No se acepta una solución basada únicamente en `src/services` o en cualquier otro código de frontend** como cumplimiento de esta regla para producción.

Ninguna alternativa fue implementada en esta revisión. Queda como decisión pendiente **D-06**.

---

## 16. `goals.current_value` — tipos de progreso y fuente de verdad (ampliación de H-03)

### Tres tipos de progreso distintos

1. **Meta vinculada a un hábito** (`goals.habit_id` no nulo): el progreso debería derivarse matemáticamente de los `habit_logs` del hábito asociado dentro del rango `[start_date, end_date]` de la meta (por ejemplo, suma de `value`, o conteo de días `completed`).
2. **Meta calculada** (por ejemplo, la meta general "80 % de cumplimiento mensual" que ya existe en los datos mock): el progreso se obtiene de una fórmula agregada sobre múltiples hábitos, no de un solo `habit_id`.
3. **Meta manual**: el usuario actualiza el progreso directamente sin que exista una fuente automática que lo derive (por ejemplo, una meta que no está atada a ningún hábito medible en la app).

El esquema actual **no distingue estos tres casos** — `current_value` es una sola columna numérica que se actualiza de la misma forma sin importar su origen.

### Propuesta conceptual: `progress_source`

Un campo como:
```
progress_source: 'habit_logs' | 'calculated' | 'manual'
```

permitiría que la capa de servicios (o un trigger) supiera **si debe intentar recalcular `current_value` automáticamente o no**. Sin este campo, no hay forma de distinguir programáticamente una meta que debería sincronizarse sola de una que el usuario espera controlar a mano.

### Preguntas abiertas (documentadas, no resueltas en esta revisión)

- **¿Quién actualiza `current_value` hoy?** No confirmado — no existe trigger ni función en la base de datos que lo haga; si se actualiza, es porque algún cliente (frontend o servicio) ejecuta un `UPDATE` explícito.
- **¿Cuándo debería recalcularse?** Para el tipo 1 (vinculada a hábito), lo esperable es recalcular cada vez que se inserta/edita un `habit_log` de ese hábito dentro del rango de la meta. Hoy no existe ningún trigger que lo haga.
- **¿Qué sucede al editar un `habit_log` antiguo?** Si `current_value` se calculó una vez y no se vuelve a tocar, un cambio retroactivo en un `habit_log` dejaría a `current_value` desincronizado silenciosamente — sin ningún mecanismo que lo detecte.
- **¿Cómo evitar dos fuentes de verdad?** El riesgo central de H-03: si `current_value` se puede editar manualmente **y** también se espera que se derive de `habit_logs`, ambas rutas pueden entrar en conflicto. La forma de evitarlo es que, para metas con `progress_source = 'habit_logs'`, la columna `current_value` deje de ser editable directamente por el cliente (protegido por RLS o por un trigger que la recalcule y sobrescriba cualquier intento de edición manual).
- **¿`current_value` debería almacenarse, calcularse al vuelo, o mantenerse por trigger/RPC/servicio?**
  - Almacenarse y mantenerse por trigger: mejor rendimiento de lectura (no hay que recalcular en cada consulta), consistencia garantizada a nivel de base de datos, pero mayor complejidad de mantenimiento.
  - Calcularse al vuelo (vista o consulta): siempre consistente por definición (no puede desincronizarse porque no se almacena), pero más costoso computacionalmente si el rango de fechas o el volumen de `habit_logs` crece.
  - Mantenerse por servicio/RPC: intermedio — requiere disciplina de que **todas** las rutas de escritura pasen por el mismo servicio, con el mismo riesgo de H-03 si alguna ruta lo evita.

No se modifica la tabla `goals` en esta revisión. Estas preguntas quedan documentadas como decisión pendiente **D-05**.

---

## 17. Hallazgos

Clasificados por severidad. Se mantienen los identificadores de las revisiones anteriores sin renumerar. Sin hallazgos H-XX nuevos en esta revisión (H-23 a H-25 se agregaron en la Revisión 3); se agrega la decisión **D-07** (sección 19) y se actualiza H-10 (sección 14). La columna **Estado** se normaliza en esta revisión a un vocabulario cerrado: `Abierto`, `Decisión pendiente`, `Resuelto documentalmente`, `Pendiente de prueba`, `Cerrado`. Ningún hallazgo se marca como `Cerrado`, porque ninguno fue corregido en la base de datos ni confirmado mediante una prueba ejecutada.

### Críticos

Ninguno detectado en la inspección estática realizada.

### Altos

| ID | Hallazgo | Impacto | Estado |
|---|---|---|---|
| H-01 | `habit_categories` no valida propiedad de `category_id`, solo de `habit_id` | Relación cruzada inconsistente posible | Abierto |
| H-02 | `goals.habit_id` no valida que el hábito pertenezca al mismo `user_id` que la meta | Relación cruzada inconsistente posible | Abierto |
| H-03 | Riesgo de desincronización de `goals.current_value` respecto de `habit_logs` — **ampliado en sección 16** | Progreso de meta potencialmente incorrecto, sin fuente de verdad única definida | Decisión pendiente (D-05) |
| H-04 | Migraciones no versionadas en el repositorio local | Sin trazabilidad en control de código | Abierto |
| H-05 | Sin ventana de edición de 7 días a nivel de base de datos — **ampliado en sección 15 (INSERT/UPDATE/DELETE por separado)** | Registros históricos editables/eliminables indefinidamente | Decisión pendiente (D-06) |
| **H-23** | **(Nuevo)** Sin historial de configuración de frecuencia (`habit_schedules` ausente) — ver escenario y análisis completo en la sección 11 | Estadísticas basadas en "días programados" serían incorrectas para hábitos cuya frecuencia cambió | Decisión pendiente (D-03) |
| **H-24** | **(Nuevo)** Cambios retroactivos en la configuración de una meta (`target_value`, `goal_type`, `target_unit`, `deadline_time`) alteran el cumplimiento histórico ya calculado — ver escenario y estrategias en la sección 12 | Porcentajes históricos mostrados al usuario podrían cambiar incorrectamente al editar una meta vigente | Decisión pendiente (D-04) |

### Medios

| ID | Hallazgo | Impacto | Estado |
|---|---|---|---|
| H-06 | Sin unicidad **normalizada** de `name` en `habits`/`categories` — **ampliado en sección 13** con propuesta de índice único parcial normalizado | Permite duplicados equivalentes (mayúsculas, espacios) además de duplicados exactos | Abierto |
| H-07 | `habits.name` / `categories.name` sin límite de longitud ni `CHECK` de no-vacío | Contradice regla de negocio #2 | Abierto |
| H-08 | `target_value` sin `CHECK` de signo positivo (`habits`, `goals`) | Permite valores objetivo negativos | Abierto |
| H-09 | `end_date` sin `CHECK` cruzado contra `start_date` (`habits`, `goals`) | Permite fechas lógicamente inválidas | Abierto |
| H-10 | `goals.habit_id ON DELETE CASCADE` — **reclasificado y ampliado en sección 14**: contrato de implementación correcto para la opción "eliminar hábito y todos sus registros"; riesgo pendiente en que la política `ALL` de `habits` permite `DELETE` físico directo sin pasar por una RPC controlada | Pérdida de historial si se ejecuta `DELETE` físico directo (vía API o por error de frontend) en vez de borrado lógico | Resuelto documentalmente en cuanto al uso correcto de `CASCADE`; abierto respecto a la restricción del `DELETE` físico directo |
| H-11 | Sin `CHECK` de coherencia condicional `frequency_type` ↔ (`days_of_week`, `frequency_target`, `interval_days`) | Permite combinaciones lógicamente inconsistentes | Abierto |
| H-12 | Sin `CHECK` de coherencia condicional `goal_type` ↔ (`target_value`, `target_unit`, `deadline_time`) | Permite combinaciones lógicamente inconsistentes | Abierto |
| H-13 | `days_of_week` sin `CHECK` de rango 0-6 ni de duplicados | Permite valores fuera de rango o repetidos | Abierto |
| H-14 | `frequency_target` / `interval_days` sin `CHECK > 0` | Permite valores negativos o cero | Abierto |
| H-15 | `habit_logs.value` sin `CHECK` de signo | Permite valores negativos | Abierto |
| H-16 | `goals.current_value` sin `CHECK` de signo | Permite valores negativos | Abierto |
| H-17 | Las 7 políticas RLS usan rol `public` en vez de `authenticated` | No explotable hoy; mejora de defensa en profundidad | Abierto |
| **H-25** | **(Nuevo)** La ventana de edición de 7 días, si se implementa comparando contra `CURRENT_DATE` del servidor sin ajustar a `profiles.timezone`, produciría resultados incorrectos cerca de medianoche para usuarios fuera de UTC — ver análisis en la sección 15 | Un registro cerca de la medianoche local podría bloquearse o permitirse incorrectamente | Decisión pendiente (D-06, mismo punto que H-05) |

### Bajos

| ID | Hallazgo | Impacto | Estado |
|---|---|---|---|
| H-18 | `profiles` UPDATE sin `WITH CHECK` explícito | Sin riesgo real (Postgres reutiliza `USING`) | Abierto |
| H-19 | Políticas RLS usan `auth.uid()` directo en vez de `(select auth.uid())` | Advertencia de rendimiento, no urgente al volumen actual | Abierto |
| H-20 | Falta índice en `habit_categories.category_id` | Afecta búsqueda inversa "hábitos de una categoría" | Abierto |
| H-21 | `habit_logs_habit_id_idx` parcialmente redundante | No dañino | Abierto |
| H-22 | `handle_new_user()` usa `search_path = public` en vez de `''` | Sin vector de ataque identificado tras revisar el cuerpo de la función; observación de consistencia | Abierto (no se afirma inseguridad) |

### Decisiones de producto pendientes (no son defectos confirmados)

| ID | Punto a decidir | Contexto |
|---|---|---|
| D-01 | ¿`categories` necesita borrado lógico igual que `habits`? | Ver sección 13 para su efecto sobre la unicidad normalizada |
| D-02 | ¿`goals` necesita un estado equivalente a "eliminada"? | Sin cambios respecto a Revisión 2 |
| **D-03** | **(Nuevo)** ¿Se implementa `habit_schedules` para conservar historial de frecuencia, y en qué fase? | Ver clasificación y propuesta conceptual en la sección 11 |
| **D-04** | **(Nuevo)** ¿Qué estrategia (A: snapshot, B: versionado, C: cálculo por rango) se usa para conservar el historial de configuración de metas? | Ver comparación completa en la sección 12 |
| **D-05** | **(Nuevo)** ¿Se agrega `progress_source` a `goals` y qué mecanismo (trigger/RPC/servicio) mantiene `current_value` sincronizado? | Ver preguntas abiertas en la sección 16 |
| **D-06** | **(Nuevo)** ¿En qué capa (RLS, RPC, trigger, servicios, o combinación) se implementa la ventana de edición de 7 días, considerando `profiles.timezone`? ¿Cómo se trata el séptimo día exacto, fechas futuras y registros `not_applicable`? | Ver análisis completo en la sección 15 |
| **D-07** | **(Nuevo)** ¿`preferred_time`, `minimum_target` e `ideal_target` permanecen dentro del MVP o se posponen a una fase posterior? | Ver nota de trazabilidad y alternativas A/B en la sección 19 |

---

## 18. Pruebas recomendadas

Los primeros 8 casos provienen de la Revisión 2 (no ejecutados). Los casos 9 a 21 son nuevos en esta revisión, a partir de los hallazgos y decisiones documentados arriba. Ninguno fue ejecutado.

| # | Objetivo | Precondición | Pasos | Resultado esperado | Prioridad | Capa que debe garantizarlo |
|---|---|---|---|---|---|---|
| 1 | Usuario A no lee hábitos de B | Dos usuarios, cada uno con ≥1 hábito | `select * from habits` con JWT de A | 0 filas de B | Alta | RLS |
| 2 | Usuario A no inserta logs sobre hábitos de B | A conoce el `habit_id` de B | `insert into habit_logs (habit_id, ...)` con ese id | Rechazado | Alta | RLS |
| 3 | Usuario A no reasigna `user_id` | A tiene un hábito propio | `update habits set user_id = <uuid de B>` | Rechazado | Alta | RLS |
| 4 | Anónimo no consulta datos privados | Sin sesión (rol `anon`) | `select * from habits` sin JWT | 0 filas | Alta | RLS |
| 5 | El trigger de perfil corre una sola vez | Usuario nuevo se registra | `select count(*) from profiles where id = <nuevo>` | Exactamente 1 | Media | PostgreSQL (trigger) |
| 6 | RLS bloquea SELECT/INSERT/UPDATE/DELETE indebidos | Dos usuarios | Repetir 1-3 sobre `categories`, `goals`, `habit_logs` con UPDATE/DELETE | Todos rechazados | Alta | RLS |
| 7 | `service_role` opera sin exponerse al frontend | Backend con `service_role` key | Ejecutar tarea administrativa que ignore RLS | Funciona server-side; key nunca en el bundle del cliente | Alta | Servicios |
| 8 | Usuario A no crea `goal` sobre `habit_id` de B | A y B con ≥1 hábito propio cada uno | A intenta `insert into goals (user_id: A, habit_id: <hábito de B>, ...)` | Hoy tendría éxito (confirma H-02); tras corregir, debe rechazarse | Alta | RLS (tras corrección) |
| 9 | Usuario A no asocia su hábito con categoría de B | A y B con ≥1 categoría propia cada uno | A intenta `insert into habit_categories (habit_id: <de A>, category_id: <de B>)` | Hoy tendría éxito (confirma H-01); tras corregir, debe rechazarse | Alta | RLS (tras corrección) |
| 10 | Usuario A no crea meta apuntando a hábito de B | Igual que caso 8 | Igual que caso 8 | Rechazado (tras corrección de H-02) | Alta | RLS |
| 11 | Editar `habit_log` con más de 7 días de antigüedad | Regla de ventana implementada (D-06 resuelta) | `update habit_logs set value = ... where date < hoy - 7` | Rechazado | Alta | Según decisión D-06 (RLS/trigger/RPC/servicios) |
| 12 | Eliminar `habit_log` con más de 7 días de antigüedad | Igual que caso 11 | `delete from habit_logs where date < hoy - 7` | Rechazado, según la regla aprobada (ver sección 15 — se recomienda igual tratamiento que UPDATE) | Alta | Según decisión D-06 |
| 13 | Insertar registro retroactivo fuera de la ventana permitida | Igual que caso 11 | `insert into habit_logs (date: hoy - 10, ...)` | Definido según la decisión funcional (D-06) — recomendación de esta revisión: rechazado | Media | Según decisión D-06 |
| 14 | Duplicado normalizado de nombre de hábito | Usuario ya tiene un hábito activo llamado "Tomar agua" | Crear "tomar agua" | Rechazado como duplicado normalizado (tras aplicar H-06 ampliado) | Media | PostgreSQL (índice único parcial normalizado) |
| 15 | Coherencia `frequency_type` ↔ `days_of_week` | — | Guardar `frequency_type = 'specific_days'` con `days_of_week = null` | Rechazado (tras aplicar H-11) | Media | PostgreSQL (CHECK) |
| 16 | Rango y duplicados de `days_of_week` | — | Guardar `days_of_week = [1, 1, 8]` | Rechazado por duplicado y por valor fuera de 0-6 (tras aplicar H-13) | Media | PostgreSQL (CHECK) |
| 17 | `interval_days` inválido | — | Guardar `frequency_type = 'custom_interval'` con `interval_days = 0` | Rechazado (tras aplicar H-14) | Media | PostgreSQL (CHECK) |
| 18 | Cambio de `target_value` no altera estadísticas pasadas | Meta con historial de cumplimiento ya calculado (enero) | Cambiar `target_value` de 8 a 10 en febrero | El cumplimiento histórico de enero mantiene su porcentaje original; solo los registros futuros usan la nueva meta | Alta | Según estrategia elegida en D-04 (hoy: sin garantía — confirma H-24) |
| 19 | Cambio de frecuencia no altera programación histórica | Hábito con frecuencia distinta en un mes anterior | Cambiar `frequency_type`/`days_of_week` este mes | La programación histórica se conserva; las estadísticas pasadas basadas en "días programados" no cambian | Alta | Según decisión D-03 (hoy: sin garantía — confirma H-23) |
| 20 | Borrado lógico de un hábito — **parcialmente cubierta estructuralmente; pendiente de validación funcional** | Hábito activo con `habit_logs` y `goals` existentes, y otro hábito activo con nombre normalizado igual al que se restaurará | Cambiar `lifecycle_status` a `'deleted'`; luego intentar restaurarlo | Debe validar, como mínimo: (1) `lifecycle_status` cambia a `deleted`; (2) el hábito desaparece del Dashboard; (3) aparece en la vista de Papelera; (4) no aparece en el Checklist diario; (5) sus `habit_logs` permanecen intactos; (6) sus `goals` permanecen intactos; (7) Historial conserva los registros; (8) Estadísticas conserva la información histórica; (9) el hábito puede restaurarse; (10) si ya existe un hábito activo con el mismo nombre normalizado, la restauración se bloquea o solicita renombrar (ver H-06/sección 13); (11) en ningún punto del flujo se ejecuta `DELETE` físico | Alta | PostgreSQL (conservación de `habit_logs`/`goals`, índice único normalizado) + Servicios (orquestación correcta de borrado lógico/restauración) + Frontend (filtros, visualización, mensajes) + Pruebas de integración (flujo completo de principio a fin) |
| 21 | "Eliminar hábito y todos los registros" | Hábito con `habit_logs`, `habit_categories` y `goals` asociados | Ejecutar `DELETE FROM habits WHERE id = ...` desde la acción explícita de la interfaz (opción 3 del modal, sección 14) | Se ejecuta la eliminación destructiva autorizada; se eliminan `habit_logs`, `habit_categories` y `goals` asociados vía `CASCADE`; las estadísticas del usuario se recalculan sin esos datos | Alta | PostgreSQL (`CASCADE`, ya correcto) + Servicios (debe ser la única ruta que dispare esta acción, ver sección 14) |

---

## 19. Comparación con los documentos del proyecto

Se leyeron `MDs/01_PRODUCT_CONTEXT.md`, `MDs/02_FRONTEND_ARCHITECTURE.md`, `MDs/03_DESIGN_SYSTEM.md`, `MDs/04_SCREEN_SPECIFICATIONS.md`, `MDs/05_DATA_MODELS_AND_MOCKS.md`, `MDs/06_IMPLEMENTATION_ROADMAP.md` y `MDs/07_ACCEPTANCE_CRITERIA.md` completos para esta comparación.

| Campo o funcionalidad | Documento de origen | Existe en BD | Tabla actual | Clasificación | Recomendación |
|---|---|---|---|---|---|
| `preferred_time` | No aparece en los documentos actuales de `MDs/` — ver nota de trazabilidad abajo | No | — | Decisión funcional pendiente por inconsistencia documental | Ver alternativas A/B y D-07 abajo |
| `sort_order` (orden manual de hábitos) | No confirmado — no aparece en ningún documento | No | — | Falta definir | El orden de hábitos no está especificado; no se documenta si es alfabético, por creación, o manual |
| `theme` / apariencia | `04_SCREEN_SPECIFICATIONS.md` (Configuración → Apariencia: claro/oscuro/sistema), `07_ACCEPTANCE_CRITERIA.md` ("Incluye tema") | Parcial — el selector existe en frontend (`useTheme.tsx`), pero **no hay columna persistida en `profiles`** | — | Parcialmente cubierto | Agregar `profiles.theme` si se desea que la preferencia persista entre dispositivos/sesiones; hoy es solo de sesión, consistente con la regla "no usar `localStorage`" del proyecto |
| `minimum_target` | No aparece en los documentos actuales de `MDs/` — ver nota de trazabilidad abajo | No | — | Decisión funcional pendiente por inconsistencia documental | Ver alternativas A/B y D-07 abajo |
| `ideal_target` | Mismo caso que `minimum_target` | No | — | Decisión funcional pendiente por inconsistencia documental | Ver alternativas A/B y D-07 abajo |
| `paused_at` | `01_PRODUCT_CONTEXT.md` (estado "Pausado" del ciclo de vida) | Parcial — existe el estado `lifecycle_status = 'paused'`, no un timestamp de cuándo ocurrió | `habits.lifecycle_status` | Fase posterior | Útil si se necesita saber desde cuándo está pausado un hábito; no bloqueante |
| `archived_at` | `01_PRODUCT_CONTEXT.md` (estado "Archivado") | Parcial — mismo razonamiento | `habits.lifecycle_status` | Fase posterior | Igual que `paused_at` |
| `deleted_at` | `01_PRODUCT_CONTEXT.md`, `04_SCREEN_SPECIFICATIONS.md` (papelera) | Parcial — existe `lifecycle_status = 'deleted'`, sin timestamp | `habits.lifecycle_status` | Fase posterior | Relevante para una futura política de purga automática de la papelera (por ejemplo, "eliminar definitivamente tras 30 días") |
| Recordatorios por hábito (granularidad individual) | `04_SCREEN_SPECIFICATIONS.md` documenta "recordatorios" solo como toggle general en Configuración → Notificaciones, no por hábito | No | `profiles.notify_reminders` (general, no por hábito) | Falta definir | Los documentos no especifican recordatorios por hábito individual; si el producto lo define, sería una fase posterior |
| `reminder_time` (por hábito) | No confirmado — no aparece en ningún documento | No | — | Falta definir | Mismo caso que arriba |
| `reminder_enabled` (por hábito) | No confirmado — no aparece en ningún documento | No | — | Falta definir | Mismo caso |
| `deadline_time` | `01_PRODUCT_CONTEXT.md` ("Hora límite" como tipo de meta), `05_DATA_MODELS_AND_MOCKS.md` (`deadlineTime` en `Habit`) | Sí | `habits.deadline_time` | Ya cubierto | — |
| `unit` | `05_DATA_MODELS_AND_MOCKS.md` (`targetUnit` en `Habit`, `unit` en `Goal`) | Sí | `habits.target_unit`, `goals.unit` | Ya cubierto | — |
| `icon` | `05_DATA_MODELS_AND_MOCKS.md` (`icon` en `Habit` y `Category`) | Sí | `habits.icon`, `categories.icon` | Ya cubierto | — |
| `color` | `05_DATA_MODELS_AND_MOCKS.md` (`color` en `Habit` y `Category`) | Sí | `habits.color`, `categories.color` | Ya cubierto | — |
| `notes` (por registro diario) | `04_SCREEN_SPECIFICATIONS.md` ("nota" en tarjeta de hábito), `05_DATA_MODELS_AND_MOCKS.md` (`note` en `HabitLog`) | Sí | `habit_logs.note` | Ya cubierto | — |
| `notes` (a nivel de hábito, no por día) | No confirmado — no aparece en los documentos; solo existe `description` a nivel de hábito | No | — | Falta definir | Si se necesita una nota general del hábito distinta de la descripción, no está especificada hoy |
| Estado de eliminación (papelera) | `01_PRODUCT_CONTEXT.md`, `04_SCREEN_SPECIFICATIONS.md`, `07_ACCEPTANCE_CRITERIA.md` (tabs Activos/Pausados/Archivados/Papelera, tres opciones del modal) | Sí para `habits`. No para `categories`/`goals` | `habits.lifecycle_status` | Parcialmente cubierto | Ver decisiones pendientes D-01, D-02 |
| Configuración responsive dependiente de preferencias | `07_ACCEPTANCE_CRITERIA.md` (usable en 375/768/1440px) | No aplica | — | Resuelto fuera de la base | El diseño responsive es una decisión de CSS/breakpoints del frontend; ningún documento define una preferencia de "modo compacto" o similar que deba persistirse en base de datos |

### Nota de trazabilidad: `preferred_time`, `minimum_target`, `ideal_target`

Estos tres campos no aparecen en los documentos actuales de `MDs/` (confirmado por búsqueda de texto). Sin embargo, **sí aparecieron durante la definición funcional previa del producto** (No confirmado en qué documento o conversación exactamente — esa referencia no está disponible para esta auditoría), aunque no quedaron incorporados en los documentos MD que existen hoy en el repositorio. Por lo tanto, **no deben clasificarse simplemente como inexistentes o descartados** — se clasifican como **"Decisión funcional pendiente por inconsistencia documental"**, una categoría distinta de "Falta definir" (que implicaría que nunca se consideraron).

**Aclaración conceptual:** `minimum_target` e `ideal_target` no serían un nuevo valor de `GoalType` — serían **atributos adicionales aplicables a tipos de meta ya existentes** como `quantity`, `duration` o `repetitions` (por ejemplo, "mínimo 6 vasos de agua, ideal 8"). `preferred_time` representa una **hora sugerida o preferida** para realizar el hábito, conceptualmente distinta de `deadline_time` (que es un límite, no una sugerencia).

**Alternativa A — mantenerlos en el MVP:** actualizar `01_PRODUCT_CONTEXT.md` y `05_DATA_MODELS_AND_MOCKS.md` para incorporarlos formalmente a la definición del producto, y diseñar las columnas correspondientes en `habits` (no se hace en esta revisión).

**Alternativa B — posponerlos:** documentarlos explícitamente como fase posterior, sin agregarlos al esquema actual ni a los documentos de producto por ahora.

No se modifican `01_PRODUCT_CONTEXT.md`, `05_DATA_MODELS_AND_MOCKS.md` ni ningún otro documento en esta revisión — la elección entre A y B queda registrada como decisión pendiente **D-07**: *"Definir si `preferred_time`, `minimum_target` e `ideal_target` permanecen dentro del MVP o se posponen."*

---

## 20. Plan de corrección propuesto (pendiente de aprobación — nada de esto se ejecutó)

Se mantiene el plan de la Revisión 2, con las filas nuevas de esta revisión agregadas al final de cada bloque de prioridad.

| Prioridad | Acción | Hallazgo / decisión relacionada |
|---|---|---|
| Alta | Versionar las migraciones existentes dentro de `supabase/migrations/` en el repositorio | H-04 |
| Alta | Cerrar el hueco de propiedad cruzada en la política de `habit_categories` (validar también `category_id`) | H-01 |
| Alta | Agregar validación de que `goals.habit_id` pertenezca al mismo `user_id` que la meta | H-02 |
| Alta | Definir mecanismo para mantener `goals.current_value` sincronizado (trigger, vista calculada, o recálculo explícito), incluyendo si se agrega `progress_source` | H-03, D-05 |
| Alta | **(Nuevo)** Decidir si se implementa `habit_schedules` y en qué fase, antes de construir cualquier estadística que dependa de "días programados" | H-23, D-03 |
| Alta | **(Nuevo)** Decidir la estrategia de conservación de historial de metas (A/B/C) antes de que existan usuarios editando metas con datos reales acumulados | H-24, D-04 |
| Alta | Definir e implementar la ventana de edición de siete días para INSERT, UPDATE y DELETE, considerando la zona horaria almacenada en `profiles.timezone` (ver detalle ampliado en sección 15) | H-05, H-25, D-06 |
| Media | Agregar unicidad **normalizada** (`lower(btrim(name))`) en `habits` y `categories`, como índice único parcial que excluya `lifecycle_status = 'deleted'` | H-06 (ampliado, sección 13) |
| Media | Agregar `CHECK` de longitud/no-vacío en `name` (habits, categories) | H-07 |
| Media | Agregar `CHECK (target_value > 0)` en `habits` y `goals` | H-08 |
| Media | Agregar `CHECK (end_date >= start_date)` en `habits` y `goals` | H-09 |
| Media | Agregar `CHECK` de coherencia condicional `frequency_type` ↔ columnas dependientes | H-11 |
| Media | Agregar `CHECK` de coherencia condicional `goal_type` ↔ columnas dependientes | H-12 |
| Media | Agregar `CHECK` de rango 0-6 (y sin duplicados) en cada elemento de `days_of_week` | H-13 |
| Media | Agregar `CHECK > 0` en `frequency_target` e `interval_days` | H-14 |
| Media | Agregar `CHECK >= 0` en `habit_logs.value` y `goals.current_value` | H-15, H-16 |
| Media | Cambiar el rol de las 7 políticas RLS de `public` a `authenticated` | H-17 |
| Baja | Agregar índice en `habit_categories.category_id` | H-20 |
| Baja | Explicitar `WITH CHECK` en la política UPDATE de `profiles` | H-18 |
| Baja | Optimizar políticas RLS con `(select auth.uid())` | H-19 |
| Baja | Evaluar eliminar `habit_logs_habit_id_idx` por redundancia parcial | H-21 |
| Baja | Evaluar alinear `search_path` de `handle_new_user` a `''` por consistencia | H-22 |
| Alta | Restringir el `DELETE` físico directo sobre `habits` (retirarlo de la política `ALL`) y exponer la eliminación permanente mediante una RPC controlada (`permanently_delete_habit`), con funciones de servicios diferenciadas (`archiveHabit`, `softDeleteHabit`, `restoreHabit`, `permanentlyDeleteHabit`) | H-10 (sección 14) |
| Pendiente de decisión de producto | Definir si `categories` y `goals` necesitan borrado lógico equivalente al de `habits` | D-01, D-02 |
| Pendiente de decisión de producto | Definir si `preferred_time`, `minimum_target` e `ideal_target` permanecen en el MVP o se posponen a una fase posterior | D-07 (sección 19) |

---

## 21. Veredicto final

Se separa explícitamente el veredicto para **desarrollo** (continuar construyendo sobre este esquema) del veredicto para **producción** (exponer la aplicación a usuarios reales), tal como se solicitó para esta revisión.

### Estado para desarrollo

**Aprobada con observaciones.**

El esquema es funcionalmente correcto para continuar el desarrollo del backend y conectar el frontend en un entorno de pruebas: el modelo relacional es sólido, RLS está activo en las 6 tablas, y no se detectaron problemas de aislamiento en la inspección estática. Los hallazgos altos y las decisiones pendientes documentadas hasta esta revisión (H-01 a H-05, H-23, H-24, H-25, D-01 a D-07) no impiden seguir desarrollando, pero sí deberían resolverse **antes de implementar Estadísticas/Historial sobre datos reales**, ya que varios de ellos (H-23, H-24, H-05/H-25) afectan directamente la corrección de cálculos que esas pantallas ya realizan sobre datos mock hoy.

### Estado para producción

**No lista — bloqueada por seguridad, integridad y decisiones funcionales pendientes.**

No se afirma que la base de datos sea segura para producción. Los bloqueadores no se limitan a los hallazgos de severidad alta — se agrupan en tres categorías:

**Seguridad e integridad cruzada:**
- H-01 (`habit_categories` no valida propiedad de `category_id`)
- H-02 (`goals.habit_id` no valida mismo `user_id`)
- H-04 (migraciones no versionadas localmente)
- Pruebas funcionales con dos usuarios reales de la sección 18 (ninguna fue ejecutada en ninguna de las cuatro revisiones) — la seguridad de aislamiento solo se confirmó mediante inspección estática del código SQL, no mediante pruebas de comportamiento real

**Integridad estructural:**
- H-06, H-07 (nombres duplicados/sin límite de longitud), H-08, H-09 (valores y fechas sin validar), H-11, H-12 (coherencia condicional de `frequency_type`/`goal_type`), H-13, H-14 (rangos de `days_of_week`/`frequency_target`/`interval_days`), H-15, H-16 (signos de `habit_logs.value`/`goals.current_value`)

Estos hallazgos de severidad **media** no son vulnerabilidades de acceso — ningún usuario podría leer o modificar datos ajenos a través de ellos — pero sí permiten que la base de datos **guarde datos corruptos o inconsistentes** (nombres duplicados, metas negativas, fechas invertidas, combinaciones de frecuencia sin sentido). Por eso también bloquean producción: una base de datos puede ser segura en cuanto a aislamiento por usuario y aun así no estar lista si permite guardar información que la aplicación no sabría interpretar correctamente.

**Decisiones funcionales necesarias:**
- D-03 (historial de frecuencia / `habit_schedules`)
- D-04 (historial de configuración de metas)
- D-05 (sincronización de `goals.current_value`)
- D-06 (ventana de edición de 7 días, con garantía obligatoria en PostgreSQL, no solo en `src/services`)
- D-07 (`preferred_time`, `minimum_target`, `ideal_target`: MVP o fase posterior)

Sin resolver estas decisiones, cualquier estadística histórica mostrada a un usuario real (cumplimiento pasado, rachas, comparación contra frecuencia programada) puede quedar **incorrecta** ante el primer cambio de configuración que haga ese usuario.

---

## 22. Metodología y evidencia

Sin cambios en las herramientas usadas respecto a la Revisión 2 (MCP de Supabase en modo lectura). Para esta revisión se añadió la lectura completa de `MDs/01_PRODUCT_CONTEXT.md`, `MDs/02_FRONTEND_ARCHITECTURE.md`, `MDs/03_DESIGN_SYSTEM.md`, `MDs/04_SCREEN_SPECIFICATIONS.md`, `MDs/05_DATA_MODELS_AND_MOCKS.md`, `MDs/06_IMPLEMENTATION_ROADMAP.md` y `MDs/07_ACCEPTANCE_CRITERIA.md`, más una búsqueda de texto (`grep`) sobre todos los documentos de `MDs/` para confirmar la ausencia de los campos comparados en la sección 19.

**No confirmado / fuera del alcance de esta revisión:**
- Todo lo ya listado como no confirmado en la Revisión 2 (comportamiento bajo carga real, configuración de `auth.*` más allá de `profiles`, backups, rendimiento real bajo volumen de producción).
- El límite exacto (inclusive/exclusive) del séptimo día en la regla de edición de 7 días — no está definido en ningún documento del proyecto.
- Si un registro `not_applicable` está sujeto a la misma ventana de edición que los demás estados.
- Resultado real de las pruebas de la sección 18 (propuestas, no ejecutadas).

---

## 23. Cierre provisional de la auditoría

- Esta Revisión 4 se considera la **versión final provisional** del ciclo de auditoría de solo lectura iniciado en la Revisión 1.
- La auditoría **no volverá a ampliarse únicamente con decisiones teóricas o análisis conceptuales adicionales** sobre el esquema actual sin modificaciones reales de por medio.
- Las decisiones pendientes **D-01 a D-07** se resolverán y documentarán en `MDs/10_DATABASE_DECISIONS.md` (no creado en esta revisión), no en futuras ediciones de este documento.
- Cualquier corrección futura del esquema (los `CHECK`, índices, políticas y funciones descritos en el plan de corrección de la sección 20) deberá implementarse mediante **migraciones versionadas** — en el repositorio local, resolviendo también H-04.
- Después de aplicar esas migraciones se realizará una **auditoría de verificación distinta** a esta, no una nueva revisión de este mismo documento.
- Esa auditoría de verificación deberá **comparar explícitamente el estado anterior (esta Revisión 4) contra el estado posterior** a las migraciones aplicadas.
- Las **pruebas funcionales con dos usuarios reales** (sección 18) serán obligatorias antes de considerar la base de datos lista para producción, independientemente de cuántos hallazgos estructurales se corrijan.

---

## 24. Registro de cambios de la Revisión 2

Cambios aplicados sobre la versión 1 del documento (conservado por trazabilidad).

1. Corregidas todas las referencias cruzadas incorrectas entre secciones y hallazgos.
2. Reemplazada la afirmación "sin fugas detectadas" por "sin vulnerabilidades evidentes en inspección estática; pendiente de pruebas con dos usuarios".
3. Agregado hallazgo alto H-02: `goals.habit_id` no valida que el hábito pertenezca al mismo `user_id` que la meta.
4. Agregadas validaciones faltantes como hallazgos nuevos (H-11 a H-16).
5. Agregado hallazgo alto H-03: riesgo de desincronización de `goals.current_value`.
6. Agregada evaluación H-17 sobre cambiar las políticas RLS del rol `public` a `authenticated`.
7. Reescrita la evaluación del `search_path` de `handle_new_user` (H-22) sin afirmar inseguridad.
8. Agregada la sección "Posibles tablas faltantes", con énfasis en `habit_schedules` y `habit_log_entries`.
9. Cerrada la ambigüedad de la regla de negocio #9 (acumulación atómica en una sola fila).
10. Reclasificados los puntos sobre `categories` y `goals` sin borrado lógico como decisiones de producto pendientes (D-01, D-02).

---

## 25. Registro de cambios de la Revisión 3

Cambios aplicados sobre la Revisión 2, a partir de nuevas observaciones de revisión. No se modificó la base de datos en ningún momento de este proceso.

1. Actualizado el encabezado del documento a Revisión 3, con fecha de esta revisión y confirmación explícita de que la base de datos sigue sin modificaciones desde la Revisión 2.
2. Agregada la sección 11, "Historial de configuración — frecuencia de hábitos (`habit_schedules`)": análisis del escenario enero/febrero, clasificación como "necesaria antes de implementar estadísticas reales que dependan de la programación esperada", y propuesta conceptual de campos (`id`, `habit_id`, `frequency_type`, `days_of_week`, `frequency_target`, `interval_days`, `valid_from`, `valid_to`, `created_at`). No se creó la tabla.
3. Agregada la sección 12, "Historial de configuración — metas del hábito": análisis del escenario de enero/febrero con `target_value`, y comparación de las tres estrategias (A: snapshot en `habit_logs`, B: versionado dedicado, C: configuración vigente por rango de fechas), cada una con ventajas, desventajas, complejidad, impacto en Estadísticas y recomendación. Ninguna fue implementada.
4. Ampliada la sección 13 con la propuesta de unicidad normalizada (`lower(btrim(name))` como índice único parcial excluyendo `lifecycle_status <> 'deleted'`), su efecto sobre hábitos en papelera, la posibilidad de reutilizar nombres tras el borrado lógico, la estrategia equivalente para `categories`, y la implicación de que `categories` no tenga borrado lógico hoy (D-01).
5. Agregada la sección 14, que reclasifica `goals.habit_id ON DELETE CASCADE` (H-10): ya no se presenta como defecto automático, sino como contrato de implementación correcto para la opción "eliminar hábito y todos sus registros" del modal de eliminación de tres opciones (confirmado en `01_PRODUCT_CONTEXT.md` y `04_SCREEN_SPECIFICATIONS.md`), documentando qué acción de base de datos corresponde a cada una de las tres opciones de la interfaz.
6. Agregada la sección 15, que amplía H-05 distinguiendo INSERT/UPDATE/DELETE por separado, define casos límite (séptimo día exacto, fechas futuras, registros `not_applicable`, `service_role`), documenta el riesgo de zona horaria frente a `profiles.timezone` como nuevo hallazgo H-25, y evalúa cinco alternativas de implementación (RLS, RPC, trigger, servicios, combinación) con una recomendación diferenciada para MVP vs. mayor seguridad.
7. Agregada la sección 16, que amplía H-03 distinguiendo tres tipos de progreso de meta (vinculada a hábito, calculada, manual), propone conceptualmente un campo `progress_source`, y documenta las preguntas abiertas sobre quién actualiza `current_value`, cuándo debería recalcularse, y si debería almacenarse, calcularse al vuelo, o mantenerse por trigger/RPC/servicio.
8. Ampliada la sección 18 ("Pruebas recomendadas") con 13 casos nuevos (numerados 9 a 21), cada uno con objetivo, precondición, pasos, resultado esperado, prioridad y capa responsable, cubriendo los escenarios pedidos en esta revisión (categorías cruzadas, metas cruzadas, ventana de 7 días para UPDATE/DELETE/INSERT retroactivo, duplicados normalizados, coherencia condicional de frecuencia y de metas, cambios retroactivos de meta y de frecuencia, borrado lógico, y eliminación destructiva completa).
9. Agregada la sección 19, "Comparación con los documentos del proyecto": matriz de 19 campos/funcionalidades contra los documentos `01`, `02`, `03`, `04`, `05`, `06` y `07` de `MDs/`, indicando documento de origen (o "No confirmado" si no aparece en ningún documento), si existe en la base de datos, tabla actual, clasificación y recomendación.
10. Agregados los hallazgos H-23, H-24 y H-25, y las decisiones pendientes D-03, D-04, D-05 y D-06, todos con evidencia o razonamiento funcional explícito, continuando la numeración existente sin renumerar los hallazgos previos.
11. Actualizado el plan de corrección (sección 20) con las filas nuevas correspondientes a H-23, H-24, H-25 y la ampliación de H-06 y H-10.
12. Actualizado el veredicto final (sección 21), separando explícitamente el estado para desarrollo ("Aprobada con observaciones") del estado para producción ("No lista — bloqueada por hallazgos altos"), sin afirmar en ningún momento que la base de datos sea segura para producción, dado que las pruebas funcionales con dos usuarios siguen sin ejecutarse en las tres revisiones realizadas hasta ahora.

---

## 26. Registro de cambios de la Revisión 4

Cambios aplicados sobre la Revisión 3. No se modificó la base de datos en ningún momento de este proceso.

1. Consolidada la duplicidad de la ventana de edición de siete días en el plan de corrección (sección 20): una sola acción de prioridad alta, ligada a H-05, H-25 y D-06; eliminada la fila duplicada de prioridad media.
2. Aclarado, en la sección 15, que `src/services` forma parte del frontend React ejecutado en el navegador, que no representa una frontera de seguridad, que un usuario podría llamar directamente a la API de Supabase evitando esa validación, y que la garantía definitiva de cualquier regla debe existir en PostgreSQL; reformulada la recomendación para MVP y para producción en esos términos.
3. Ampliada la sección 11: `habit_schedules` definida como fuente de verdad única (alternativa recomendada, consultando `valid_to IS NULL` o una vista conceptual `current_habit_schedule`) frente a la alternativa secundaria de mantener una copia en `habits` sincronizada transaccionalmente; agregadas las restricciones conceptuales necesarias para la tabla (sin rangos superpuestos, una sola fila vigente, `valid_to` posterior a `valid_from`, coherencia de `frequency_type`, propiedad del `habit_id`, cierre/apertura atómicos).
4. Ampliada la estrategia A de la sección 12: los campos de snapshot no deben ser controlados libremente por el cliente React (riesgo de manipular `target_value_snapshot` para simular un cumplimiento falso); deben copiarse desde la configuración vigente mediante una operación confiable del lado de la base de datos (RPC, trigger, función controlada), clasificado como requisito de integridad obligatorio.
5. Documentado en la sección 14 el riesgo de que la política `ALL` de `habits` permita `DELETE` físico directo sin pasar por una acción explícita de eliminación destructiva; agregada la recomendación de restringirlo y exponer la eliminación permanente mediante una RPC específica (`permanently_delete_habit`) y funciones de servicios diferenciadas; actualizado H-10 en consecuencia.
6. Incorporada la decisión pendiente D-07 (sección 19): `preferred_time`, `minimum_target` e `ideal_target` reclasificados como "decisión funcional pendiente por inconsistencia documental" (aparecieron en la definición funcional previa del producto, pero no en los documentos MD actuales), con las alternativas de mantenerlos en el MVP o posponerlos.
7. Corregida la prueba funcional de borrado lógico (caso 20, sección 18): ya no se afirma que la funcionalidad esté completamente cubierta; reclasificada como "parcialmente cubierta estructuralmente; pendiente de validación funcional", con 11 condiciones específicas a validar y la capa responsable dividida entre PostgreSQL, Servicios, Frontend y Pruebas de integración.
8. Ampliado el veredicto de producción (sección 21): los bloqueadores ya no se limitan a los hallazgos de severidad alta — se agrupan explícitamente en seguridad e integridad cruzada, integridad estructural (hallazgos medios, aclarando que permiten datos corruptos aunque no sean vulnerabilidades de acceso) y decisiones funcionales necesarias (incluyendo D-07).
9. Revisión final de consistencia: corregida una referencia cruzada incorrecta en el encabezado (apuntaba a la sección 25 en vez de la 23 para el cierre provisional), renumeradas las secciones posteriores a la Metodología para insertar el cierre provisional antes de los registros de cambios, normalizado el vocabulario de la columna Estado de los hallazgos a cinco valores cerrados (`Abierto`, `Decisión pendiente`, `Resuelto documentalmente`, `Pendiente de prueba`, `Cerrado`), y confirmado que ningún hallazgo quedó marcado como `Cerrado`.
10. Agregada la sección 23, "Cierre provisional de la auditoría": esta Revisión 4 se declara versión final provisional, las decisiones D-01 a D-07 se resolverán en `MDs/10_DATABASE_DECISIONS.md` (no creado), las futuras correcciones deberán implementarse mediante migraciones versionadas, y las pruebas con dos usuarios seguirán siendo obligatorias antes de producción.
