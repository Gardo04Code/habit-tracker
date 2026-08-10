# 10 — Decisiones de Base de Datos

**Fecha:** 2026-07-28
**Proyecto:** Habit Tracker
**Documento de origen obligatorio:** `MDs/09_DATABASE_AUDIT.md` (Revisión 4 — Versión final provisional)
**Documentos adicionales consultados:** `MDs/01_PRODUCT_CONTEXT.md`, `MDs/02_FRONTEND_ARCHITECTURE.md`, `MDs/04_SCREEN_SPECIFICATIONS.md`, `MDs/05_DATA_MODELS_AND_MOCKS.md`, `MDs/06_IMPLEMENTATION_ROADMAP.md`, `MDs/07_ACCEPTANCE_CRITERIA.md`
**Estado inicial del documento:** Borrador para aprobación.

## Alcance

Este documento resuelve, o marca explícitamente como pendientes, las siete decisiones arquitectónicas (D-01 a D-07) identificadas en `09_DATABASE_AUDIT.md`. Para cada una presenta el problema, la evidencia en que se basa, las alternativas consideradas, una comparación técnica, una recomendación, y una redacción de la decisión propuesta lista para ser aprobada o rechazada.

## Exclusiones

- Este documento **no implementa** ningún cambio. No contiene SQL ejecutable, no crea tablas, no modifica columnas, políticas, funciones ni triggers.
- No modifica `09_DATABASE_AUDIT.md` ni ningún otro documento del proyecto.
- No toma decisiones que dependan de información que no exista en los documentos del proyecto — esos puntos se marcan como "Pendiente de aprobación del producto" y se listan como preguntas en la sección 12.
- No es una auditoría — es un documento de decisión. Los hallazgos técnicos (H-XX) ya están documentados en `09_DATABASE_AUDIT.md` y aquí solo se referencian, no se repiten en detalle.

## Relación con futuras migraciones

Este documento es la **fuente oficial** a partir de la cual se diseñarán las migraciones versionadas mencionadas en `09_DATABASE_AUDIT.md` §23 ("Cierre provisional de la auditoría"). Ninguna migración debería escribirse para una decisión que siga en estado "Pendiente de aprobación" — el flujo esperado es: aprobar aquí → diseñar migración → aplicar como migración versionada → auditoría de verificación posterior.

---

## D-01 — Borrado lógico de `categories`

### Problema

`categories` no tiene ninguna columna de estado, `deleted_at`, ni mecanismo de papelera — a diferencia de `habits`, que sí tiene `lifecycle_status` con soporte completo de archivado/pausado/eliminado/restauración. Cuando una categoría está asociada a uno o más hábitos (vía `habit_categories`) y el usuario intenta eliminarla, hoy no hay ninguna regla definida sobre qué debe ocurrir.

### Evidencia

- `09_DATABASE_AUDIT.md` — decisión D-01, hallazgo H-06 (unicidad normalizada depende de si existe borrado lógico), sección 2.2, sección 13.
- `05_DATA_MODELS_AND_MOCKS.md` — el tipo `Category` no tiene campo de estado (`{ id, name, color, icon }`).
- `01_PRODUCT_CONTEXT.md` y `04_SCREEN_SPECIFICATIONS.md` — **no mencionan** eliminación de categorías en ningún punto; la papelera y el modal de tres opciones documentados son específicos de `habits`. No existe una "papelera de categorías" especificada en ningún documento.

### Alternativas

- **A. Borrado físico inmediato** — `DELETE` directo sobre `categories`. El `CASCADE` existente en `habit_categories.category_id` desvincula automáticamente los hábitos que la usaban (sin borrar los hábitos).
- **B. Borrado lógico con estado** — replicar el patrón de `habits`: agregar `lifecycle_status`/`deleted_at`, papelera y restauración.
- **C. Impedir borrar mientras esté en uso** — bloquear el `DELETE` si existe alguna fila en `habit_categories` que la referencie; el usuario debe desvincularla de todos los hábitos primero.
- **D. Desvincular de hábitos y borrar** — variante explícita de A: al eliminar, se desvincula (ya ocurre por `CASCADE`) y luego se borra físicamente, sin bloquear la operación.
- **E. Archivar en vez de eliminar** — versión más ligera que B: una sola marca (por ejemplo `archived_at`), sin los cuatro estados completos de `habits`, sin papelera con restauración formal.

### Comparación

| Alternativa | Ventajas | Desventajas | Complejidad | Impacto en frontend | Impacto en BD | Riesgo |
|---|---|---|---|---|---|---|
| A. Borrado físico inmediato | Simple, sin estado adicional que mantener | Pérdida irreversible; sin papelera; inconsistente con el patrón ya usado en `habits` | Baja | Ninguno adicional | Ninguno adicional | Bajo técnicamente, pero mala experiencia si el usuario borra por error |
| B. Borrado lógico con estado | Consistente con `habits`; permite restaurar | Los estados `paused`/`archived` de `habits` no tienen equivalente conceptual claro para una categoría (una categoría no se "pausa"); sobredimensionado para el caso de uso | Media-alta | Requiere UI de papelera para categorías (no especificada en los documentos) | Nueva columna + índice único condicionado (ver H-06) | Bajo, pero esfuerzo desproporcionado si el producto no lo pide |
| C. Impedir borrar mientras esté en uso | Sin riesgo de pérdida de datos; sin nueva columna | Mala experiencia si la categoría está muy usada (el usuario debe desvincularla hábito por hábito, o el frontend debe ofrecer una acción masiva) | Baja (una validación) | Requiere mensaje claro de error/confirmación | Ninguno | Bajo |
| D. Desvincular y borrar | Comportamiento predecible; ya es lo que hace el `CASCADE` actual | Igual que A: sin papelera | Baja | Ninguno adicional | Ninguno adicional | Igual que A |
| E. Archivar en vez de eliminar | Más simple que B; dueño puede "ocultarla" sin perderla | Sigue siendo una funcionalidad no pedida por ningún documento | Media | Requiere UI para mostrar/ocultar archivadas | Una columna (`archived_at` o similar) | Bajo |

### Recomendación técnica

**Actualizado.** Se adopta una variante simplificada de **B**: `categories` tendrá únicamente dos estados — `active` y `deleted` — sin `paused` ni `archived` (esos dos no tienen equivalente conceptual claro para una categoría, como ya señalaba la comparación de arriba). La eliminación será mediante borrado lógico (`lifecycle_status = 'deleted'`, o una columna equivalente de dos valores), permitiendo restaurar una categoría eliminada. Esto evita el sobredimensionamiento de replicar los cuatro estados completos de `habits`, a la vez que da paridad mínima de recuperación con el patrón ya usado ahí.

### Decisión propuesta

