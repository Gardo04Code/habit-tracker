import { useMemo, useState } from "react";
import type { HabitStatus } from "../types/habit";
import { mockHabitLogs } from "../data/mockHabitLogs";
import { activeHabits, archivedHabits, getHabitById, pausedHabits } from "../data/mockHabits";
import { TODAY } from "../data/referenceDate";
import { addDays, formatWeekdayLabel } from "../utils/formatDate";
import { calculateBestStreak, calculateCurrentStreak } from "../utils/streaks";

export type StatisticsPeriod = 7 | 30 | 90;

const WEEKDAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export const statisticsHabits = [...activeHabits, ...pausedHabits, ...archivedHabits];
const streakEligibleHabits = [...activeHabits, ...pausedHabits];

interface LogWithHabit {
  date: string;
  status: HabitStatus;
  habitId: string;
}

function dayRate(logs: LogWithHabit[]): number {
  const applicable = logs.filter((log) => log.status !== "not_applicable");
  if (applicable.length === 0) return 0;
  const weighted = applicable.reduce((sum, log) => {
    if (log.status === "completed") return sum + 1;
    if (log.status === "partial") return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((weighted / applicable.length) * 100);
}

function ratesInWindow(habitId: string, categoryId: string, days: number): number {
  const since = addDays(TODAY, -(days - 1));
  const logs = filterLogs(habitId, categoryId, since, TODAY);
  return dayRate(logs);
}

function filterLogs(habitId: string, categoryId: string, from: string, to: string): LogWithHabit[] {
  return mockHabitLogs
    .filter((log) => log.date >= from && log.date <= to)
    .filter((log) => habitId === "all" || log.habitId === habitId)
    .filter((log) => {
      if (categoryId === "all") return true;
      const habit = getHabitById(log.habitId);
      return habit?.categoryIds.includes(categoryId) ?? false;
    })
    .filter((log) => {
      const habit = getHabitById(log.habitId);
      return habit && habit.lifecycleStatus !== "deleted";
    });
}

export function useStatistics() {
  const [period, setPeriod] = useState<StatisticsPeriod>(30);
  const [habitId, setHabitId] = useState("all");
  const [categoryId, setCategoryId] = useState("all");

  const periodStart = addDays(TODAY, -(period - 1));
  const periodLogs = useMemo(
    () => filterLogs(habitId, categoryId, periodStart, TODAY),
    [habitId, categoryId, periodStart],
  );

  const dailyRates = useMemo(() => {
    return Array.from({ length: period }, (_, index) => {
      const date = addDays(periodStart, index);
      const logsForDay = periodLogs.filter((log) => log.date === date);
      return { date, label: formatWeekdayLabel(date), completionRate: dayRate(logsForDay) };
    });
  }, [period, periodStart, periodLogs]);

  const statusBreakdown = useMemo(() => {
    const statuses: HabitStatus[] = ["pending", "completed", "partial", "not_completed", "not_applicable"];
    return statuses.map((status) => ({
      status,
      count: periodLogs.filter((log) => log.status === status).length,
    }));
  }, [periodLogs]);

  const CONSISTENCY_WEEKS = 8;
  const consistency = useMemo(() => {
    const totalDays = CONSISTENCY_WEEKS * 7;
    // Alinea la ventana a semanas completas de lunes a domingo, terminando
    // en la semana que contiene a TODAY.
    const todayWeekday = (new Date(`${TODAY}T00:00:00`).getDay() + 6) % 7; // 0 = lunes
    const daysUntilWeekEnd = 6 - todayWeekday;
    const windowEnd = addDays(TODAY, daysUntilWeekEnd);

    return Array.from({ length: totalDays }, (_, index) => {
      const date = addDays(windowEnd, index - (totalDays - 1));
      const logsForDay = filterLogs(habitId, categoryId, date, date);
      return { date, completionRate: dayRate(logsForDay), hasData: logsForDay.length > 0 && date <= TODAY };
    });
  }, [habitId, categoryId]);

  const trend = useMemo(() => {
    const points = 8;
    if (dailyRates.length <= points) return dailyRates.map((point) => point.completionRate);
    return Array.from({ length: points }, (_, index) => {
      const bucketStart = Math.floor((index * dailyRates.length) / points);
      const bucketEnd = Math.max(bucketStart + 1, Math.floor(((index + 1) * dailyRates.length) / points));
      const bucket = dailyRates.slice(bucketStart, bucketEnd);
      return Math.round(bucket.reduce((sum, point) => sum + point.completionRate, 0) / bucket.length);
    });
  }, [dailyRates]);

  const habitComparison = useMemo(() => {
    if (habitId !== "all") return [];
    return statisticsHabits
      .filter((habit) => categoryId === "all" || habit.categoryIds.includes(categoryId))
      .map((habit) => {
        const logs = periodLogs.filter((log) => log.habitId === habit.id);
        return {
          habitId: habit.id,
          habitName: habit.name,
          color: habit.color,
          icon: habit.icon,
          completionRate: dayRate(logs),
        };
      })
      .sort((a, b) => b.completionRate - a.completionRate);
  }, [habitId, categoryId, periodLogs]);

  const bestAndWorstWeekday = useMemo(() => {
    const totals = Array.from({ length: 7 }, () => ({ weighted: 0, count: 0 }));
    periodLogs
      .filter((log) => log.status !== "not_applicable")
      .forEach((log) => {
        const weekday = new Date(`${log.date}T00:00:00`).getDay();
        totals[weekday].count += 1;
        if (log.status === "completed") totals[weekday].weighted += 1;
        if (log.status === "partial") totals[weekday].weighted += 0.5;
      });

    const rates = totals.map((entry, index) => ({
      weekday: WEEKDAY_NAMES[index],
      rate: entry.count > 0 ? Math.round((entry.weighted / entry.count) * 100) : null,
    }));

    const withData = rates.filter((entry) => entry.rate !== null) as { weekday: string; rate: number }[];
    if (withData.length === 0) return { best: null, worst: null };

    const best = withData.reduce((max, entry) => (entry.rate > max.rate ? entry : max));
    const worst = withData.reduce((min, entry) => (entry.rate < min.rate ? entry : min));
    return { best, worst };
  }, [periodLogs]);

  const streaks = useMemo(() => {
    const pool = habitId === "all" ? streakEligibleHabits : streakEligibleHabits.filter((habit) => habit.id === habitId);
    if (pool.length === 0) return { current: 0, best: 0 };

    const current = Math.max(...pool.map((habit) => calculateCurrentStreak(habit)));
    const best = Math.max(...pool.map((habit) => calculateBestStreak(habit)));
    return { current, best };
  }, [habitId]);

  const kpis = {
    daily: ratesInWindow(habitId, categoryId, 1),
    weekly: ratesInWindow(habitId, categoryId, 7),
    monthly: ratesInWindow(habitId, categoryId, 30),
    bestWeekday: bestAndWorstWeekday.best,
    worstWeekday: bestAndWorstWeekday.worst,
    currentStreak: streaks.current,
    bestStreak: streaks.best,
  };

  const selectedHabit = habitId === "all" ? undefined : getHabitById(habitId);
  const habitLogCount = habitId === "all" ? periodLogs.length : mockHabitLogs.filter((log) => log.habitId === habitId).length;

  return {
    period,
    habitId,
    categoryId,
    setPeriod,
    setHabitId,
    setCategoryId,
    dailyRates,
    trend,
    statusBreakdown,
    consistency,
    habitComparison,
    kpis,
    isPeriodEmpty: periodLogs.length === 0,
    hasInsufficientHistory: Boolean(selectedHabit) && habitLogCount < 5,
  };
}
