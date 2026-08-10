# Discovery --- Arquitectura y decisiones

## Capas

Presentación React → hooks → services → Supabase client → PostgreSQL →
integridad DB.

## Decisiones

-   PostgreSQL/Supabase.
-   Modo dual mock/Supabase.
-   RLS por propietario.
-   UUID.
-   `habit_schedules` para historial de periodicidad.
-   snapshots en `habit_logs`.
-   Goal Progress automático en DB.
-   Migraciones reproducibles y aditivas.

## Metodología

Discovery → Development → Deployment.

Development se divide en Frontend, Backend, Database, Local
Environment/Docker y Testing/QA.

Deployment está pendiente.