*Se agrega a `categories` un estado de dos valores (`active` / `deleted`), sin `paused` ni `archived`. Eliminar una categoría es un borrado lógico (marca `deleted`), no un `DELETE` físico. Las categorías eliminadas pueden restaurarse (`active` de nuevo). El índice único normalizado de H-06 excluye las categorías en estado `deleted`, permitiendo reutilizar el nombre mientras el original permanece en la papelera, igual que en `habits`.*

### Estado

**Aprobada** — ver "Decisiones aprobadas" al final del documento.

### Consecuencias

- Tabla `categories`: nueva columna de estado (dos valores: `active`/`deleted`), sin las columnas de auditoría adicionales (`paused_at`/`archived_at`) que sí podría necesitar `habits` en el futuro.
- El índice único normalizado de H-06/sección 13 debe incluir la cláusula `WHERE` que excluya las categorías en estado `deleted`, igual que el propuesto para `habits`.
- Requiere una vista de papelera para categorías (nueva, no existía en los documentos originales) y su acción de restauración correspondiente, análoga a la ya construida para hábitos.
- El `CASCADE` existente en `habit_categories.category_id` deja de ser el mecanismo principal de limpieza para el flujo normal de "eliminar categoría" (que ahora es un `UPDATE`, no un `DELETE`) — sigue existiendo como resguardo para el caso, ya poco frecuente, de un borrado físico administrativo.

### Criterios de aceptación

- Eliminar una categoría cambia su estado a `deleted`, sin ejecutar `DELETE` físico y sin afectar los hábitos que la usaban (conservan la asociación en `habit_categories`, simplemente la categoría deja de listarse como activa).
- Una categoría en estado `deleted` no aparece en los selectores de categoría al crear/editar un hábito, pero sí en la vista de papelera de categorías.
- Restaurar una categoría la regresa a `active`; si ya existe otra categoría activa con el mismo nombre normalizado, la restauración se bloquea o solicita renombrar (mismo criterio que H-06 aplica a `habits`).
- No se agregan valores `paused` ni `archived` al estado de `categories`.

### Migraciones futuras relacionadas

Agregar la columna de estado de dos valores a `categories` (con su valor por defecto `active`); ajustar el índice único normalizado de H-06 para excluir `deleted`; agregar la política/lógica de restauración correspondiente.

---

## D-02 — Ciclo de vida de `goals`

### Problema

`goal_status` solo contempla `active`, `completed`, `expired`. Sin embargo, `04_SCREEN_SPECIFICATIONS.md` (sección "Metas → Acciones") documenta explícitamente las acciones **"pausar"** y **"finalizar"** además de crear/editar/ver detalle — y **"pausar" no tiene ningún valor equivalente en `goal_status`**. Tampoco existe un estado para una meta que el usuario decide eliminar (el frontend actual del proyecto ya implementa una acción "Eliminar meta" en el menú de opciones de cada meta, sin que eso se refleje en el enum).

### Evidencia

- `09_DATABASE_AUDIT.md` — decisión D-02, sección 2.6.
- `04_SCREEN_SPECIFICATIONS.md`, sección "6. Metas": *"Estados: Activa / Cumplida / Vencida"* (coincide con el enum actual) pero *"Acciones: crear meta; editar; pausar; finalizar; ver detalle"* — **"pausar" no tiene estado correspondiente hoy**.
- `01_PRODUCT_CONTEXT.md` no menciona metas pausadas, canceladas ni eliminadas en ninguna de sus reglas de negocio — solo habla de metas cumplidas/vencidas y de que "las metas cumplidas continúan visibles".

### Alternativas

- **A. Ampliar el enum `goal_status` actual**, agregando valores como `paused`, `cancelled`, `deleted` directamente.
- **B. Agregar una columna de ciclo de vida separada** (por ejemplo `goal_lifecycle_status`: `active` / `paused` / `archived` / `deleted`), dejando `goal_status` únicamente para el resultado de la meta (`active` / `completed` / `expired`).
- **C. No tocar el esquema** — tratar "pausar"/"eliminar" como interacciones solo de frontend, sin persistencia real.

### Comparación

| Alternativa | Ventajas | Desventajas | Complejidad | Impacto en frontend | Impacto en BD | Riesgo |
|---|---|---|---|---|---|---|
| A. Ampliar `goal_status` | Cambio mínimo, un solo enum | Mezcla dos conceptos distintos (resultado vs. visibilidad) — una meta "pausada" podría de todas formas estar "vencida" por fecha, generando estados contradictorios | Baja | Bajo | Alterar el tipo `enum` existente | Medio — el enum mezclado puede volverse difícil de interpretar correctamente en consultas |
| B. Columna de ciclo de vida separada | Separa claramente "¿se cumplió?" de "¿está visible/activa?"; una meta puede estar `expired` y `paused` a la vez sin ambigüedad; replica el patrón ya usado en `habits` | Una columna adicional a mantener | Media | Bajo-medio (filtros adicionales en Metas/Estadísticas) | Nueva columna | Bajo |
| C. Sin cambio de esquema | Cero esfuerzo de base de datos | La acción "pausar" documentada en `04_SCREEN_SPECIFICATIONS.md` quedaría sin soporte real, y "eliminar" ya implementada en frontend seguiría sin dejar rastro (hoy borra del arreglo mock sin registro) | — | — | — | Alto — contradice explícitamente lo documentado en `04_SCREEN_SPECIFICATIONS.md` |

### Recomendación técnica

**B.** Igual que en `habits`, separar el resultado (`goal_status`: `active`/`completed`/`expired`) del ciclo de vida/visibilidad (`goal_lifecycle_status`: `active`/`paused`/`deleted`) evita mezclar dos ejes de información distintos en un solo enum. No se recomienda incluir `archived` para metas salvo que el producto lo pida explícitamente (no aparece en ningún documento).

### Decisión propuesta

*Se agrega una columna `goal_lifecycle_status` (`active` / `paused` / `deleted`) a `goals`, independiente de `goal_status`. "Pausar" cambia `goal_lifecycle_status` a `paused` (la meta deja de contar activamente pero conserva su historial). "Eliminar" cambia `goal_lifecycle_status` a `deleted` (borrado lógico, con posibilidad de restaurar). Las metas pausadas/eliminadas dejan de aparecer en las vistas activas de Metas, pero conservan su historial en Estadísticas si estuvieron activas durante el periodo consultado.*

### Estado

**Pendiente de aprobación del producto** — la funcionalidad de "pausar" está mencionada una sola vez en `04_SCREEN_SPECIFICATIONS.md` sin desarrollarse en las reglas de negocio de `01_PRODUCT_CONTEXT.md`; no hay evidencia suficiente para confirmar si es una funcionalidad real planeada o un vestigio del mock. Ver pregunta P-02.

### Consecuencias

- Tabla `goals`: nueva columna `goal_lifecycle_status`.
- Página Metas: nuevos filtros/tabs para metas pausadas y eliminadas (papelera de metas), similar al patrón ya construido para hábitos.
- Estadísticas: debe decidirse si una meta pausada o eliminada sigue contando en el histórico ya mostrado (recomendación: sí, su historial pasado no debería desaparecer, análogo a cómo los hábitos pausados/archivados siguen en Estadísticas).

