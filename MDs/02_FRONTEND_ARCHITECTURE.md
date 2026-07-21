# 02 — Arquitectura Front-End

## Objetivo

Construir una arquitectura modular, escalable y preparada para sustituir datos mock por servicios reales sin rehacer las pantallas.

## Estructura recomendada

```text
src/
├── assets/
├── components/
│   ├── charts/
│   ├── checklist/
│   ├── common/
│   ├── dashboard/
│   ├── habits/
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

No se deben crear carpetas vacías sin propósito. Cada carpeta se crea cuando contenga archivos reales.

## Responsabilidades

### `pages`

Contiene pantallas completas asociadas a rutas:

```text
DashboardPage.tsx
DailyChecklistPage.tsx
HabitsPage.tsx
HistoryPage.tsx
StatisticsPage.tsx
GoalsPage.tsx
SettingsPage.tsx
NotFoundPage.tsx
```

Las páginas coordinan componentes, filtros y secciones. No deben contener componentes reutilizables completos dentro del mismo archivo.

### `layouts`

Contiene estructuras globales:

```text
AppLayout.tsx
```

El layout debe integrar:

- Sidebar.
- Header.
- área principal.
- MobileNavigation.
- Outlet de React Router.

### `components/layout`

```text
Sidebar.tsx
TopHeader.tsx
MobileNavigation.tsx
MobileMoreMenu.tsx
```

### `components/ui`

Componentes genéricos:

```text
Button.tsx
IconButton.tsx
Card.tsx
Badge.tsx
StatusBadge.tsx
ProgressBar.tsx
Modal.tsx
Select.tsx
Input.tsx
TextArea.tsx
Toggle.tsx
Tabs.tsx
EmptyState.tsx
SectionHeader.tsx
```

### `components/dashboard`

```text
MetricCard.tsx
WeeklyProgressChart.tsx
ProgressDonut.tsx
HabitStrengthList.tsx
RecommendationCard.tsx
ConsistencyCalendar.tsx
TodaySummary.tsx
```

### `components/checklist`

```text
DailyHabitCard.tsx
ChecklistSummary.tsx
DateNavigator.tsx
StatusFilter.tsx
HabitValueInput.tsx
HabitNoteModal.tsx
```

### `components/habits`

```text
HabitCard.tsx
HabitFilters.tsx
HabitFormModal.tsx
DeleteHabitModal.tsx
HabitStatusTabs.tsx
```

### `components/charts`

Contiene wrappers reutilizables para Recharts.

### `types`

```text
habit.ts
goal.ts
dashboard.ts
recommendation.ts
user.ts
navigation.ts
```

### `data`

```text
mockHabits.ts
mockHabitLogs.ts
mockDashboard.ts
mockGoals.ts
mockRecommendations.ts
mockUser.ts
```

### `utils`

Ejemplos:

```text
formatDate.ts
calculateProgress.ts
habitStatus.ts
dateRestrictions.ts
```

## Rutas

Usar `react-router-dom`.

```text
/             Dashboard
/checklist    Checklist diario
/habits       Mis hábitos
/history      Historial
/statistics   Estadísticas
/goals        Metas
/settings     Configuración
```

Ruta fallback:

```text
* → redirigir a /
```

## App.tsx

Debe limitarse a:

- configuración principal;
- render del router;
- providers estrictamente necesarios.

No debe contener toda la aplicación.

## main.tsx

Debe:

- montar React;
- importar estilos globales;
- envolver la aplicación con `BrowserRouter` si el router no se define con `createBrowserRouter`.

## Estado

Durante esta fase:

- usar `useState` para interacciones locales;
- usar `useMemo` cuando sea útil;
- evitar Redux, Zustand o Context global sin necesidad;
- no usar `localStorage`;
- no simular un backend complejo.

## Preparación para Supabase

Los componentes no deben importar Supabase directamente.

Más adelante, los mocks podrán sustituirse por servicios:

```text
services/
├── habits.service.ts
├── logs.service.ts
├── goals.service.ts
└── dashboard.service.ts
```

## TypeScript

- No utilizar `any`.
- Utilizar uniones de literales.
- Definir props explícitas.
- No duplicar interfaces.
- Usar tipos compartidos desde `src/types`.
- Evitar casts innecesarios.

## Convenciones

- Componentes: PascalCase.
- Hooks: camelCase con prefijo `use`.
- Funciones: camelCase.
- Constantes globales: UPPER_SNAKE_CASE cuando corresponda.
- Nombres técnicos y archivos: inglés.
- Textos visibles: español.
