# Discovery --- Contexto

## Objetivo

Definición funcional del Habit Tracker: alcance, reglas, UX funcional y
arquitectura conceptual.

## Navegación aprobada

Dashboard, Checklist diario, Mis hábitos, Historial, Estadísticas, Metas
y Configuración.

## Estados de registro

Pendiente, Completado, Parcial, No realizado, No aplicable.

## Tipos de hábito

Sí/No, Cantidad, Duración, Repeticiones, Hora límite y Días acumulados.

## Principios

-   Un registro por hábito+fecha.
-   La periodicidad cambia mediante historial versionado.
-   La configuración histórica no debe reinterpretarse con la
    configuración actual.
-   Lifecycle conserva datos históricos.
-   Ventana de edición de habit_logs: 7 días.
-   Racha: se perdona un fallo aislado; dos fallos consecutivos
    reinician.
-   Constancia Dashboard: criterio aprobado ≥80% de hábitos del día.
-   Metas pueden ser manuales o derivadas de habit_logs.

## Alcance

Versión personal con arquitectura preparada para aislamiento
multiusuario mediante RLS.

## Fuera de alcance actual

IA externa real y deployment productivo terminado.