### Criterios de aceptación

- Pausar una meta la oculta de la lista de "Activas" sin eliminar su registro.
- Eliminar una meta la mueve a un estado recuperable, no la borra físicamente.
- Una meta pausada o eliminada sigue apareciendo en consultas históricas de Estadísticas que cubran el periodo en que estuvo activa.
- `goal_status` (resultado) y `goal_lifecycle_status` (visibilidad) pueden combinarse libremente sin generar un estado imposible.

### Migraciones futuras relacionadas

Agregar columna `goal_lifecycle_status` (enum nuevo) a `goals`, con su valor por defecto `active`; ajustar las políticas RLS de `goals` si se decide restringir qué operaciones puede hacer el cliente sobre esa columna directamente.

---

## D-03 — Historial de frecuencias (`habit_schedules`)

### Problema

`habits.frequency_type`/`days_of_week`/`frequency_target`/`interval_days` representan solo la configuración **vigente**. Un cambio de frecuencia sobrescribe esas columnas sin dejar rastro de qué frecuencia regía en periodos anteriores, lo que produciría estadísticas incorrectas en cualquier cálculo que compare "cumplido" contra "programado" para un hábito cuya frecuencia cambió alguna vez.

### Evidencia

`09_DATABASE_AUDIT.md` — H-23, D-03, secciones 11 y 19 (matriz de campos). Escenario documentado: hábito programado lunes/miércoles/viernes en enero, cambiado a martes/jueves en febrero — sin historial, la aplicación no podría reconstruir correctamente qué se esperaba en enero.

### Alternativas

- **A. Mantener la frecuencia solo en `habits`** (estado actual, sin cambios).
- **B. Crear `habit_schedules` como fuente de verdad única** — `habits` deja de tener significado propio para la frecuencia; se consulta siempre `habit_schedules` (fila con `valid_to IS NULL`, o una vista conceptual `current_habit_schedule`).
- **C. `habits` como caché + `habit_schedules` como historial** — `habits` conserva copias de lectura rápida, sincronizadas transaccionalmente con `habit_schedules` mediante un trigger o función que actualiza ambas en la misma operación.

### Diseño conceptual de `habit_schedules` (no creado)

```
habit_schedules
├── id                uuid, PK
├── habit_id          uuid, FK → habits.id
├── frequency_type    enum frequency_type
├── days_of_week      smallint[]
├── frequency_target  smallint
├── interval_days     smallint
├── valid_from        date, NOT NULL
├── valid_to          date, nullable (null = vigente)
└── created_at        timestamptz
```

Restricciones conceptuales necesarias: sin rangos superpuestos para un mismo `habit_id`; máximo una fila vigente (`valid_to IS NULL`) por `habit_id`; `valid_to` posterior a `valid_from`; `frequency_type` coherente con sus columnas dependientes (mismo requisito que H-11); `habit_id` debe pertenecer al usuario autenticado (RLS equivalente al patrón ya usado en `habit_logs`); el cambio de frecuencia (cerrar la versión vigente + abrir una nueva) debe ejecutarse como una única operación atómica, nunca como dos pasos independientes desde el cliente.

### Comparación

| Alternativa | Ventajas | Desventajas | Complejidad | Impacto en frontend | Impacto en BD | Riesgo |
|---|---|---|---|---|---|---|
| A. Solo en `habits` | Cero esfuerzo adicional | Estadísticas basadas en "días programados" quedarían incorrectas para hábitos con frecuencia cambiada | Ninguna | Ninguno | Ninguno | Alto, pero solo se materializa cuando se construyan esas estadísticas — hoy no bloquea nada |
| B. `habit_schedules` como fuente única | Una sola fuente de verdad, sin riesgo de desincronización | Toda lectura de "frecuencia actual" requiere resolver la fila vigente (join o vista) en vez de leer una columna directa | Media-alta | Bajo (los componentes ya consumen la frecuencia a través de hooks) | Nueva tabla + reescritura de cómo se lee/escribe la frecuencia | Bajo |
| C. `habits` caché + historial separado | Lecturas rápidas sin join | Riesgo de desincronización si la sincronización transaccional falla o se omite en algún punto de escritura (ejemplo ya documentado: `habits.days_of_week = [1,3,5]` vs. versión vigente `[2,4]`) | Alta | Bajo | Dos tablas a mantener sincronizadas | Medio — depende enteramente de que la sincronización atómica se implemente sin excepciones |

### Recomendación técnica

**Actualizado.** En vez de posponer `habit_schedules` hasta que exista una estadística que la necesite, se recomienda que **forme parte de la primera migración importante del proyecto**, junto con B como arquitectura (fuente de verdad única). Justificación: la base de datos está actualmente vacía (0 filas), por lo que este es el momento más barato posible para introducir la tabla — no hay datos históricos que migrar ni backfill que ejecutar para poblar una primera versión vigente por hábito. Introducirla después, una vez que existan hábitos y registros reales, obligaría a: (a) migrar/inferir retroactivamente cuál era la frecuencia vigente de cada hábito ya existente, (b) ejecutar un backfill sobre datos de producción, y (c) modificar las estadísticas que ya estuvieran en uso para pasar de leer `habits` a resolver `habit_schedules`. Ninguno de esos tres costos existe hoy. Se descarta C (caché en `habits` + historial separado) por el mismo riesgo de desincronización ya documentado.

### Decisión propuesta

*`habit_schedules` se crea en la primera migración importante del proyecto, como fuente de verdad única de la frecuencia (opción B): `habits` no conserva columnas de frecuencia con significado propio: la configuración vigente se resuelve siempre consultando la fila de `habit_schedules` con `valid_to IS NULL` (o una vista conceptual `current_habit_schedule`). El cambio de frecuencia de un hábito se implementa como la operación atómica de cerrar la versión vigente y abrir una nueva, descrita en la sección anterior.*

### Estado

**Aprobada** — ver "Decisiones aprobadas" al final del documento.

### Consecuencias

- Nueva tabla `habit_schedules`, creada desde el inicio — no requiere migración de datos históricos porque no existen filas previas que migrar.
- `habits` deja de tener columnas de frecuencia con significado propio (o se retiran si ya se habían creado); todo consumo de "frecuencia vigente" se resuelve vía `habit_schedules`.
- Cambios en `useStatistics.ts`/`useHistoryLogs.ts` (o sus futuros equivalentes de servicios) para resolver la configuración vigente por fecha desde el inicio, en vez de migrarlos después.
- El formulario de edición de hábito (`HabitFormModal`) dispara la operación atómica de cierre/apertura de versión al guardar un cambio de frecuencia.

### Criterios de aceptación

- Cambiar la frecuencia de un hábito no altera cómo se interpretó su cumplimiento en fechas anteriores al cambio.
- Nunca existen dos filas vigentes (`valid_to IS NULL`) simultáneas para el mismo `habit_id`.
- Consultar "qué frecuencia regía" en cualquier fecha pasada devuelve un resultado único y correcto.

