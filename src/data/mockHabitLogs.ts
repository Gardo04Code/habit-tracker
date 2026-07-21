import type { HabitLog, HabitStatus } from "../types/habit";
import { addDays, daysBetween } from "../utils/formatDate";
import { TODAY } from "./referenceDate";

interface LogRecipe {
  habitId: string;
  startDate: string;
  lastLogDate: string;
  targetValue?: number;
  restDayEvery?: number;
  notes: string[];
}

// Generador determinista (sin Math.random) para mantener el histórico
// estable entre recargas y consistente con las 4 semanas requeridas.
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(20260721);

const recipes: LogRecipe[] = [
  {
    habitId: "habit-water",
    startDate: addDays(TODAY, -27),
    lastLogDate: TODAY,
    targetValue: 8,
    notes: ["Me costó llegar a la meta por reuniones seguidas.", "Llevé la botella al gimnasio."],
  },
  {
    habitId: "habit-read",
    startDate: addDays(TODAY, -27),
    lastLogDate: TODAY,
    targetValue: 20,
    notes: ["Capítulo largo, terminé motivado.", "Leí antes de dormir."],
  },
  {
    habitId: "habit-train",
    startDate: addDays(TODAY, -27),
    lastLogDate: addDays(TODAY, -1),
    restDayEvery: 3,
    notes: ["Piernas y espalda.", "Sesión corta pero intensa."],
  },
  {
    habitId: "habit-sleep",
    startDate: addDays(TODAY, -27),
    lastLogDate: addDays(TODAY, -1),
    notes: ["Me dormí revisando el teléfono.", "Buena rutina antes de dormir."],
  },
  {
    habitId: "habit-meditate",
    startDate: addDays(TODAY, -27),
    lastLogDate: addDays(TODAY, -16),
    targetValue: 10,
    notes: ["Sesión guiada de respiración."],
  },
  {
    habitId: "habit-study",
    startDate: addDays(TODAY, -27),
    lastLogDate: addDays(TODAY, -21),
    targetValue: 45,
    notes: ["Repaso de la unidad 4."],
  },
];

function pickStatus(recipe: LogRecipe): HabitStatus {
  const roll = random();
  if (recipe.restDayEvery && roll < 0.16) return "not_applicable";
  if (roll < 0.58) return "completed";
  if (roll < 0.78) return "partial";
  return "not_completed";
}

function buildValue(status: HabitStatus, targetValue: number | undefined): number | undefined {
  if (targetValue === undefined) return undefined;
  if (status === "completed") {
    const exceeds = random() < 0.2;
    return exceeds
      ? Math.round(targetValue * (1.1 + random() * 0.3))
      : targetValue;
  }
  if (status === "partial") {
    return Math.max(1, Math.round(targetValue * (0.3 + random() * 0.5)));
  }
  return undefined;
}

function buildLogsForRecipe(recipe: LogRecipe): HabitLog[] {
  const totalDays = daysBetween(recipe.startDate, recipe.lastLogDate);
  const logs: HabitLog[] = [];

  for (let offset = 0; offset <= totalDays; offset += 1) {
    const date = addDays(recipe.startDate, offset);
    const status = pickStatus(recipe);
    const value = buildValue(status, recipe.targetValue);
    const withNote = status !== "pending" && random() < 0.12;

    logs.push({
      id: `log-${recipe.habitId}-${date}`,
      habitId: recipe.habitId,
      date,
      status,
      value,
      note: withNote ? recipe.notes[Math.floor(random() * recipe.notes.length)] : undefined,
      recordedTime: status === "completed" || status === "partial"
        ? `${String(6 + Math.floor(random() * 15)).padStart(2, "0")}:${String(Math.floor(random() * 60)).padStart(2, "0")}`
        : undefined,
      createdAt: `${date}T12:00:00.000Z`,
      updatedAt: `${date}T12:00:00.000Z`,
    });
  }

  return logs;
}

const generatedLogs = recipes.flatMap(buildLogsForRecipe);

// Registros curados para anclar el relato del día actual en el Dashboard
// y el Checklist: agua y lectura completadas, entrenamiento pendiente,
// sueño parcial (se acostó un poco tarde) y una meta superada visible.
const curatedTodayLogs: HabitLog[] = [
  {
    id: `log-habit-water-${TODAY}`,
    habitId: "habit-water",
    date: TODAY,
    status: "completed",
    value: 9,
    note: undefined,
    recordedTime: "21:10",
    createdAt: `${TODAY}T21:10:00.000Z`,
    updatedAt: `${TODAY}T21:10:00.000Z`,
  },
  {
    id: `log-habit-read-${TODAY}`,
    habitId: "habit-read",
    date: TODAY,
    status: "completed",
    value: 25,
    note: "Terminé un capítulo extra.",
    recordedTime: "07:40",
    createdAt: `${TODAY}T07:40:00.000Z`,
    updatedAt: `${TODAY}T07:40:00.000Z`,
  },
  {
    id: `log-habit-sleep-${addDays(TODAY, -1)}`,
    habitId: "habit-sleep",
    date: addDays(TODAY, -1),
    status: "partial",
    note: "Me dormí a las 23:20.",
    recordedTime: "23:20",
    createdAt: `${addDays(TODAY, -1)}T23:20:00.000Z`,
    updatedAt: `${addDays(TODAY, -1)}T23:20:00.000Z`,
  },
];

function mergeLogs(base: HabitLog[], overrides: HabitLog[]): HabitLog[] {
  const byId = new Map(base.map((log) => [log.id, log]));
  overrides.forEach((log) => byId.set(log.id, log));
  return Array.from(byId.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export const mockHabitLogs: HabitLog[] = mergeLogs(generatedLogs, curatedTodayLogs);

export function getLogsForHabit(habitId: string): HabitLog[] {
  return mockHabitLogs.filter((log) => log.habitId === habitId);
}

export function getLogForHabitOnDate(habitId: string, date: string): HabitLog | undefined {
  return mockHabitLogs.find((log) => log.habitId === habitId && log.date === date);
}

export function getLogsForDate(date: string): HabitLog[] {
  return mockHabitLogs.filter((log) => log.date === date);
}
