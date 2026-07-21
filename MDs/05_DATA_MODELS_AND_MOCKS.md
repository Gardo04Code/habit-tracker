# 05 — Modelos y datos mock

## Tipos fundamentales

```ts
export type HabitStatus =
  | "pending"
  | "completed"
  | "partial"
  | "not_completed"
  | "not_applicable";

export type HabitLifecycleStatus =
  | "active"
  | "paused"
  | "archived"
  | "deleted";

export type GoalType =
  | "boolean"
  | "quantity"
  | "duration"
  | "repetitions"
  | "deadline"
  | "accumulated_days";

export type FrequencyType =
  | "daily"
  | "specific_days"
  | "times_per_week"
  | "times_per_month"
  | "one_time"
  | "custom_interval";
```

## Category

```ts
export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}
```

## Habit

```ts
export interface Habit {
  id: string;
  name: string;
  description?: string;
  categoryIds: string[];
  icon: string;
  color: string;
  frequencyType: FrequencyType;
  daysOfWeek?: number[];
  frequencyTarget?: number;
  intervalDays?: number;
  goalType: GoalType;
  targetValue?: number;
  targetUnit?: string;
  deadlineTime?: string;
  startDate: string;
  endDate?: string;
  lifecycleStatus: HabitLifecycleStatus;
  allowPartial: boolean;
  createdAt: string;
  updatedAt: string;
}
```

## HabitLog

```ts
export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  status: HabitStatus;
  value?: number;
  note?: string;
  recordedTime?: string;
  createdAt: string;
  updatedAt: string;
}
```

## Goal

```ts
export interface Goal {
  id: string;
  title: string;
  description?: string;
  habitId?: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate: string;
  endDate: string;
  status: "active" | "completed" | "expired";
}
```

## Recommendation

```ts
export interface Recommendation {
  id: string;
  type: "success" | "warning" | "suggestion" | "pattern";
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  habitId?: string;
}
```

## User

```ts
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  timezone: string;
  weekStartsOn: 0 | 1;
}
```

## Datos mock requeridos

### Hábitos

Crear como mínimo:

1. Tomar agua.
2. Leer 20 minutos.
3. Entrenar.
4. Dormir antes de las 11:00 p. m.
5. Meditar.
6. Estudiar.

Distribución:

- cuatro activos;
- uno pausado;
- uno archivado;
- uno adicional en papelera.

### Categorías

Ejemplos:

```text
Salud
Bienestar
Aprendizaje
Productividad
Ejercicio
Sueño
```

### Registros

Incluir al menos cuatro semanas de datos.

Deben existir:

- completados;
- parciales;
- pendientes;
- no realizados;
- no aplicables;
- valores superiores a la meta;
- notas;
- diferentes horarios.

### Metas

Ejemplos:

- alcanzar 80 % mensual;
- leer 20 días;
- entrenar cuatro veces por semana;
- mantener una racha de 15 días;
- tomar 60 litros de agua durante el mes.

Incluir metas:

- activas;
- cumplidas;
- vencidas;
- superiores al 100 %.

### Recomendaciones

Ejemplos:

```text
Tu mejor día de cumplimiento es el martes.
Dormir temprano está en riesgo de abandono.
Tus entrenamientos mejoran cuando duermes antes de las 11.
Estás a un día de perder tu racha.
Superaste tu meta semanal de lectura.
```

## Dashboard mock

Debe ofrecer datos suficientes para:

- cuatro KPIs;
- siete días de gráfica;
- dona por estados;
- heatmap;
- hábitos fuertes;
- hábitos débiles;
- recomendaciones.

## Reglas de presentación

- Mostrar porcentajes reales superiores a 100 %.
- Un hábito parcial debe mostrar valor actual y meta.
- Un hábito pausado aparece en Estadísticas.
- Un hábito archivado no aparece en Dashboard.
- Un registro mayor a siete días se marca como solo lectura.
- No aplicable no debe reducir visualmente la racha.
- Datos mock deben ser consistentes entre pantallas.

## Consistencia obligatoria

Los mismos IDs deben relacionar:

```text
Habit
HabitLog
Goal
Recommendation
```

No crear datos contradictorios entre Dashboard, Historial y Estadísticas.
