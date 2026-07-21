import { useState } from "react";
import type { Goal, GoalStatus } from "../types/goal";
import { mockGoals } from "../data/mockGoals";

export type GoalDraft = Omit<Goal, "id" | "status">;

export function useGoalsManager() {
  const [goals, setGoals] = useState<Goal[]>(() => [...mockGoals]);

  function addGoal(draft: GoalDraft) {
    const goal: Goal = { ...draft, id: `goal-${Date.now()}`, status: "active" };
    setGoals((current) => [goal, ...current]);
  }

  function updateGoal(id: string, draft: GoalDraft) {
    setGoals((current) => current.map((goal) => (goal.id === id ? { ...goal, ...draft } : goal)));
  }

  function setStatus(id: string, status: GoalStatus) {
    setGoals((current) => current.map((goal) => (goal.id === id ? { ...goal, status } : goal)));
  }

  function deleteGoal(id: string) {
    setGoals((current) => current.filter((goal) => goal.id !== id));
  }

  return {
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    markCompleted: (id: string) => setStatus(id, "completed"),
    markExpired: (id: string) => setStatus(id, "expired"),
    reactivate: (id: string) => setStatus(id, "active"),
  };
}
