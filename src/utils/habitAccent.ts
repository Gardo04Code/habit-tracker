/**
 * Acento por tipo de hábito, solo para la línea de tiempo de racha: igual
 * que la escala de rendimiento del gráfico semanal, es una excepción
 * deliberada a "un solo acento" — aquí el color identifica qué tipo de
 * hábito fue el mejor del día, no es decoración.
 */
export interface HabitAccent {
  base: string;
  light: string;
  glow: string;
  label: string;
}

const ACCENTS: Record<string, HabitAccent> = {
  hidratacion: { base: "#3b82f6", light: "#93c5fd", glow: "rgba(59, 130, 246, 0.45)", label: "Hidratación" },
  ejercicio: { base: "#22d3ee", light: "#a5f3fc", glow: "rgba(34, 211, 238, 0.45)", label: "Ejercicio" },
  bienestar: { base: "#22c55e", light: "#86efac", glow: "rgba(34, 197, 94, 0.45)", label: "Salud y bienestar" },
  lectura: { base: "#f59e0b", light: "#fde68a", glow: "rgba(245, 158, 11, 0.45)", label: "Lectura" },
  descanso: { base: "#a78bfa", light: "#ddd6fe", glow: "rgba(167, 139, 250, 0.45)", label: "Descanso" },
};

const DEFAULT_ACCENT: HabitAccent = {
  base: "#4c7cf0",
  light: "#a8bffa",
  glow: "rgba(76, 124, 240, 0.45)",
  label: "Hábito",
};

const ICON_TO_ACCENT_KEY: Record<string, keyof typeof ACCENTS> = {
  "glass-water": "hidratacion",
  dumbbell: "ejercicio",
  footprints: "ejercicio",
  sparkles: "bienestar",
  "heart-pulse": "bienestar",
  brain: "bienestar",
  sun: "bienestar",
  "book-open": "lectura",
  "graduation-cap": "lectura",
  "notebook-pen": "lectura",
  pencil: "lectura",
  moon: "descanso",
};

export function getHabitAccent(iconName: string): HabitAccent {
  const key = ICON_TO_ACCENT_KEY[iconName];
  return key ? ACCENTS[key] : DEFAULT_ACCENT;
}
