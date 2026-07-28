import type { Insight, InsightPriority } from "../types/insight";
import { activeHabits, getHabitById } from "../data/mockHabits";
import { getCategoryById } from "../data/mockCategories";
import { getLogForHabitOnDate, getLogsForHabit } from "../data/mockHabitLogs";
import { mockGoals } from "../data/mockGoals";
import { TODAY } from "../data/referenceDate";
import { addDays, daysBetween, formatFullDate } from "./formatDate";
import { isHabitScheduledForDate } from "./habitSchedule";
import { calculateBestAggregateStreak, calculateCurrentAggregateStreak, calculateDayCompletionPercentage } from "./streakTimeline";

/**
 * Motor de insights: estadística real sobre los datos existentes
 * (mockHabitLogs, streaks agregadas, metas), no un modelo generativo. Cada
 * generador calcula números reales y solo produce un Insight si encuentra
 * una señal genuina (diferencia mínima, tamaño de muestra suficiente); si
 * no hay señal, devuelve null en vez de rellenar con texto genérico.
 */

const WINDOW_DAYS = 21;
const WEEKDAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function categoryNameForHabit(habitId: string | undefined): string {
  const habit = habitId ? getHabitById(habitId) : undefined;
  const category = habit ? getCategoryById(habit.categoryIds[0]) : undefined;
  return category?.name ?? "General";
}

function confidenceFromSample(sampleSize: number, base = 55): number {
  return Math.min(97, base + sampleSize * 3);
}

function averageCompletionOnDates(dates: string[]): number {
  if (dates.length === 0) return 0;
  const total = dates.reduce((sum, date) => sum + calculateDayCompletionPercentage(date), 0);
  return Math.round(total / dates.length);
}

function recentTrend(days: number): number[] {
  return Array.from({ length: days }, (_, index) => calculateDayCompletionPercentage(addDays(TODAY, -(days - 1 - index))));
}

function generateStreakRiskInsight(): Insight | null {
  const currentStreak = calculateCurrentAggregateStreak();
  if (currentStreak === 0) return null;

  const pending = activeHabits
    .filter((habit) => isHabitScheduledForDate(habit, TODAY))
    .filter((habit) => {
      const log = getLogForHabitOnDate(habit.id, TODAY);
      return !log || log.status === "pending";
    });
  if (pending.length === 0) return null;

  const names = pending.map((habit) => habit.name).join(" y ");
  return {
    id: "insight-streak-risk",
    type: "risk",
    category: "Rachas",
    priority: "critical",
    confidence: 92,
    title: `Tu racha de ${currentStreak} ${currentStreak === 1 ? "día" : "días"} está en riesgo hoy`,
    analysis: `Todavía te falta registrar ${pending.length === 1 ? "un hábito" : `${pending.length} hábitos`} hoy (${names}). Para que hoy cuente como día de racha necesitas llegar al 80% de tus hábitos programados.`,
    evidence: [
      { label: "Racha actual", value: `${currentStreak} ${currentStreak === 1 ? "día" : "días"} consecutivos` },
      { label: "Pendientes hoy", value: names },
    ],
    expectedBenefit: "Mantener tu racha activa un día más.",
    action: { label: `Registrar ${pending[0].name}`, kind: "register", href: "/checklist" },
    secondaryActions: [{ label: "Ir al checklist", kind: "go_to_habit", href: "/checklist" }],
    analyzedAt: TODAY,
    habitId: pending[0].id,
    relatedHabitIds: pending.map((habit) => habit.id),
  };
}

function generateSleepCorrelationInsight(): Insight | null {
  const sleepHabit = getHabitById("habit-sleep");
  if (!sleepHabit) return null;

  const since = addDays(TODAY, -WINDOW_DAYS);
  const logs = getLogsForHabit("habit-sleep").filter((log) => log.date >= since && log.date < TODAY);

  const goodDates: string[] = [];
  const badDates: string[] = [];
  for (const log of logs) {
    const nextDay = addDays(log.date, 1);
    if (nextDay > TODAY) continue;
    if (log.status === "completed") goodDates.push(nextDay);
    else if (log.status === "partial" || log.status === "not_completed") badDates.push(nextDay);
  }
  if (goodDates.length < 3 || badDates.length < 3) return null;

  const goodAvg = averageCompletionOnDates(goodDates);
  const badAvg = averageCompletionOnDates(badDates);
  const diff = goodAvg - badAvg;
  if (diff < 5) return null;

  return {
    id: "insight-sleep-correlation",
    type: "correlation",
    category: categoryNameForHabit("habit-sleep"),
    priority: "high",
    confidence: confidenceFromSample(goodDates.length + badDates.length),
    title: "Dormir antes de las 11 cambia todo tu día siguiente",
    analysis: `Comparamos los ${goodDates.length} días posteriores a dormir a tiempo contra los ${badDates.length} días posteriores a acostarte tarde o parcial en las últimas ${WINDOW_DAYS} jornadas.`,
    evidence: [
      { label: "Después de dormir a tiempo", value: `${goodAvg}% de cumplimiento` },
      { label: "Después de dormir tarde", value: `${badAvg}% de cumplimiento` },
    ],
    impact: { label: "cumplimiento del día siguiente", value: diff, direction: "up", unit: "%" },
    expectedBenefit: "Días completos con más consistencia.",
    trendData: recentTrend(10),
    action: { label: "Dormir antes de las 11:00 p. m.", kind: "go_to_habit", href: "/habits" },
    secondaryActions: [{ label: "Ver estadísticas", kind: "view_stats", href: "/statistics" }],
    analyzedAt: TODAY,
    habitId: "habit-sleep",
  };
}

