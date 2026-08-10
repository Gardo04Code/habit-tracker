# Contexto global --- Habit Tracker

## Producto

Aplicación web personal para crear hábitos, completar checklist diario,
consultar historial, analizar estadísticas, gestionar metas y visualizar
un dashboard.

## Stack

React 19, TypeScript, Vite, Tailwind CSS, Supabase, PostgreSQL, Supabase
Auth, Docker/Supabase Local y Git/GitHub.

## Modos

-   `VITE_DATA_SOURCE=mock`
-   `VITE_DATA_SOURCE=supabase`

Los mocks se conservan hasta el cierre.

## Módulos

Dashboard, Checklist diario, Mis hábitos, Historial, Estadísticas,
Metas, Configuración, Auth y Categorías.

## Arquitectura

React UI → hooks → services → cliente Supabase → PostgreSQL/Supabase. La
integridad crítica se protege también en DB mediante RLS, constraints,
triggers y RPC.

## Estado

Discovery y la mayor parte de Development están completados. El proyecto
está en Paso 6 de 7: QA/retest/corrección controlada. Deployment aún no
se ha ejecutado.

## Reglas de trabajo

-   No `db push` durante QA local.
-   No tocar Supabase remoto sin autorización.
-   No editar migraciones históricas; cambios DB = migración
    nueva/aditiva.
-   No eliminar mocks.
-   No `git add/commit/push` sin instrucción.
-   Nunca service_role en frontend.