### Migraciones futuras relacionadas

Creación de la tabla `habit_schedules` con sus restricciones, como parte de la primera migración importante del proyecto (no requiere una migración de datos históricos separada, al no existir hábitos previos); RLS equivalente al patrón de `habit_logs`.

---

## D-04 — Historial de metas

### Problema

`habits.target_value`/`goal_type`/`target_unit`/`deadline_time` (y los conceptuales `minimum_target`/`ideal_target` de D-07) también se sobrescriben sin historial. Cambiar la meta de un hábito alteraría retroactivamente el cumplimiento ya mostrado en periodos pasados si las estadísticas se recalculan con la configuración vigente en vez de la vigente en cada fecha.

### Evidencia

`09_DATABASE_AUDIT.md` — H-24, D-04, sección 12. Escenario documentado: meta de 8 vasos de agua cumplida al 100 % en enero; si en febrero se cambia a 10 vasos y las estadísticas de enero se recalculan con el nuevo valor, el 100 % de enero se convertiría incorrectamente en 80 %.

### Alternativas

- **A. Snapshots en `habit_logs`** — columnas como `target_value_snapshot`, `target_unit_snapshot`, `goal_type_snapshot` (y `minimum_target_snapshot`/`ideal_target_snapshot` si D-07 los conserva), copiadas al crear cada registro.
- **B. `habit_goal_versions`** — tabla dedicada de versiones de meta por rango de fechas, análoga a `habit_schedules`.
- **C. Versionado general del hábito** — unificar frecuencia y meta en una sola tabla de versiones (`habit_versions`) que cubra ambos conjuntos de columnas a la vez, en vez de tener `habit_schedules` y `habit_goal_versions` por separado.
- **D. Cálculo por rangos de vigencia** — variante de B/C sin guardar snapshot en cada log: se calcula en tiempo de consulta cuál era la configuración vigente en la fecha evaluada.

### Comparación

| Alternativa | Exactitud histórica | Días con/sin registro | Complejidad | Rendimiento | Integridad / riesgo de manipulación | Recomendación MVP |
|---|---|---|---|---|---|---|
| A. Snapshot en `habit_logs` | Correcta para días con registro | No cubre días **sin** registro (por ejemplo, `not_applicable` sin snapshot) | Baja | Alto (lectura directa, sin joins) | **Requiere que el snapshot se genere del lado del servidor** (RPC/trigger/función controlada) — nunca aceptar un valor de snapshot enviado directamente por el cliente, o un cliente podría enviar `value = 5` junto con `target_value_snapshot = 1` y simular un cumplimiento de 500 % | **Sí** |
| B. `habit_goal_versions` dedicada | Correcta, incluyendo días sin registro | Cubierto | Media-alta | Medio (requiere resolver rango vigente por fecha) | Igual — la versión activa la crea el servidor a partir de una edición autenticada, nunca el cliente definiendo directamente qué "era" la meta pasada | Fase posterior |
| C. Versionado general unificado (`habit_versions`) | Correcta, mismo nivel que B | Cubierto | Alta (mezcla dos dominios de configuración distintos en una tabla) | Similar a B | Mismo requisito de integridad que B | No recomendada — mezclar frecuencia y meta en una sola tabla dificulta razonar sobre cada cambio por separado |
| D. Cálculo por rango, sin snapshot almacenado | Correcta | Cubierto | Media-alta (misma tabla que B, forma de consumo distinta) | Menor que A (cálculo en cada consulta) | Igual que B | Fase posterior, equivalente a B en esfuerzo |

### Recomendación técnica

**A para el MVP** (snapshot en `habit_logs`), con el requisito de integridad no negociable de que el snapshot se genere del lado del servidor. **B para la arquitectura objetivo**, cuando se necesite cubrir también los días sin registro y ofrecer trazabilidad completa de cambios de meta. **Se descarta C** — unificar frecuencia y meta en una sola tabla de versiones mezcla dos conceptos que cambian de forma independiente y complica la validación de coherencia condicional de cada uno (H-11 para frecuencia, H-12 para meta).

### Decisión propuesta

*Para el MVP, cuando se implemente el cálculo de estadísticas reales, se usará la estrategia A: columnas de snapshot en `habit_logs`, generadas exclusivamente por una función controlada del lado del servidor (nunca aceptadas como entrada directa del cliente). Se pospone la migración a B (`habit_goal_versions`) hasta que exista necesidad real de cubrir días sin registro o de mostrar un historial explícito de cambios de meta al usuario.*

### Campos a preservar históricamente

`goal_type`, `target_value`, `target_unit`, `deadline_time`; y `minimum_target`/`ideal_target` únicamente si D-07 resuelve conservarlos en el esquema.

### Estado

**Pendiente de aprobación del producto** — condicionado a que se confirme cuándo se planea implementar Estadísticas/Historial sobre datos reales (ver pregunta P-04); técnicamente la recomendación A es clara, pero implementarla antes de tener esa necesidad real sería trabajo prematuro.

### Consecuencias

- Tabla `habit_logs`: nuevas columnas de snapshot (nullable, ya que los registros existentes previos a esta decisión no las tendrían).
- Requiere una función/RPC de escritura de `habit_logs` que resuelva y copie la configuración vigente del hábito en el momento de la inserción — el cliente deja de poder escribir esos snapshots directamente.
- Estadísticas/Historial deben migrar de leer `habits.target_value` a leer `habit_logs.target_value_snapshot` para cálculos históricos.

### Criterios de aceptación

- Cambiar `target_value` de un hábito no altera el porcentaje ya mostrado para registros anteriores al cambio.
- El cliente no puede enviar un valor de snapshot arbitrario junto con un `habit_log` — el valor lo determina el servidor.
- Un registro creado antes de esta funcionalidad, sin snapshot, se trata de forma explícita (por ejemplo, usando el `target_value` vigente como mejor aproximación, documentado como limitación conocida) en vez de fallar.

### Migraciones futuras relacionadas

Agregar columnas de snapshot a `habit_logs`; crear la función/RPC de escritura controlada que las genere; ajustar RLS de `habit_logs` para que las columnas de snapshot no sean escribibles directamente por el cliente en `INSERT`/`UPDATE`.

---

## D-05 — Fuente de progreso de `goals`

### Problema

`goals.current_value` se actualiza sin que exista un mecanismo que lo mantenga sincronizado con `habit_logs`, y sin distinguir si una meta obtiene su progreso automáticamente de un hábito, de un cálculo agregado, o de una actualización manual del usuario.

### Evidencia

`09_DATABASE_AUDIT.md` — H-03, D-05, sección 16.

### Tipos de progreso