function generateWaterCorrelationInsight(): Insight | null {
  const waterHabit = getHabitById("habit-water");
  if (!waterHabit?.targetValue) return null;

  const since = addDays(TODAY, -WINDOW_DAYS);
  const logs = getLogsForHabit("habit-water").filter(
    (log) => log.date >= since && log.date <= TODAY && log.value !== undefined,
  );

  const exceedDates: string[] = [];
  const normalDates: string[] = [];
  for (const log of logs) {
    if (log.value === undefined) continue;
    if (log.value > waterHabit.targetValue) exceedDates.push(log.date);
    else normalDates.push(log.date);
  }
  if (exceedDates.length < 3 || normalDates.length < 3) return null;

  const exceedAvg = averageCompletionOnDates(exceedDates);
  const normalAvg = averageCompletionOnDates(normalDates);
  const diff = exceedAvg - normalAvg;
  if (diff < 5) return null;

  return {
    id: "insight-water-correlation",
    type: "correlation",
    category: categoryNameForHabit("habit-water"),
    priority: "medium",
    confidence: confidenceFromSample(exceedDates.length + normalDates.length, 50),
    title: "Superar tu meta de agua arrastra al resto de tus hábitos",
    analysis: `En los días que tomaste más de ${waterHabit.targetValue} ${waterHabit.targetUnit}, tu cumplimiento general fue notablemente mayor que en los días donde te quedaste en la meta o por debajo.`,
    evidence: [
      { label: "Días superando la meta de agua", value: `${exceedAvg}% de cumplimiento` },
      { label: "Días en la meta o por debajo", value: `${normalAvg}% de cumplimiento` },
    ],
    impact: { label: "cumplimiento general", value: diff, direction: "up", unit: "%" },
    expectedBenefit: "Un mejor arranque de día completo.",
    trendData: recentTrend(10),
    action: { label: "Registrar agua hoy", kind: "register", href: "/checklist" },
    analyzedAt: TODAY,
    habitId: "habit-water",
  };
}

function generateBestWeekdayInsight(): Insight | null {
  const totals = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }));

  for (let offset = 0; offset < WINDOW_DAYS; offset += 1) {
    const date = addDays(TODAY, -offset);
    const weekday = new Date(`${date}T00:00:00`).getDay();
    totals[weekday].sum += calculateDayCompletionPercentage(date);
    totals[weekday].count += 1;
  }

  const rates = totals
    .map((entry, weekday) => (entry.count > 0 ? { weekday, rate: Math.round(entry.sum / entry.count) } : null))
    .filter((entry): entry is { weekday: number; rate: number } => entry !== null);
  if (rates.length < 3) return null;

  const best = rates.reduce((max, entry) => (entry.rate > max.rate ? entry : max));
  const overallAvg = Math.round(rates.reduce((sum, entry) => sum + entry.rate, 0) / rates.length);
  if (best.rate - overallAvg < 5) return null;

  const mondayFirst = [1, 2, 3, 4, 5, 6, 0].map((weekday) => rates.find((entry) => entry.weekday === weekday)?.rate ?? overallAvg);

  return {
    id: "insight-best-weekday",
    type: "trend",
    category: "General",
    priority: "informational",
    confidence: confidenceFromSample(WINDOW_DAYS, 60),
    title: `Los ${WEEKDAY_NAMES[best.weekday]} son tu mejor día`,
    analysis: `Analizamos tu cumplimiento diario de las últimas ${WINDOW_DAYS} jornadas agrupado por día de la semana.`,
    evidence: [
      { label: `Promedio en ${WEEKDAY_NAMES[best.weekday]}`, value: `${best.rate}%` },
      { label: "Promedio general", value: `${overallAvg}%` },
    ],
    impact: { label: "sobre tu promedio semanal", value: best.rate - overallAvg, direction: "up", unit: "pts" },
    trendData: mondayFirst,
    action: { label: "Ver estadísticas", kind: "view_stats", href: "/statistics" },
    analyzedAt: TODAY,
  };
}

