# Habit Tracker --- Mapa de contextos para sesiones separadas

## Objetivo

Dividir el contexto del proyecto en unidades pequeñas para sesiones
independientes de Claude/Cloud, evitando cargar toda la historia en cada
conversación.

## Cómo usarlo

En cada sesión nueva carga solamente: 1.
`00_GLOBAL/01_PROJECT_CONTEXT.md`. 2. El `*_CONTEXT.md` de la
especialidad. 3. El MD técnico puntual del repositorio que necesites
para esa tarea.

No cargues Discovery + Frontend + Backend + Database + QA a la vez salvo
en una tarea de integración.

## Estructura

-   `01_DISCOVERY`: producto, alcance, reglas y arquitectura conceptual.
-   `02_DEVELOPMENT/01_FRONTEND`: React/TypeScript/UI/hooks.
-   `02_DEVELOPMENT/02_BACKEND`: Supabase Auth, services y acceso a
    datos.
-   `02_DEVELOPMENT/03_DATABASE`: PostgreSQL, migraciones, RLS, triggers
    y concurrencia.
-   `02_DEVELOPMENT/04_LOCAL_ENV_DOCKER`: Docker, Supabase Local, CLI y
    variables.
-   `02_DEVELOPMENT/05_TESTING_QA`: E2E, seguridad, regresión, bugs y
    retests.
-   `03_DEPLOYMENT`: reservado para la fase final.

Los TXT son prompts cortos de arranque de sesión.
