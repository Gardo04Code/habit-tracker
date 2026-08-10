# Development --- Local Environment / Docker

## Entorno

Windows/PowerShell + Supabase CLI vía npx + Docker Desktop.

## Puertos locales

API 54321, PostgreSQL 54322, Studio 54323, Mailpit 54324 en 127.0.0.1.

## Comandos

`npx supabase start` `npx supabase stop --no-backup`
`npx supabase db reset --local --no-seed` `npx supabase status`

## Tipos en PowerShell 5.1

No usar `>` para database.types.ts porque puede producir UTF-16LE. Usar:
`npx supabase gen types typescript --local | Out-File -Encoding utf8 -FilePath "src\types\database.types.ts"`

## Variables

Después de QA restaurar `.env.local` a `VITE_DATA_SOURCE=mock`. Solo
Publishable Key en frontend; nunca Secret/service_role.

## Diagnóstico

Ante errores de Supabase Local, comprobar Docker Desktop antes de
atribuirlos al código.