function generateGoalAchievementInsight(): Insight | null {
  const exceeded = mockGoals.find((goal) => goal.status === "completed" && goal.currentValue > goal.targetValue);
  if (!exceeded) return null;

  const overBy = exceeded.currentValue - exceeded.targetValue;
  return {
    id: `insight-goal-achieved-${exceeded.id}`,
    type: "celebration",
    category: categoryNameForHabit(exceeded.habitId),
    priority: "low",
    confidence: 99,
    title: `¡Superaste "${exceeded.title}"!`,
    analysis: `Llegaste a ${exceeded.currentValue} ${exceeded.unit} contra una meta de ${exceeded.targetValue} ${exceeded.unit} — ${overBy} ${exceeded.unit} por encima de lo planeado.`,
    evidence: [{ label: "Resultado final", value: `${exceeded.currentValue} / ${exceeded.targetValue} ${exceeded.unit}` }],
    impact: { label: "sobre la meta planeada", value: Math.round((overBy / exceeded.targetValue) * 100), direction: "up", unit: "%" },
    expectedBenefit: "Reconocer tu esfuerzo mantiene la motivación alta.",
    action: { label: "Ver metas", kind: "view_details", href: "/goals" },
    analyzedAt: TODAY,
    habitId: exceeded.habitId,
  };
}

function generateGoalAtRiskInsight(): Insight | null {
  const risky = mockGoals
    .filter((goal) => goal.status === "active")
    .map((goal) => ({ goal, daysLeft: daysBetween(TODAY, goal.endDate), remaining: goal.targetValue - goal.currentValue }))
    .filter((entry) => entry.daysLeft >= 0 && entry.daysLeft <= 7 && entry.remaining > 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)[0];
  if (!risky) return null;

  return {
    id: `insight-goal-risk-${risky.goal.id}`,
    type: "risk",
    category: categoryNameForHabit(risky.goal.habitId),
    priority: risky.daysLeft <= 2 ? "critical" : "high",
    confidence: 90,
    title: `"${risky.goal.title}" se vence en ${risky.daysLeft} ${risky.daysLeft === 1 ? "día" : "días"}`,
    analysis: `Vas en ${risky.goal.currentValue} de ${risky.goal.targetValue} ${risky.goal.unit}. Te faltan ${risky.remaining} ${risky.goal.unit} y quedan ${risky.daysLeft} ${risky.daysLeft === 1 ? "día" : "días"} para el cierre.`,
    evidence: [
      { label: "Progreso actual", value: `${risky.goal.currentValue} / ${risky.goal.targetValue} ${risky.goal.unit}` },
      { label: "Tiempo restante", value: `${risky.daysLeft} ${risky.daysLeft === 1 ? "día" : "días"}` },
    ],
    expectedBenefit: "Cerrar la meta a tiempo.",
    action: { label: "Ver detalles", kind: "view_details", href: "/goals" },
    analyzedAt: TODAY,
    habitId: risky.goal.habitId,
  };
}

function generateStreakPredictionInsight(): Insight | null {
  const current = calculateCurrentAggregateStreak();
  const record = calculateBestAggregateStreak();
  if (current === 0 || current >= record) return null;

  const daysToRecord = record - current;
  return {
    id: "insight-streak-prediction",
    type: "prediction",
    category: "Rachas",
    priority: "medium",
    confidence: 78,
    title: `Podrías superar tu récord en ${daysToRecord} ${daysToRecord === 1 ? "día" : "días"}`,
    analysis: `Tu racha actual es de ${current} ${current === 1 ? "día" : "días"} y tu récord personal es de ${record}. Si mantienes el 80% de cumplimiento diario, alcanzarías un nuevo récord pronto.`,
    evidence: [
      { label: "Racha actual", value: `${current} ${current === 1 ? "día" : "días"}` },
      { label: "Récord personal", value: `${record} ${record === 1 ? "día" : "días"}` },
    ],
    expectedBenefit: "Un nuevo récord personal.",
    action: { label: "Ir al checklist", kind: "go_to_habit", href: "/checklist" },
    analyzedAt: TODAY,
  };
}

