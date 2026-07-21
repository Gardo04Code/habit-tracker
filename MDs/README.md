# Habit Tracker — Documentación para desarrollo Front-End

## Propósito

Esta carpeta contiene la documentación funcional, visual y técnica que Claude debe leer antes de modificar el proyecto Habit Tracker.

La documentación funciona como fuente de verdad durante la construcción de la primera versión sólida del Front-End.

## Ruta esperada

```text
D:\Documentos\Proyecto Web\Habitos\MDs
```

## Orden obligatorio de lectura

1. `CLAUDE.md`
2. `README.md`
3. `01_PRODUCT_CONTEXT.md`
4. `02_FRONTEND_ARCHITECTURE.md`
5. `03_DESIGN_SYSTEM.md`
6. `04_SCREEN_SPECIFICATIONS.md`
7. `05_DATA_MODELS_AND_MOCKS.md`
8. `06_IMPLEMENTATION_ROADMAP.md`
9. `07_ACCEPTANCE_CRITERIA.md`
10. `08_FIRST_EXECUTION_PROMPT.md`

## Objetivo de esta fase

Construir una primera versión Front-End:

- sólida;
- profesional;
- navegable;
- responsiva;
- modular;
- preparada para conectar Supabase posteriormente.

En esta etapa se utilizarán datos mock tipados. No se debe conectar todavía PostgreSQL, Supabase ni autenticación real.

## Stack aprobado

- React
- TypeScript
- Vite
- Tailwind CSS 4
- React Router
- Lucide React
- Recharts
- ESLint
- Git y GitHub

## Principios principales

- No concentrar toda la aplicación en `App.tsx`.
- No usar `any`.
- No usar `localStorage` en esta fase.
- No conectar backend todavía.
- Separar páginas, componentes, tipos, datos mock y utilidades.
- Mantener textos visibles en español.
- Mantener nombres técnicos y archivos en inglés.
- Construir componentes reutilizables.
- Validar `npm run lint` y `npm run build`.
- No modificar ni eliminar el historial Git.

## Alcance visual

La primera versión debe incluir:

- Dashboard.
- Checklist diario.
- Mis hábitos.
- Historial.
- Estadísticas.
- Metas.
- Configuración.
- Sidebar de escritorio.
- Navegación inferior móvil.
- Header.
- Gráficas.
- Modales.
- Estados vacíos.
- Interacciones mock.
- Responsive design.

## Criterio general

El resultado debe parecer un producto real y no una plantilla genérica de Vite.
