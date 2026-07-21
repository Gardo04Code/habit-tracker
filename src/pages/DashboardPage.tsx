import { useState } from "react";
import { CalendarDays, CheckCircle2, Flame, Sparkles, Target } from "lucide-react";
import { activeHabits } from "../data/mockHabits";
import { mockDashboard } from "../data/mockDashboard";
import { mockRecommendations } from "../data/mockRecommendations";
import { mockUser } from "../data/mockUser";
import { TODAY } from "../data/referenceDate";
import { formatFullDate } from "../utils/formatDate";
import { Card } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { MetricCard } from "../components/dashboard/MetricCard";
import { TodaySummary } from "../components/dashboard/TodaySummary";
import { WeeklyProgressChart } from "../components/dashboard/WeeklyProgressChart";
import { ProgressDonut } from "../components/dashboard/ProgressDonut";
import { ConsistencyCalendar } from "../components/dashboard/ConsistencyCalendar";
import { HabitStrengthList } from "../components/dashboard/HabitStrengthList";
import { RecommendationCard } from "../components/dashboard/RecommendationCard";

export function DashboardPage() {
  const [visibleRecommendationIds, setVisibleRecommendationIds] = useState(
    () => new Set(mockRecommendations.map((recommendation) => recommendation.id)),
  );

  const visibleRecommendations = mockRecommendations.filter((recommendation) =>
    visibleRecommendationIds.has(recommendation.id),
  );

  function dismissRecommendation(id: string) {
    setVisibleRecommendationIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
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
        <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">
          Hola, {mockUser.name.split(" ")[0]}
        </h1>
        <p className="flex items-center gap-1.5 text-sm text-text-secondary capitalize">
          <CalendarDays size={14} aria-hidden="true" />
          {formatFullDate(TODAY)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<CheckCircle2 size={18} aria-hidden="true" />}
          label="Cumplimiento semanal"
          value={`${mockDashboard.weeklyCompletionRate}%`}
          trendValue={mockDashboard.weeklyCompletionTrend}
          trendLabel="% vs. semana anterior"
          tone="primary"
        />
        <MetricCard
          icon={<Flame size={18} aria-hidden="true" />}
          label="Racha actual"
          value={`${mockDashboard.currentStreak} días`}
          helpText={`Mejor racha del mes: ${mockDashboard.bestStreakThisMonth} días`}
          tone="streak"
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
          tone="purple"
        />
      </div>

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
              <WeeklyProgressChart data={mockDashboard.weeklyProgress} />
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <SectionHeader title="Distribución de estados" description="Registros de la semana por estado." />
            <div className="mt-4">
              <ProgressDonut data={mockDashboard.statusBreakdown} />
            </div>
          </Card>
          <Card>
            <SectionHeader title="Constancia" description="Últimas 5 semanas." />
            <div className="mt-4">
              <ConsistencyCalendar days={mockDashboard.consistency} />
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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

      <Card>
        <SectionHeader title="Recomendaciones" description="Sugerencias basadas en tus patrones recientes." />
        <div className="mt-4 flex flex-col gap-3">
          {visibleRecommendations.length > 0 ? (
            visibleRecommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                onDismiss={dismissRecommendation}
              />
            ))
          ) : (
            <EmptyState
              icon={<Sparkles size={20} aria-hidden="true" />}
              title="No hay recomendaciones pendientes"
              description="Vuelve más tarde para ver nuevas sugerencias basadas en tu actividad."
            />
          )}
        </div>
      </Card>
    </div>
  );
}