function generateWeakestHabitInsight(): Insight | null {
  const since = addDays(TODAY, -13);
  const rates = activeHabits
    .map((habit) => {
      const logs = getLogsForHabit(habit.id).filter(
        (log) => log.date >= since && log.date <= TODAY && log.status !== "not_applicable",
      );
      if (logs.length < 5) return null;
      const weighted = logs.reduce((sum, log) => {
        if (log.status === "completed") return sum + 1;
        if (log.status === "partial") return sum + 0.5;
        return sum;
      }, 0);
      return { habit, rate: Math.round((weighted / logs.length) * 100), sample: logs.length };
    })
    .filter((entry): entry is { habit: (typeof activeHabits)[number]; rate: number; sample: number } => entry !== null);
  if (rates.length === 0) return null;

  const weakest = rates.reduce((min, entry) => (entry.rate < min.rate ? entry : min));
  if (weakest.rate >= 70) return null;

  return {
    id: `insight-weakest-${weakest.habit.id}`,
    type: "reminder",
    category: categoryNameForHabit(weakest.habit.id),
    priority: weakest.rate < 50 ? "high" : "medium",
    confidence: confidenceFromSample(weakest.sample, 55),
    title: `"${weakest.habit.name}" necesita atención`,
    analysis: `En los últimos 14 días completaste "${weakest.habit.name}" solo el ${weakest.rate}% de las veces que estaba programado.`,
    evidence: [{ label: "Cumplimiento últimos 14 días", value: `${weakest.rate}%` }],
    expectedBenefit: "Recuperar la consistencia antes de que se vuelva un patrón.",
    action: { label: `Registrar ${weakest.habit.name}`, kind: "register", href: "/checklist" },
    secondaryActions: [{ label: "Ir al hábito", kind: "go_to_habit", href: "/habits" }],
    analyzedAt: TODAY,
    habitId: weakest.habit.id,
  };
}

function generateNextGoalInsight(excludeGoalId?: string): Insight | null {
  const next = mockGoals
    .filter((goal) => goal.status === "active" && goal.id !== excludeGoalId)
    .sort((a, b) => daysBetween(TODAY, a.endDate) - daysBetween(TODAY, b.endDate))[0];
  if (!next) return null;

  const progress = Math.round((next.currentValue / next.targetValue) * 100);
  const daysLeft = daysBetween(TODAY, next.endDate);

  return {
    id: `insight-next-goal-${next.id}`,
    type: "next_goal",
    category: categoryNameForHabit(next.habitId),
    priority: "informational",
    confidence: 85,
    title: `Tu próxima meta: "${next.title}"`,
    analysis: `Vas en ${progress}% de esta meta, con ${daysLeft} ${daysLeft === 1 ? "día" : "días"} restantes hasta el ${formatFullDate(next.endDate)}.`,
    evidence: [{ label: "Progreso", value: `${next.currentValue} / ${next.targetValue} ${next.unit} (${progress}%)` }],
    action: { label: "Ver metas", kind: "view_details", href: "/goals" },
    analyzedAt: TODAY,
    habitId: next.habitId,
  };
}

/**
 * Estima la probabilidad de completar el día con base en el cumplimiento
 * histórico real de ese mismo día de la semana (últimas 4 semanas). Si no
 * hay suficiente historial de ese día en particular, cae al promedio de los
 * últimos 14 días. Sigue siendo estadística real, no una predicción generativa.
 */
export function estimateTodaySuccessProbability(date: string = TODAY): number {
  const targetWeekday = new Date(`${date}T00:00:00`).getDay();
  const samples: number[] = [];

  for (let offset = 1; offset <= 28; offset += 1) {
    const pastDate = addDays(date, -offset);
    if (new Date(`${pastDate}T00:00:00`).getDay() !== targetWeekday) continue;
    samples.push(calculateDayCompletionPercentage(pastDate));
  }

  if (samples.length === 0) {
    const fallback = Array.from({ length: 14 }, (_, index) => calculateDayCompletionPercentage(addDays(date, -(index + 1))));
    return Math.round(fallback.reduce((sum, value) => sum + value, 0) / fallback.length);
  }

  return Math.round(samples.reduce((sum, value) => sum + value, 0) / samples.length);
}

const PRIORITY_RANK: Record<InsightPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  informational: 4,
};

export function getInsights(): Insight[] {
  const goalRisk = generateGoalAtRiskInsight();

  const insights = [
    generateStreakRiskInsight(),
    goalRisk,
    generateSleepCorrelationInsight(),
    generateWaterCorrelationInsight(),
    generateBestWeekdayInsight(),
    generateGoalAchievementInsight(),
    generateStreakPredictionInsight(),
    generateWeakestHabitInsight(),
    generateNextGoalInsight(goalRisk?.id.replace("insight-goal-risk-", "")),
  ].filter((insight): insight is Insight => insight !== null);

  return insights.sort((a, b) => {
    const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (rankDiff !== 0) return rankDiff;
    return b.confidence - a.confidence;
  });
}