1. **`habit_logs`** — meta vinculada a un hábito (`goals.habit_id` no nulo); el progreso se deriva matemáticamente de los `habit_logs` de ese hábito dentro del rango de la meta.
2. **`calculated`** — meta calculada por una fórmula agregada sobre múltiples hábitos (por ejemplo, la meta general de "80 % de cumplimiento mensual").
3. **`manual`** — el usuario actualiza el progreso directamente, sin una fuente automática que lo derive.

### ¿Debe existir `progress_source`?

Sí — sin un campo explícito (`progress_source: 'habit_logs' | 'calculated' | 'manual'`), no hay forma programática de saber si una meta específica debería recalcularse automáticamente o respetar la edición manual del usuario.

### `current_value`: ¿almacenarse, calcularse, o mantenerse por trigger/RPC/servicio?

| Opción | Aplicable a | Ventajas | Desventajas |
|---|---|---|---|
| A. Almacenarse (sin mecanismo de actualización automática) | `manual` | Simple; el usuario tiene control total | No aplica a metas que deberían derivarse automáticamente |
| B. Calcularse al vuelo (vista/consulta, no almacenado) | `calculated` | Siempre consistente por definición — no puede desincronizarse porque no se guarda | Costo de cómputo en cada lectura; aceptable dado que ya son agregados sobre pocos hábitos |
| C. Mantenerse por trigger | `habit_logs` | Garantía a nivel de base de datos, sin importar qué cliente escriba el `habit_log` | Requiere trigger en `habit_logs` que localice y actualice la(s) meta(s) afectada(s) |
| D. Mantenerse por RPC | `habit_logs` (alternativa a C) | Centraliza la lógica en un punto explícito | No protege si el cliente escribe `habit_logs` por una vía que no pase por esa RPC |
| E. Mantenerse por servicio (frontend) | No recomendado para ningún tipo | Igual que en D-06: `src/services` no es una frontera de seguridad; un cliente podría evitarlo | — |

### Fuente de verdad recomendada por tipo

- **`habit_logs`** → Opción **C** (trigger en PostgreSQL): garantiza consistencia sin depender de qué cliente escriba.
- **`calculated`** → Opción **B** (cálculo al vuelo): no se almacena `current_value`, se resuelve en la consulta.
- **`manual`** → Opción **A** (almacenado, editable directamente por el usuario, sin recalcularse).

### ¿Qué ocurre al editar un `habit_log` antiguo?

Para metas con `progress_source = 'habit_logs'`, el mismo trigger que mantiene `current_value` debe dispararse también en `UPDATE`/`DELETE` de `habit_logs`, no solo en `INSERT` — de lo contrario, una edición retroactiva (dentro de la ventana de 7 días de D-06) dejaría el progreso desincronizado exactamente en el escenario que motivó este hallazgo.

### Reglas para impedir que el cliente modifique `current_value` indebidamente

Para metas con `progress_source = 'habit_logs'` o `'calculated'`, la columna `current_value` no debe ser editable directamente por el cliente vía `UPDATE` — debe protegerse a nivel de política RLS (excluyendo esa columna de lo que el `WITH CHECK` permite modificar directamente) o mediante un trigger que descarte/sobrescriba cualquier valor propuesto por el cliente con el valor recalculado. Solo las metas `manual` deberían aceptar una escritura directa de `current_value` desde el cliente.

### Recomendación técnica

Agregar `progress_source` y aplicar la combinación C (trigger) / B (cálculo al vuelo) / A (almacenado manual) según el tipo, descrita arriba.

### Decisión propuesta

*Se agrega `progress_source` a `goals`. Las metas vinculadas a un hábito mantienen su `current_value` mediante un trigger en `habit_logs` (`INSERT`/`UPDATE`/`DELETE`). Las metas calculadas no almacenan `current_value` — se resuelve en consulta. Las metas manuales permiten edición directa del cliente. El cliente nunca puede escribir `current_value` directamente para metas de tipo `habit_logs` o `calculated`.*

### Estado

**Pendiente de aprobación del producto** — la mecánica técnica está resuelta; falta confirmar si el producto realmente necesita metas de tipo `calculated` fuera de la meta general ya existente en los mocks (ver pregunta P-05).

### Consecuencias

- Tabla `goals`: nueva columna `progress_source`.
- Nuevo trigger sobre `habit_logs` que actualiza `goals.current_value` cuando corresponda.
- Políticas RLS de `goals` deben restringir la escritura directa de `current_value` según `progress_source`.
- Página Metas / `GoalGeneralHero` / `GoalListRow`: sin cambios visuales necesarios, pero la fuente del dato cambia de "editado manualmente en el mock" a "derivado por el backend".

### Criterios de aceptación

- Registrar un `habit_log` dentro del rango de una meta vinculada actualiza automáticamente `current_value` de esa meta.
- Editar retroactivamente un `habit_log` (dentro de la ventana permitida) recalcula correctamente el progreso de cualquier meta afectada.
- Un intento del cliente de escribir `current_value` directamente en una meta `habit_logs`/`calculated` es rechazado o ignorado.

### Migraciones futuras relacionadas

Agregar `progress_source` a `goals`; crear el trigger de sincronización sobre `habit_logs`; ajustar las políticas RLS de `goals` para restringir la escritura de `current_value` según `progress_source`.

---

## D-06 — Ventana de edición de siete días

### Problema

No existe ninguna garantía a nivel de base de datos que impida editar o eliminar registros de `habit_logs` con más de 7 días de antigüedad, y cualquier implementación debe considerar la zona horaria del usuario (`profiles.timezone`), no la del servidor.

### Evidencia

`09_DATABASE_AUDIT.md` — H-05, H-25, D-06, sección 15. `01_PRODUCT_CONTEXT.md`: *"Solo pueden editarse registros de los últimos siete días. Los registros anteriores son únicamente de consulta."*

### Definición exacta propuesta de la ventana

*Hoy y los seis días naturales anteriores son editables (7 días en total, ambos extremos incluidos). Cualquier fecha anterior a esos 7 días queda bloqueada para edición o eliminación. Las fechas futuras (posteriores a "hoy" en la zona horaria del usuario) no se permiten en ningún caso, ni para creación ni para edición.*

### Resolución por operación

| Operación | Regla propuesta |
|---|---|
| **INSERT** retroactivo (crear un registro para una fecha pasada sin registro previo) | Permitido dentro de la ventana de 7 días; bloqueado fuera de ella |
| **UPDATE** | Permitido dentro de la ventana de 7 días; bloqueado fuera de ella (regla de negocio explícita) |
| **DELETE** | Mismo tratamiento que `UPDATE` — permitido dentro de la ventana, bloqueado fuera |
| **Séptimo día** | Inclusivo — "hoy" cuenta como día 1, hasta "hoy − 6" cuenta como día 7; ambos editables |
| **Fechas futuras** | Nunca permitidas, en ninguna operación |
| **`not_applicable`** | Sujeto a la misma ventana que cualquier otro estado — no hay razón documentada para tratarlo distinto |
| **`service_role`** | Puede saltarse la restricción (bypasea RLS por diseño de Supabase) — aceptable únicamente para tareas administrativas server-side, nunca expuesto al frontend |
| **Excepciones administrativas** | No se definen excepciones adicionales para usuarios regulares; cualquier corrección fuera de ventana requeriría una operación explícita vía `service_role`, fuera del flujo normal de la aplicación |

