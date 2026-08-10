import { useCallback, useEffect, useState } from "react";
import { isSupabaseDataSource } from "../lib/dataSource";
import { normalizeSupabaseError } from "../lib/errors";
import { mockHabits } from "../data/mockHabits";
import { habitsService, type HabitDraft } from "../services/habits.service";
import type { Habit, HabitLifecycleStatus } from "../types/habit";

export type { HabitDraft };

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Alterna entre `mockHabits` (estado en memoria, mismo comportamiento que
 * el `useHabitsManager` que sustituye) y `habitsService` según
 * `VITE_DATA_SOURCE`. Devuelve siempre la misma forma — HabitsPage,
 * HabitCard, HabitListRow, HabitFormModal y DeleteHabitModal no cambian su
 * lógica de consumo entre un modo y otro.
 *
 * En modo Supabase, cada mutación exitosa vuelve a pedir la lista completa
 * (`refresh()`) en vez de parchear el estado local — prioriza consistencia
 * sobre una actualización optimista, tal como pide esta tarea, ya que un
 * hábito real depende de tres tablas distintas (habits, habit_schedules,
 * habit_categories) y reconciliar eso a mano localmente sería más propenso
 * a desincronizarse que volver a pedirlo.
 */
export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>(() => (isSupabaseDataSource ? [] : [...mockHabits]));
  const [loading, setLoading] = useState(isSupabaseDataSource);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseDataSource) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await habitsService.getHabits();
      setHabits(rows);
    } catch (caught) {
      setError(normalizeSupabaseError(caught).friendlyMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mismo motivo que useCategories.ts: no se llama a refresh() aquí para no
  // disparar "react-hooks/set-state-in-effect" (su primera línea hace
  // setLoading(true) de forma síncrona). `loading` ya nace en `true` cuando
  // isSupabaseDataSource.
  useEffect(() => {
    if (!isSupabaseDataSource) return;
    let cancelled = false;

    habitsService
      .getHabits()
      .then((rows) => {
        if (!cancelled) setHabits(rows);
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

  const isNameTaken = useCallback(
    (name: string, excludeId?: string): boolean => {
      // Misma regla que habits_active_name_normalized_idx (H-06): un hábito
      // "deleted" no ocupa el nombre; paused/archived sí.
      const normalized = name.trim().toLowerCase();
      return habits.some(
        (habit) =>
          habit.id !== excludeId && habit.lifecycleStatus !== "deleted" && habit.name.trim().toLowerCase() === normalized,
      );
    },
    [habits],
  );

  const createHabit = useCallback(async (draft: HabitDraft): Promise<Habit> => {
    if (!isSupabaseDataSource) {
      const habit: Habit = { ...draft, id: `habit-${Date.now()}`, lifecycleStatus: "active", createdAt: nowIso(), updatedAt: nowIso() };
      setHabits((current) => [habit, ...current]);
      return habit;
    }

    const created = await habitsService.createHabit(draft);
    await refresh();
    return created;
  }, [refresh]);

  const updateHabit = useCallback(async (id: string, draft: HabitDraft): Promise<Habit> => {
    if (!isSupabaseDataSource) {
      let updated: Habit | undefined;
      setHabits((current) =>
        current.map((habit) => {
          if (habit.id !== id) return habit;
          updated = { ...habit, ...draft, updatedAt: nowIso() };
          return updated;
        }),
      );
      if (!updated) throw new Error("No encontramos ese hábito.");
      return updated;
    }

    const updated = await habitsService.updateHabit(id, draft);
    await refresh();
    return updated;
  }, [refresh]);

  const setLifecycleStatus = useCallback(async (id: string, lifecycleStatus: HabitLifecycleStatus): Promise<Habit> => {
    if (!isSupabaseDataSource) {
      let updated: Habit | undefined;
      setHabits((current) =>
        current.map((habit) => {
          if (habit.id !== id) return habit;
          updated = { ...habit, lifecycleStatus, updatedAt: nowIso() };
          return updated;
        }),
      );
      if (!updated) throw new Error("No encontramos ese hábito.");
      return updated;
    }

    const updated = await habitsService.setHabitLifecycleStatus(id, lifecycleStatus);
    await refresh();
    return updated;
  }, [refresh]);

  const softDeleteHabit = useCallback((id: string) => setLifecycleStatus(id, "deleted"), [setLifecycleStatus]);
  const restoreHabit = useCallback((id: string) => setLifecycleStatus(id, "active"), [setLifecycleStatus]);
  const pauseHabit = useCallback((id: string) => setLifecycleStatus(id, "paused"), [setLifecycleStatus]);
  const reactivateHabit = useCallback((id: string) => setLifecycleStatus(id, "active"), [setLifecycleStatus]);
  const archiveHabit = useCallback((id: string) => setLifecycleStatus(id, "archived"), [setLifecycleStatus]);

  // Eliminación física — deliberadamente NO implementada contra Supabase en
  // esta tarea (alcance excluido explícitamente). En modo mock conserva el
  // comportamiento previo de useHabitsManager (quita del arreglo local).
  const hardDeleteHabit = useCallback((id: string) => {
    if (!isSupabaseDataSource) {
      setHabits((current) => current.filter((habit) => habit.id !== id));
      return;
    }
    throw new Error(
      "Eliminar hábito y todos sus registros todavía no está disponible en esta fase — usa \"Eliminar únicamente el hábito\".",
    );
  }, []);

  const deletedHabits = habits.filter((habit) => habit.lifecycleStatus === "deleted");

  return {
    habits,
    deletedHabits,
    loading,
    error,
    refresh,
    isNameTaken,
    createHabit,
    updateHabit,
    softDeleteHabit,
    restoreHabit,
    pauseHabit,
    reactivateHabit,
    archiveHabit,
    hardDeleteHabit,
  };
}
