import { useCallback, useEffect, useState } from "react";
import type { Goal, GoalLifecycleStatus } from "../types/goal";
import { mockGoals } from "../data/mockGoals";
import { isSupabaseDataSource } from "../lib/dataSource";
import { normalizeSupabaseError } from "../lib/errors";
import {
  goalsService,
  type CreateGoalPayload,
  type UpdateGoalPayload,
  type Goal as GoalRow,
} from "../services/goals.service";

export type { CreateGoalPayload, UpdateGoalPayload };

function fromRow(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    habitId: row.habit_id ?? undefined,
    targetValue: row.target_value,
    currentValue: row.current_value,
    unit: row.unit,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    lifecycleStatus: row.goal_lifecycle_status,
    progressSource: row.progress_source,
  };
}

let mockSequence = 0;
function nextMockId(): string {
  mockSequence += 1;
  return `goal-mock-${Date.now()}-${mockSequence}`;
}

/**
 * Alterna entre `mockGoals` (estado en memoria, mismo patrón que
 * useHabits/useCategories) y `goalsService` según VITE_DATA_SOURCE.
 * GoalsPage no necesita saber cuál origen está activo: recibe siempre la
 * misma forma, incluyendo lifecycleStatus/progressSource (en modo mock,
 * todas las metas nacen "active"/"manual" — los mocks originales nunca
 * modelaron esos dos ejes, D-02/D-05 son decisiones posteriores a los
 * mocks).
 */
