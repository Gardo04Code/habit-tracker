# Discovery --- Reglas de negocio

## Hábitos

-   Evitar duplicados según normalización aprobada.
-   Validar obligatorios.
-   Notas opcionales, máximo 150 caracteres.
-   Valores superiores al objetivo se conservan; el porcentaje puede
    superar 100%.
-   Vacío = no registrado.
-   Acumulativos acumulan valor.
-   La periodicidad se versiona y no sobrescribe historia.

## Tiempo

-   Habit logs: ventana real de edición de 7 días.
-   Fechas futuras no deben producir registros válidos.

## Rachas

-   Un fallo aislado puede perdonarse.
-   Dos fallos consecutivos reinician.
-   Dashboard usa cumplimiento agregado diario ≥80%.

## Metas

-   `current_value` manual solo por vía autorizada.
-   `habit_logs` se recalcula en DB.
-   React no escribe progreso automático.
-   `progress_source` está protegido.
-   boolean/deadline/accumulated_days no soportan progreso `habit_logs`.
-   Al crear meta automática deben considerarse logs preexistentes.

## Historial

Snapshots históricos inmutables aunque cambie el hábito.
