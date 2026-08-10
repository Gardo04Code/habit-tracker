export type GoalStatus = "active" | "completed" | "expired";

// D-02 (MDs/10_DATABASE_DECISIONS.md): ciclo de vida independiente del
// resultado (GoalStatus). Una meta puede ser status="completed" y
// lifecycleStatus="active" a la vez, o status="active" y
// lifecycleStatus="paused" — son dos ejes distintos, nunca se mezclan.
export type GoalLifecycleStatus = "active" | "paused" | "deleted";

// D-05: origen del progreso. Determina quién puede escribir currentValue y
// qué validaciones aplican al crear/editar.
export type GoalProgressSource = "habit_logs" | "calculated" | "manual";

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
  status: GoalStatus;
  // Opcionales: los mocks (era anterior a esta tarea) no los conocen — solo
  // las metas reales de Supabase los traen poblados. Un componente que los
  // recibe `undefined` debe tratarlo como "no aplica en este origen de
  // datos", nunca como "paused"/"manual" por defecto.
  lifecycleStatus?: GoalLifecycleStatus;
  progressSource?: GoalProgressSource;
}