export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>(() =>
    isSupabaseDataSource
      ? []
      : mockGoals.map((goal) => ({ ...goal, lifecycleStatus: "active" as const, progressSource: "manual" as const })),
  );
  const [loading, setLoading] = useState(isSupabaseDataSource);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseDataSource) return;
    try {
      const rows = await goalsService.getGoals();
      setGoals(rows.map(fromRow));
      setError(null);
    } catch (caught) {
      setError(normalizeSupabaseError(caught).friendlyMessage);
    }
  }, []);

  // Mismo motivo que en useHabits.ts/useCategories.ts: no se llama a
  // refresh() aquí para no disparar "react-hooks/set-state-in-effect".
  // `loading` ya nace en `true` cuando isSupabaseDataSource.
  useEffect(() => {
    if (!isSupabaseDataSource) return;
    let cancelled = false;

    goalsService
      .getGoals()
      .then((rows) => {
        if (!cancelled) {
          setGoals(rows.map(fromRow));
          setError(null);
        }
      })
      .catch((caught) => {
        if (!cancelled) setError(normalizeSupabaseError(caught).friendlyMessage);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeGoals = goals.filter((goal) => (goal.lifecycleStatus ?? "active") === "active");
  const pausedGoals = goals.filter((goal) => goal.lifecycleStatus === "paused");
  const deletedGoals = goals.filter((goal) => goal.lifecycleStatus === "deleted");

  const createGoal = useCallback(async (payload: CreateGoalPayload): Promise<Goal> => {
    if (!isSupabaseDataSource) {
      const title = payload.title.trim();
      if (!title) throw new Error("El título de la meta es obligatorio.");
      if (!Number.isFinite(payload.targetValue) || payload.targetValue <= 0) {
        throw new Error("Ingresa un objetivo mayor a 0.");
      }
      if (payload.endDate < payload.startDate) {
        throw new Error("La fecha límite no puede ser anterior a la fecha de inicio.");
      }

      const goal: Goal = {
        id: nextMockId(),
        title,
        description: payload.description ?? undefined,
        habitId: payload.progressSource === "habit_logs" ? (payload.habitId ?? undefined) : undefined,
        targetValue: payload.targetValue,
        currentValue: payload.progressSource === "manual" ? (payload.currentValue ?? 0) : 0,
        unit: payload.unit,
        startDate: payload.startDate,
        endDate: payload.endDate,
        status: "active",
        lifecycleStatus: "active",
        progressSource: payload.progressSource,
      };
      setGoals((current) => [goal, ...current]);
      return goal;
    }

    const row = await goalsService.createGoal(payload);
    await refresh();
    return fromRow(row);
  }, [refresh]);

  const updateGoal = useCallback(
    async (id: string, payload: UpdateGoalPayload): Promise<Goal> => {
      if (!isSupabaseDataSource) {
        const target = goals.find((goal) => goal.id === id);
        if (!target) throw new Error("No encontramos esa meta.");
        if (payload.title !== undefined && !payload.title.trim()) {
          throw new Error("El título de la meta es obligatorio.");
        }
        if (payload.targetValue !== undefined && (!Number.isFinite(payload.targetValue) || payload.targetValue <= 0)) {
          throw new Error("Ingresa un objetivo mayor a 0.");
        }
        const nextStart = payload.startDate ?? target.startDate;
        const nextEnd = payload.endDate ?? target.endDate;
        if (nextEnd < nextStart) {
          throw new Error("La fecha límite no puede ser anterior a la fecha de inicio.");
        }

        const updated: Goal = {
          ...target,
          title: payload.title !== undefined ? payload.title.trim() : target.title,
          description: payload.description === undefined ? target.description : (payload.description ?? undefined),
          targetValue: payload.targetValue ?? target.targetValue,
          unit: payload.unit ?? target.unit,
          startDate: nextStart,
          endDate: nextEnd,
          habitId: payload.habitId === undefined ? target.habitId : (payload.habitId ?? undefined),
        };
        setGoals((current) => current.map((goal) => (goal.id === id ? updated : goal)));
        return updated;
      }

      const row = await goalsService.updateGoal(id, payload);
      await refresh();
      return fromRow(row);
    },
    [goals, refresh],
  );

  const updateManualGoalProgress = useCallback(
    async (id: string, currentValue: number): Promise<Goal> => {
      if (!Number.isFinite(currentValue) || currentValue < 0) {
        throw new Error("El valor no puede ser negativo.");
      }

      if (!isSupabaseDataSource) {
        const target = goals.find((goal) => goal.id === id);
        if (!target) throw new Error("No encontramos esa meta.");
        if (target.progressSource && target.progressSource !== "manual") {
          throw new Error("El progreso de esta meta se calcula automáticamente; no puedes editarlo directamente.");
        }
        const updated: Goal = { ...target, currentValue };
        setGoals((current) => current.map((goal) => (goal.id === id ? updated : goal)));
        return updated;
      }

      const row = await goalsService.updateManualGoalProgress(id, currentValue);
      await refresh();
      return fromRow(row);
    },
    [goals, refresh],
  );

  const setLifecycle = useCallback(
    async (id: string, lifecycleStatus: GoalLifecycleStatus): Promise<Goal> => {
      if (!isSupabaseDataSource) {
        const target = goals.find((goal) => goal.id === id);
        if (!target) throw new Error("No encontramos esa meta.");
        const updated: Goal = { ...target, lifecycleStatus };
        setGoals((current) => current.map((goal) => (goal.id === id ? updated : goal)));
        return updated;
      }

      const row =
        lifecycleStatus === "paused"
          ? await goalsService.pauseGoal(id)
          : lifecycleStatus === "deleted"
            ? await goalsService.softDeleteGoal(id)
            : await goalsService.reactivateGoal(id);
      await refresh();
      return fromRow(row);
    },
    [goals, refresh],
  );

  const pauseGoal = useCallback((id: string) => setLifecycle(id, "paused"), [setLifecycle]);
  const reactivateGoal = useCallback((id: string) => setLifecycle(id, "active"), [setLifecycle]);
  const softDeleteGoal = useCallback((id: string) => setLifecycle(id, "deleted"), [setLifecycle]);
  const restoreGoal = useCallback((id: string) => setLifecycle(id, "active"), [setLifecycle]);

  return {
    goals,
    activeGoals,
    pausedGoals,
    deletedGoals,
    loading,
    error,
    refresh,
    createGoal,
    updateGoal,
    updateManualGoalProgress,
    pauseGoal,
    reactivateGoal,
    softDeleteGoal,
    restoreGoal,
  };
}
