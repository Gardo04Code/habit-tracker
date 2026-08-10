# Development --- Backend / Data Access

## Alcance

Supabase Auth, AuthContext, ProtectedRoute, services, hooks de
integración y normalización de errores.

## Servicios

auth, profiles, categories, habits, habitSchedules, habitLogs, goals.

## Reglas

-   Cliente Supabase único.
-   Payloads tipados.
-   RLS como garantía final.
-   Errores amigables.
-   Hooks orquestan; services acceden a datos.
-   Evitar N+1.
-   No service_role en cliente.

## Nota

BUG-004 añadió lectura histórica en lote de schedules para
Checklist/Dashboard. No romperla sin retest.