### Alternativas de implementación

- **A. Política RLS** (`WITH CHECK` con lógica de fecha).
- **B. Trigger** (`BEFORE INSERT/UPDATE/DELETE` en `habit_logs`).
- **C. Función RPC dedicada.**
- **D. Validación solo en frontend/`src/services`.**
- **E. Combinación de base de datos y frontend/servicios.**

### Comparación

| Alternativa | Ventajas | Desventajas | Complejidad | Riesgo |
|---|---|---|---|---|
| A. RLS | Se aplica a cualquier cliente que use la API | Acceder a `profiles.timezone` de la fila relacionada dentro de la política añade complejidad | Media | Bajo si se implementa bien |
| B. Trigger | Se aplica sin importar la vía de escritura; maneja bien el `JOIN` a `habits`/`profiles` para obtener la zona horaria | Lógica de fecha más compleja de mantener que una política simple | Media | Bajo — la más difícil de evadir |
| C. RPC dedicada | Centraliza la lógica en un lugar legible | No protege si el cliente sigue teniendo acceso de escritura directo a la tabla vía REST | Media | Medio si no se combina con revocar el acceso directo |
| D. Solo frontend/`src/services` | Rápida de implementar; buen mensaje de error inmediato | **No es una frontera de seguridad** — `src/services` corre en el navegador; un usuario puede llamar directamente a la API de Supabase y evitarla por completo | Baja | **Alto si se usa como única garantía — no aceptable por sí sola** |
| E. Combinación | Mejor experiencia de usuario (mensaje inmediato) + garantía real e ineludible | Dos lugares que deben mantenerse coherentes | Media-alta | Bajo |

### Recomendación técnica

**E**, con **B (trigger)** como el mecanismo de base de datos dentro de esa combinación — es el que mejor resuelve el `JOIN` necesario a `profiles.timezone`. La validación en `src/services` se mantiene únicamente como mejora de experiencia de usuario (mensaje de error inmediato sin esperar el rechazo del servidor), **nunca como la única garantía**.

### Decisión propuesta

*Se implementa un trigger `BEFORE INSERT/UPDATE/DELETE` en `habit_logs` que calcula "hoy" usando `profiles.timezone` del dueño del hábito y rechaza cualquier operación fuera de la ventana de 7 días (definición: hoy y los 6 días naturales anteriores, ambos extremos inclusive) o sobre fechas futuras. `src/services` implementa la misma validación de forma anticipada, únicamente para dar retroalimentación inmediata al usuario — sin que eso sustituya la garantía del trigger. `service_role` permanece exento, reservado para uso administrativo server-side.*

### Estado

**Pendiente de aprobación** (la definición exacta de la ventana propuesta arriba necesita confirmación explícita del producto — ver pregunta P-06 sobre el límite inclusivo/exclusivo, que hasta ahora no estaba definido en ningún documento).

### Consecuencias

- Nuevo trigger sobre `habit_logs`.
- `src/services` (o su futuro equivalente) implementa la misma regla como validación anticipada.
- Checklist diario, Historial y cualquier flujo de edición retroactiva deben mostrar mensajes coherentes con esta regla (el candado/tooltip ya previsto en `04_SCREEN_SPECIFICATIONS.md` para Historial).

### Criterios de aceptación

- Editar un registro de hoy o de cualquiera de los 6 días anteriores tiene éxito.
- Editar un registro de hace 8 días o más es rechazado, tanto por el trigger como por la validación anticipada de servicios.
- Insertar un registro con fecha futura es rechazado en cualquier caso.
- Un registro `not_applicable` sigue exactamente las mismas reglas que cualquier otro estado.
- Una operación ejecutada con `service_role` no se ve afectada por esta restricción.

### Migraciones futuras relacionadas

Creación del trigger y su función asociada sobre `habit_logs`, con acceso a `profiles.timezone` vía `habits.user_id` → `profiles.id`.

---

## D-07 — `preferred_time`, `minimum_target` e `ideal_target`

### Contexto general

Ninguno de los tres campos aparece en los documentos actuales de `MDs/` (confirmado por búsqueda de texto durante la auditoría), pero según lo indicado en la Revisión 3/4 de `09_DATABASE_AUDIT.md`, sí aparecieron durante la definición funcional previa del producto sin quedar incorporados a los documentos MD vigentes. Se evalúa cada campo por separado.

### `preferred_time`

- **Diferencia frente a `deadline_time`:** `deadline_time` es un límite (el tipo de meta "Hora límite" ya documentado en `01_PRODUCT_CONTEXT.md`); `preferred_time` sería una **hora sugerida o preferida**, sin implicar que el hábito falle si no se hace exactamente a esa hora.
- **Utilidad en Checklist:** permitiría ordenar la lista de hábitos del día por hora sugerida, en vez de un orden arbitrario o alfabético.
- **Recordatorios:** podría usarse como valor por defecto de un futuro `reminder_time` por hábito (hoy inexistente, ver `09_DATABASE_AUDIT.md` sección 19 — los recordatorios actuales son un toggle general en `profiles`, no por hábito).
- **Orden del día:** relacionado con el campo `sort_order` también identificado como ausente en la auditoría — ambos resolverían necesidades de ordenamiento distintas (uno por horario sugerido, otro por preferencia manual explícita del usuario).
- **Clasificación:** el valor de este campo depende enteramente de si el producto planea recordatorios por hábito y/o un Checklist ordenado por horario — ninguno de los dos está confirmado en los documentos actuales.

### `minimum_target`

- **Utilidad para estado parcial:** hoy, un registro se marca `partial` sin que exista un umbral numérico definido en el esquema — la decisión de qué cuenta como "parcial" queda completamente en manos del frontend/usuario. `minimum_target` formalizaría ese umbral (por ejemplo, "mínimo aceptable: 6 vasos" contra una meta de 8).
- **Relación con `allow_partial`:** `habits.allow_partial` ya existe como booleano ("¿este hábito permite completarse parcialmente?"), pero no define **cuánto** cuenta como parcial. `minimum_target` sería el complemento numérico de ese booleano.
- **Tipos de hábito donde aplica:** solo tiene sentido para `goal_type` de `quantity`, `duration` o `repetitions` — no para `boolean` (no hay parcialidad en un sí/no) ni para `deadline` (llegar a tiempo o no).

### `ideal_target`

