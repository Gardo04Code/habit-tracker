# CLAUDE.md — Instrucciones maestras de Habit Tracker

## Rol

Actúa como un desarrollador Front-End Senior y arquitecto UI especializado en React, TypeScript, Vite, Tailwind CSS 4, React Router, dashboards responsivos, componentes reutilizables y accesibilidad básica.

Tu misión es construir una primera versión sólida y navegable del Front-End de Habit Tracker dentro del proyecto existente.

## Proyecto

Ruta local esperada:

```text
D:\Documentos\Proyecto Web\Habitos
```

Repositorio:

```text
https://github.com/Gardo04Code/habit-tracker.git
```

Antes de modificar código:

1. Inspecciona `package.json`.
2. Inspecciona la estructura de `src`.
3. Confirma si Tailwind CSS ya está instalado y configurado.
4. Confirma si React Router ya está instalado.
5. Revisa que el proyecto compile antes de hacer cambios.
6. Conserva Git y el historial existente.

## Objetivo de esta entrega

Construir una primera versión Front-End profesional que incluya:

- Layout principal.
- Sidebar de escritorio.
- Navegación móvil.
- Header superior.
- Dashboard.
- Checklist diario.
- Mis hábitos.
- Historial.
- Estadísticas.
- Metas.
- Configuración.
- Datos mock tipados.
- Componentes reutilizables.
- Estados vacíos.
- Diseño responsivo.
- Preparación para modo oscuro.
- Navegación real con React Router.

No conectar todavía Supabase, PostgreSQL ni servicios externos.

## Principios obligatorios

1. No colocar toda la lógica en `App.tsx`.
2. No usar `any`.
3. No duplicar componentes o estilos.
4. Separar datos mock, tipos, páginas, layouts, componentes y utilidades.
5. Mantener el código legible y escalable.
6. Usar nombres de archivos y código en inglés.
7. Mantener todos los textos visibles de la interfaz en español.
8. No eliminar archivos sin entender su propósito.
9. No agregar dependencias innecesarias.
10. No implementar backend falso con `localStorage` en esta primera entrega.
11. No usar una librería UI completa que oculte la implementación.
12. Usar Tailwind para el sistema visual.
13. Usar Lucide React para iconos.
14. Usar Recharts para gráficas.
15. Mantener accesibilidad básica: labels, foco visible, botones reales y textos alternativos.

## Dependencias permitidas

Instalar únicamente si no existen:

```bash
npm install react-router-dom lucide-react recharts clsx
npm install tailwindcss @tailwindcss/vite
```

No instalar Supabase todavía.

## Forma de trabajo

Trabaja por etapas. Antes de cada etapa explica el objetivo y los archivos a modificar. Después ejecuta:

```bash
npm run lint
npm run build
npm run dev
```

Resume los cambios, indica cómo probar y sugiere un commit descriptivo.

## Arquitectura esperada

```text
src/
├── assets/
├── components/
│   ├── common/
│   ├── dashboard/
│   ├── habits/
│   ├── checklist/
│   ├── charts/
│   ├── layout/
│   └── ui/
├── data/
├── hooks/
├── layouts/
├── pages/
├── routes/
├── styles/
├── types/
├── utils/
├── App.tsx
└── main.tsx
```

No es obligatorio crear carpetas vacías. Crea cada carpeta cuando tenga contenido real.

## Resultado esperado

- Aplicación sin errores.
- Navegación funcional.
- Apariencia coherente y profesional.
- Uso correcto en escritorio, tablet y móvil.
- Datos mock realistas.
- Preparación para conectar Supabase después.
- Código fácil de mantener.

Lee todos los archivos Markdown de este paquete antes de comenzar.
