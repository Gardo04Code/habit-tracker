import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CalendarDays, CheckCircle2, Sparkles, Target } from "lucide-react";
import { activeHabits } from "../data/mockHabits";
import { mockDashboard } from "../data/mockDashboard";
import { getInsights } from "../utils/insightsEngine";
import { mockUser } from "../data/mockUser";
import { TODAY } from "../data/referenceDate";
import { formatFullDate } from "../utils/formatDate";
import { Card } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { HeroMetric } from "../components/dashboard/HeroMetric";
import { MetricCard } from "../components/dashboard/MetricCard";
import { TodaySummary } from "../components/dashboard/TodaySummary";
import { WeeklyProgressChart } from "../components/dashboard/WeeklyProgressChart";
import { WeeklyInsightBanner } from "../components/dashboard/WeeklyInsightBanner";
import { ProgressDonut } from "../components/dashboard/ProgressDonut";
import { StreakTimeline } from "../components/dashboard/StreakTimeline";
import { HabitStrengthList } from "../components/dashboard/HabitStrengthList";
import { InsightCard } from "../components/dashboard/InsightCard";

export function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const insights = useMemo(() => getInsights(), []);
  const [dismissedInsightIds, setDismissedInsightIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const timeout = setTimeout(() => setIsLoading(false), 550);
    return () => clearTimeout(timeout);
  }, []);

  const visibleInsights = insights.filter((insight) => !dismissedInsightIds.has(insight.id));

  function dismissInsight(id: string) {
    setDismissedInsightIds((current) => new Set(current).add(id));
  }

  if (activeHabits.length === 0) {
    return (
      <EmptyState
        icon={<Target size={22} aria-hidden="true" />}
        title="Todavía no tienes hábitos activos"
        description="Crea tu primer hábito para empezar a ver tu progreso en el Dashboard."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-text-primary sm:text-2xl">
          Hola, {mockUser.name.split(" ")[0]}
        </h1>
        <p className="flex items-center gap-1.5 text-sm text-text-secondary capitalize">
          <CalendarDays size={14} aria-hidden="true" />
          {formatFullDate(TODAY)}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Skeleton className="h-44 sm:col-span-2 lg:col-span-2" />
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2 lg:col-span-2">
            <HeroMetric streak={mockDashboard.currentStreak} bestStreak={mockDashboard.bestStreakThisMonth} />
          </div>
          <MetricCard
            icon={<CheckCircle2 size={18} aria-hidden="true" />}
            label="Cumplimiento semanal"
            value={`${mockDashboard.weeklyCompletionRate}%`}
            trendValue={mockDashboard.weeklyCompletionTrend}
            trendLabel="% vs. semana anterior"
            tone="primary"
          />
          <MetricCard
            icon={<Sparkles size={18} aria-hidden="true" />}
            label="Hábitos completados hoy"
            value={`${mockDashboard.habitsCompletedToday} de ${mockDashboard.totalHabitsToday}`}
            tone="success"
          />
          <MetricCard
            icon={<Target size={18} aria-hidden="true" />}
            label="Meta mensual"
            value={`${mockDashboard.monthlyGoalProgress}% de ${mockDashboard.monthlyGoalTarget}%`}
            tone="primary"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card>
            <SectionHeader title="Resumen de hoy" description="Estado de tus hábitos activos para hoy." />
            <div className="mt-4">
              <TodaySummary />
            </div>
          </Card>
          <Card>
            <SectionHeader title="Progreso semanal" description="Cumplimiento diario de los últimos 7 días." />
            <div className="mt-4">
              <WeeklyProgressChart data={mockDashboard.weeklyProgress} goal={mockDashboard.monthlyGoalTarget} />
            </div>
            <div className="mt-2">
              <WeeklyInsightBanner trend={mockDashboard.weeklyCompletionTrend} />
            </div>
          </Card>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card>
              <SectionHeader title="Hábitos más fuertes" description="Mayor cumplimiento reciente." />
              <div className="mt-4">
                <HabitStrengthList entries={mockDashboard.strongestHabits} variant="strong" />
              </div>
            </Card>
            <Card>
              <SectionHeader title="Hábitos por mejorar" description="Necesitan más atención esta semana." />
              <div className="mt-4">
                <HabitStrengthList entries={mockDashboard.weakestHabits} variant="weak" />
              </div>
            </Card>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <SectionHeader title="Distribución de estados" description="Registros de la semana por estado." />
            <div className="mt-4">
              <ProgressDonut data={mockDashboard.statusBreakdown} />
            </div>
          </Card>
          <Card>
            <SectionHeader title="Constancia" description="Tu racha de los últimos 5 días." />
            <div className="mt-4">
              <StreakTimeline />
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <SectionHeader
          title="Centro de Inteligencia"
          description="Análisis continuo de tus hábitos, generado por tu asistente de IA."
        />
        <div className="mt-4">
          <AnimatePresence initial={false} mode="popLayout">
            {visibleInsights.length > 0 ? (
              <div className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-1 lg:gap-3">
                {visibleInsights.map((insight, index) => (
                  <InsightCard key={insight.id} insight={insight} index={index} onDismiss={dismissInsight} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Sparkles size={20} aria-hidden="true" />}
                title="No hay insights pendientes"
                description="Tu asistente de IA seguirá analizando tus hábitos y avisará cuando encuentre algo relevante."
              />
            )}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}
