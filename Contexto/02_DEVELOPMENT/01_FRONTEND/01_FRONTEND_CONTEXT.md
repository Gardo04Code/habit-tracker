# Development --- Frontend

## Stack

React 19 + TypeScript + Vite + Tailwind.

## Patrón

Pages → components → hooks → services.

## Hooks

useAuth, useCategories, useHabits, useDailyChecklist, useGoals,
useHistoryLogs, useStatistics, useDashboard.

## Principios

-   UI desacoplada del origen mock/Supabase cuando sea posible.
-   No duplicar integridad de DB en React.
-   Refetch completo preferido en varios CRUD por consistencia.
-   React no controla snapshots definitivos ni progreso automático.

## Bugs abiertos UI

-   BUG-001 OverflowMenu fuera del viewport --- Media/P2.
-   BUG-003 mensaje de candado Historial --- Baja/P3.
-   BUG-005 overflow Checklist 1440×900 --- Media/P2.
-   BUG-006 overflow Hábitos 320px --- Baja/P3.

## Cerrado

BUG-004 schedule histórico Checklist/Dashboard --- Fixed / Retest
Passed.
