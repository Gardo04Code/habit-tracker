// Alias mantenibles sobre los tipos generados en `database.types.ts`. No se
// duplica ninguna definición de columna aquí — todo se deriva directamente
// de `Database`, así que una regeneración de tipos (tras aplicar una nueva
// migración) se propaga automáticamente sin tocar este archivo, salvo que
// cambien los nombres de tabla/columna en sí.
//
// ⚠️ Colisión de nombres deliberadamente NO resuelta todavía: este archivo
// exporta `Habit`, `HabitLog`, `Goal` con la forma exacta de la fila de
// base de datos (snake_case). `src/types/habit.ts` y `src/types/goal.ts`
// YA exportan tipos con esos mismos nombres, pero con forma de PRESENTACIÓN
// (camelCase, pensados para los mocks y componentes visuales existentes).
// Son dos conceptos distintos que hoy comparten nombre en dos módulos
// distintos — no hay conflicto en tiempo de compilación mientras no se
// importen ambos en el mismo archivo sin alias. Cuando se conecte una
// pantalla real a Supabase (fuera del alcance de esta tarea), habrá que
// decidir explícitamente cómo mapear una fila de `habits`/`habit_logs`/
// `goals` hacia su modelo visual correspondiente — ver
// MDs/12_BACKEND_INTEGRATION_SETUP.md, sección de riesgos.

import type { Database } from "./database.types";

type Tables = Database["public"]["Tables"];

export type Profile = Tables["profiles"]["Row"];
export type ProfileUpdate = Tables["profiles"]["Update"];

export type Category = Tables["categories"]["Row"];
export type CategoryInsert = Tables["categories"]["Insert"];
export type CategoryUpdate = Tables["categories"]["Update"];

export type Habit = Tables["habits"]["Row"];
export type HabitInsert = Tables["habits"]["Insert"];
export type HabitUpdate = Tables["habits"]["Update"];

export type HabitCategory = Tables["habit_categories"]["Row"];

export type HabitSchedule = Tables["habit_schedules"]["Row"];

export type HabitLog = Tables["habit_logs"]["Row"];
export type HabitLogInsert = Tables["habit_logs"]["Insert"];
export type HabitLogUpdate = Tables["habit_logs"]["Update"];

export type Goal = Tables["goals"]["Row"];
export type GoalInsert = Tables["goals"]["Insert"];
export type GoalUpdate = Tables["goals"]["Update"];

// Enums usados por los servicios y, eventualmente, por los formularios
// reales (distintos de los enums de presentación en src/types/habit.ts y
// src/types/goal.ts, que usan los mismos valores literales pero no están
// ligados al tipo generado).
export type DbHabitStatus = Database["public"]["Enums"]["habit_status"];
export type DbHabitLifecycleStatus = Database["public"]["Enums"]["habit_lifecycle_status"];
export type DbGoalType = Database["public"]["Enums"]["goal_type"];
export type DbFrequencyType = Database["public"]["Enums"]["frequency_type"];
export type DbGoalStatus = Database["public"]["Enums"]["goal_status"];
export type DbTimeFormat = Database["public"]["Enums"]["time_format"];
export type DbCategoryLifecycleStatus = Database["public"]["Enums"]["category_lifecycle_status"];
export type DbGoalLifecycleStatus = Database["public"]["Enums"]["goal_lifecycle_status"];
export type DbGoalProgressSource = Database["public"]["Enums"]["goal_progress_source"];
