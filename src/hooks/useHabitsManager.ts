import { useState } from "react";
import type { Habit, HabitLifecycleStatus } from "../types/habit";
import { mockHabits } from "../data/mockHabits";

export type HabitDraft = Omit<Habit, "id" | "lifecycleStatus" | "createdAt" | "updatedAt">;

function nowIso(): string {
  return new Date().toISOString();
}

export function useHabitsManager() {
  const [habits, setHabits] = useState<Habit[]>(() => [...mockHabits]);

  function isNameTaken(name: string, excludeId?: string): boolean {
    const normalized = name.trim().toLowerCase();
    return habits.some(
      (habit) => habit.id !== excludeId && habit.lifecycleStatus !== "deleted" && habit.name.trim().toLowerCase() === normalized,
    );
  }

  function addHabit(draft: HabitDraft) {
    const habit: Habit = {
      ...draft,
      id: `habit-${Date.now()}`,
      lifecycleStatus: "active",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    setHabits((current) => [habit, ...current]);
  }

  function updateHabit(id: string, draft: HabitDraft) {
    setHabits((current) =>
      current.map((habit) => (habit.id === id ? { ...habit, ...draft, updatedAt: nowIso() } : habit)),
    );
  }

  function setLifecycleStatus(id: string, lifecycleStatus: HabitLifecycleStatus) {
    setHabits((current) =>
      current.map((habit) => (habit.id === id ? { ...habit, lifecycleStatus, updatedAt: nowIso() } : habit)),
    );
  }

  function hardDeleteHabit(id: string) {
    setHabits((current) => current.filter((habit) => habit.id !== id));
  }

  return {
    habits,
    addHabit,
    updateHabit,
    isNameTaken,
    pauseHabit: (id: string) => setLifecycleStatus(id, "paused"),
    reactivateHabit: (id: string) => setLifecycleStatus(id, "active"),
    archiveHabit: (id: string) => setLifecycleStatus(id, "archived"),
    softDeleteHabit: (id: string) => setLifecycleStatus(id, "deleted"),
    restoreHabit: (id: string) => setLifecycleStatus(id, "active"),
    hardDeleteHabit,
  };
}