- **Relación con `target_value` actual:** `target_value` continuará siendo el objetivo principal del MVP — sigue siendo el número contra el cual se calcula el porcentaje mostrado hoy.
- **Cumplimiento superior a 100 %:** la regla de negocio ya vigente ("los porcentajes pueden superar el 100 %") ya cubre el caso simple de superar la meta con el esquema actual. `ideal_target` se reserva para una evolución **futura** del sistema — por ejemplo, distinguir entre "cumplió la meta" (`target_value`) y "alcanzó un nivel aspiracional superior" (`ideal_target`) de forma explícita, con métricas y análisis avanzados propios de esa distinción (no solo un porcentaje sin tope).
- **Conclusión (actualizada):** `ideal_target` **no se elimina** del alcance del producto. Se aprueba como concepto para fases futuras, sin implementarse ahora — no se agrega ninguna columna en el MVP.

### Aclaraciones solicitadas

- **¿`target_value` actual equivale a `ideal_target`?** No se equiparan: `target_value` sigue siendo el objetivo principal del MVP; `ideal_target` queda reservado como un concepto adicional para una evolución futura (objetivos aspiracionales, análisis avanzados), no como un reemplazo ni un sinónimo del `target_value` actual.
- **¿`minimum_target` sería opcional?** Sí — solo aplicable a los tipos de meta numéricos, y solo si `allow_partial` está activo.
- **¿`preferred_time` debe persistirse en `habits`?** Si se aprueba mantenerlo, sí — es una propiedad del hábito, no de cada registro diario.

### Clasificación propuesta

| Campo | Clasificación | Razonamiento |
|---|---|---|
| `preferred_time` | **Pospuesto** | Depende de funcionalidades no confirmadas (recordatorios por hábito, orden del Checklist por horario) |
| `minimum_target` | **Pospuesto** | Requiere que el producto confirme si quiere formalizar el umbral de "parcial" más allá del booleano `allow_partial` actual |
| `ideal_target` | **Aprobado para fases futuras** | Reservado para una evolución del sistema (métricas superiores al 100 %, objetivos aspiracionales, análisis avanzados); no se implementa en el MVP |

### Decisión propuesta

*Se pospone `preferred_time` y `minimum_target` a una fase posterior, sujeta a que el producto confirme las funcionalidades de las que dependen (recordatorios por hábito, umbral formal de cumplimiento parcial). `target_value` continúa siendo el objetivo principal del MVP. `ideal_target` queda aprobado conceptualmente para una futura evolución del sistema, pero no se implementa ahora.*

### Estado

**Aprobada** (con `preferred_time` y `minimum_target` pospuestos, e `ideal_target` aprobado para fases futuras sin implementación inmediata) — ver "Decisiones aprobadas" al final del documento.

### Consecuencias

Ninguna en el esquema actual — ninguno de los tres campos se implementa en el MVP. Si se aprueba `preferred_time` en una fase posterior: nueva columna `time` nullable en `habits`. Si se aprueba `minimum_target`: nueva columna `numeric` nullable en `habits`, con la misma necesidad de conservación histórica que `target_value` (ver D-04). Cuando se desarrolle la fase futura de `ideal_target`, deberá revisarse también D-04 (conservación histórica) y el diseño de las métricas/análisis avanzados que lo consuman.

### Criterios de aceptación

No aplica mientras `preferred_time`/`minimum_target` sigan pospuestos y `ideal_target` no se haya implementado — se definirán al desarrollar cada campo individualmente.

### Migraciones futuras relacionadas

Ninguna por ahora. Cuando se implementen: agregar `preferred_time`/`minimum_target` a `habits`, extender el requisito de snapshot histórico de D-04 para incluir `minimum_target_snapshot` si aplica; diseñar la migración de `ideal_target` (columna y snapshot histórico asociado) como parte de esa evolución futura, no antes.

---

## Matriz final de decisiones

| ID | Decisión | Recomendación técnica | Estado | Bloquea migraciones | Bloquea frontend | Prioridad |
|---|---|---|---|---|---|---|
| D-01 | Borrado lógico de `categories` | Estado de dos valores (`active`/`deleted`); borrado lógico con restauración | Aprobada | No | No | Media |
| D-02 | Ciclo de vida de `goals` | Columna `goal_lifecycle_status` separada de `goal_status` | Pendiente de aprobación del producto | No | No | Media |
| D-03 | Historial de frecuencias (`habit_schedules`) | Implementar `habit_schedules` desde la primera migración, como fuente única | Aprobada | Sí — forma parte de la primera migración | No de inmediato | Alta |
| D-04 | Historial de metas | Snapshot en `habit_logs`, generado server-side | Pendiente de aprobación del producto | Sí, antes de Estadísticas reales | No de inmediato | Alta |
| D-05 | Fuente de progreso de `goals` | `progress_source` + trigger/cálculo/manual según tipo | Pendiente de aprobación del producto | Sí, antes de conectar Metas a datos reales | Sí (Metas) | Alta |
| D-06 | Ventana de edición de 7 días | Trigger en PostgreSQL + validación anticipada en `src/services` | Pendiente de aprobación | Sí, antes de exponer edición real de `habit_logs` | Sí (Checklist/Historial) | Alta |
| D-07 | `preferred_time` / `minimum_target` / `ideal_target` | Posponer los dos primeros; `ideal_target` aprobado para fases futuras (sin implementar ahora) | Aprobada | No | No | Baja |

---

## Orden de implementación propuesto

Una vez aprobadas las decisiones correspondientes, el orden lógico recomendado es:

1. **Versionar el esquema remoto** — crear `supabase/migrations/` y capturar en migraciones versionadas lo ya aplicado (`init_schema`, `harden_functions`), resolviendo H-04 antes de agregar nada nuevo.
2. **Integridad y RLS** — aplicar las correcciones ya no dependientes de decisión (H-01, H-02, H-06 a H-16) del plan de corrección de `09_DATABASE_AUDIT.md` §20.
3. **Ciclos de vida** — D-01 y D-02, una vez aprobados.
4. **Historial de frecuencia** — D-03, `habit_schedules` se crea desde la primera migración (paso 1), aprovechando que la base de datos aún está vacía.
5. **Historial de metas** — D-04, en paralelo o inmediatamente después de D-03.
6. **Progreso de `goals`** — D-05, dependiente de que D-04 esté resuelto (los snapshots afectan qué datos usa el trigger de sincronización).
7. **Ventana de siete días** — D-06.
8. **Preferencias / campos opcionales** — D-07, la de menor prioridad y menor bloqueo.
9. **Pruebas con dos usuarios** — ejecutar los 21 casos de `09_DATABASE_AUDIT.md` §18 antes de considerar cualquier fase lista para producción.
10. **Conexión progresiva del frontend** — reemplazar los mocks de `src/data` por la capa `services/` prevista en `02_FRONTEND_ARCHITECTURE.md`, empezando por autenticación (de la que dependen todas las políticas RLS vía `auth.uid()`).

---

## Preguntas para el responsable del producto

### P-01 — ¿Categorías necesitan papelera igual que hábitos?

