import type { Recommendation } from "../types/recommendation";

export const mockRecommendations: Recommendation[] = [
  {
    id: "rec-best-day",
    type: "pattern",
    title: "Tu mejor día de cumplimiento es el martes",
    description: "Los martes completas en promedio el 92 % de tus hábitos programados.",
    priority: "low",
  },
  {
    id: "rec-sleep-risk",
    type: "warning",
    title: "Dormir temprano está en riesgo de abandono",
    description: "Llevas tres días acostándote después de las 11:00 p. m.",
    priority: "high",
    habitId: "habit-sleep",
  },
  {
    id: "rec-train-sleep",
    type: "pattern",
    title: "Tus entrenamientos mejoran cuando duermes antes de las 11",
    description: "En los días con buen descanso tu rendimiento en el gimnasio sube un 30 %.",
    priority: "medium",
    habitId: "habit-train",
  },
  {
    id: "rec-streak-risk",
    type: "warning",
    title: "Estás a un día de perder tu racha",
    description: "Registra \"Tomar agua\" hoy para mantener tu racha de 15 días.",
    priority: "high",
    habitId: "habit-water",
  },
  {
    id: "rec-read-goal",
    type: "success",
    title: "Superaste tu meta semanal de lectura",
    description: "Leíste 25 minutos hoy, 5 más de lo planeado.",
    priority: "low",
    habitId: "habit-read",
  },
  {
    id: "rec-meditate-suggestion",
    type: "suggestion",
    title: "Retoma la meditación con sesiones cortas",
    description: "Llevas 16 días sin registrar meditación. Prueba con 5 minutos para retomar el hábito.",
    priority: "medium",
    habitId: "habit-meditate",
  },
];
