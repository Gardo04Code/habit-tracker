# Development --- Database

## Motor y tablas

Supabase Local/PostgreSQL. Tablas: profiles, categories, habits,
habit_categories, habit_schedules, habit_logs, goals.

## Principios

RLS, aislamiento por usuario, migraciones reproducibles,
triggers/constraints, schedules versionados, snapshots históricos y Goal
Progress automático en DB.

## Baseline

15 migraciones después de BUG-002. Migración reciente:
`20260806162035_goal_progress_concurrency.sql`.

## BUG-002 cerrado

Causa: creación de goal y escritura concurrente de habit_log podían usar
snapshots MVCC divergentes. Solución: lock por fila `habits(habit_id)`
antes de recalcular; cambio de habit_id bloquea ambos UUID en orden
determinista. Retest: 170/170; 0 discrepancias; 0 deadlocks; 0 timeouts.

## Restricciones

No editar migraciones históricas. No db push. No remoto sin
autorización. No service_role en frontend.