- **Decisión relacionada:** D-01.
- **Contexto:** Ningún documento del producto especifica una papelera de categorías. Los hábitos sí la tienen, documentada explícitamente.
- **Opciones:** (a) Sí, replicar el patrón completo de `habits`. (b) No, basta con confirmar antes de borrar si está en uso.
- **Recomendación de Claude:** (b) — evita construir una funcionalidad no solicitada; se puede añadir después si se necesita.
- **Impacto de no decidirla:** Se implementaría el comportamiento más simple (b) por defecto, que sería más costoso de deshacer si luego se decide que sí se quería papelera completa.

### P-02 — ¿"Pausar" una meta es una funcionalidad real planeada?

- **Decisión relacionada:** D-02.
- **Contexto:** `04_SCREEN_SPECIFICATIONS.md` menciona "pausar" como acción de Metas una sola vez, sin desarrollarse en las reglas de negocio de `01_PRODUCT_CONTEXT.md`.
- **Opciones:** (a) Sí, implementar `goal_lifecycle_status` con `paused`. (b) No, era un elemento de la maqueta sin intención real; quitar "pausar" de la especificación de pantalla.
- **Recomendación de Claude:** (a), dado que aparece explícitamente en la documentación de pantallas y no hay motivo para asumir que es un error.
- **Impacto de no decidirla:** La acción "pausar" seguiría sin tener ningún efecto persistente si se conecta el frontend real, contradiciendo lo documentado en `04_SCREEN_SPECIFICATIONS.md`.

### P-03 — ¿El roadmap de producto planea estadísticas basadas en "días programados" a corto plazo?

- **Decisión relacionada:** D-03.
- **Contexto:** El riesgo de `habit_schedules` solo se materializa cuando se implemente ese tipo de estadística; hoy las estadísticas usan `habit_logs` reales, que no lo necesitan.
- **Opciones:** (a) Sí, está en el roadmap cercano — priorizar `habit_schedules` ahora. (b) No es prioridad — postergar indefinidamente.
- **Recomendación de Claude:** Sin evidencia en `06_IMPLEMENTATION_ROADMAP.md` de una fase específica para esto — no se puede recomendar un orden sin esa confirmación.
- **Impacto de no decidirla:** Cualquier estadística de "cumplimiento vs. programado" que se construya sin resolver esto primero produciría resultados incorrectos para hábitos con frecuencia cambiada, silenciosamente.

### P-04 — ¿Cuándo se planea implementar Estadísticas/Historial sobre datos reales (no mock)?

- **Decisión relacionada:** D-04.
- **Contexto:** La estrategia de snapshot (A) solo tiene sentido implementarla cuando ya exista esa necesidad real; construirla antes sería trabajo especulativo.
- **Opciones:** (a) Es la siguiente fase inmediata tras conectar Supabase. (b) Es una fase posterior, después de otras prioridades.
- **Recomendación de Claude:** No se puede recomendar sin esta confirmación — la técnica (A) ya está decidida, falta el "cuándo".
- **Impacto de no decidirla:** Se corre el riesgo de implementar Estadísticas conectadas a datos reales sin la protección de snapshot, reproduciendo el error descrito en el escenario de D-04 en cuanto el primer usuario real cambie una meta.

### P-05 — ¿Existen o se planean metas de tipo `calculated` más allá de la meta general ya mockeada?

- **Decisión relacionada:** D-05.
- **Contexto:** Los datos mock actuales (`mockGoals.ts`) solo incluyen una meta general de este tipo; no hay evidencia de que se planeen más metas agregadas de varios hábitos.
- **Opciones:** (a) Sí, habrá más metas calculadas — vale la pena diseñar bien ese caso desde ahora. (b) No, es un caso único — simplificar tratándola como un caso especial en vez de un tipo general.
- **Recomendación de Claude:** Diseñar el caso general (a) de todas formas, ya que el costo adicional es bajo y evita un rediseño si aparece una segunda meta calculada más adelante.
- **Impacto de no decidirla:** Ninguno inmediato — la recomendación (a) se puede aplicar igual sin bloquear el resto de D-05.

### P-06 — ¿La ventana de 7 días es "hoy + 6 días anteriores" (8 días o menos)?

- **Decisión relacionada:** D-06.
- **Contexto:** Ningún documento del producto define si el límite es inclusivo o exclusivo en el séptimo día.
- **Opciones:** (a) Confirmar la definición propuesta en este documento ("hoy y los 6 días naturales anteriores", 7 días en total). (b) Una definición distinta (por ejemplo, hoy + 7 días anteriores = 8 días en total).
- **Recomendación de Claude:** (a), por ser la lectura más literal de "los últimos siete días" tal como está escrito en `01_PRODUCT_CONTEXT.md`.
- **Impacto de no decidirla:** El trigger/RPC de D-06 no puede implementarse con precisión hasta confirmar el límite exacto — un día de diferencia en el límite cambia el comportamiento observable para el usuario.

### P-07 — ¿Siguen siendo necesarios `preferred_time`, `minimum_target` e `ideal_target`?

- **Decisión relacionada:** D-07.
- **Contexto:** Estos campos existieron en alguna definición funcional previa no reflejada en los documentos MD actuales; no hay forma de confirmar su vigencia solo con la documentación disponible.
- **Opciones:** (a) Siguen vigentes — actualizar `01_PRODUCT_CONTEXT.md` y `05_DATA_MODELS_AND_MOCKS.md` para incorporarlos formalmente. (b) Ya no aplican — confirmar que se pueden descartar sin más.
- **Recomendación de Claude:** No se puede recomendar (a) o (b) sin esta confirmación — es la pregunta con menos evidencia documental de las siete.
- **Impacto de no decidirla:** Permanecen en un limbo de "ni implementados ni formalmente descartados", lo que podría generar confusión si aparecen mencionados de nuevo en el futuro sin contexto de por qué no se implementaron.

---

# Decisiones aprobadas

Resumen de las decisiones aceptadas como Product Owner. Donde este resumen difiere del campo "Estado" registrado en el cuerpo de cada decisión (D-02, D-04, D-05, D-06 seguían "Pendiente de aprobación del producto" en su sección individual), **este resumen es el que queda vigente** — las secciones individuales de esas cuatro decisiones no fueron reescritas en este ajuste puntual y deberán actualizarse la próxima vez que se edite este documento, para que su campo "Estado" quede consistente con lo aprobado aquí.

**D-01**
Aprobada.
Categories usarán borrado lógico simple (`active`/`deleted`).

**D-02**
Aprobada.
`goal_status` permanecerá separado de `goal_lifecycle_status`.

**D-03**
Aprobada.
`habit_schedules` será implementado desde la primera migración.

**D-04**
Aprobada.
Se utilizarán snapshots en `habit_logs` generados por el servidor.

**D-05**
Aprobada.
`progress_source` será implementado.

**D-06**
Aprobada.
La ventana de edición será de 7 días con garantía obligatoria en PostgreSQL.

**D-07**
Aprobada.
`preferred_time` y `minimum_target` quedan pospuestos.
`ideal_target` permanece aprobado para fases futuras.
