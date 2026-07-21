import { BarChart3 } from "lucide-react";
import { useStatistics } from "../hooks/useStatistics";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { StatisticsFilters } from "../components/statistics/StatisticsFilters";
import { StatisticsKpis } from "../components/statistics/StatisticsKpis";
import { EvolutionLineChart } from "../components/statistics/EvolutionLineChart";
import { HabitComparisonChart } from "../components/statistics/HabitComparisonChart";
import { WeeklyProgressChart } from "../components/dashboard/WeeklyProgressChart";
import { ProgressDonut } from "../components/dashboard/ProgressDonut";
import { ConsistencyCalendar } from "../components/dashboard/ConsistencyCalendar";

export function StatisticsPage() {
  const {
    period,
    habitId,
    categoryId,
    setPeriod,
    setHabitId,
    setCategoryId,
    dailyRates,
    statusBreakdown,
    consistency,
    habitComparison,
    kpis,
    isPeriodEmpty,
    hasInsufficientHistory,
  } = useStatistics();

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Estadísticas" description="Analiza tu comportamiento histórico y tus tendencias." />

      <StatisticsFilters
        period={period}
        habitId={habitId}
        categoryId={categoryId}
        onPeriodChange={setPeriod}
        onHabitChange={setHabitId}
        onCategoryChange={setCategoryId}
      />

      {hasInsufficientHistory ? (
        <EmptyState
          icon={<BarChart3 size={22} aria-hidden="true" />}
          title="Este hábito todavía no tiene historial suficiente"
          description="Registra más días en el Checklist para poder mostrar estadísticas confiables."
        />
      ) : isPeriodEmpty ? (
        <EmptyState
          icon={<BarChart3 size={22} aria-hidden="true" />}
          title="No hay datos en este periodo"
          description="Prueba con un periodo más amplio o cambia los filtros de hábito y categoría."
        />
      ) : (
        <>
          <StatisticsKpis kpis={kpis} />

          <Card>
            <SectionHeader title="Línea de evolución" description="Cumplimiento diario a lo largo del periodo seleccionado." />
            <div className="mt-4">
              <EvolutionLineChart data={dailyRates} />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <SectionHeader title="Cumplimiento por día" description="Barras diarias del periodo seleccionado." />
              <div className="mt-4">
                <WeeklyProgressChart data={dailyRates} />
              </div>
            </Card>
            <Card>
              <SectionHeader title="Distribución de estados" description="Registros del periodo por estado." />
              <div className="mt-4">
                <ProgressDonut data={statusBreakdown} />
              </div>
            </Card>
          </div>

          <Card>
            <SectionHeader title="Comparación entre hábitos" description="Cumplimiento del periodo por hábito." />
            <div className="mt-4">
              <HabitComparisonChart data={habitComparison} />
            </div>
          </Card>

          <Card>
            <SectionHeader title="Heatmap de consistencia" description="Últimas 5 semanas, independiente del periodo." />
            <div className="mt-4">
              <ConsistencyCalendar days={consistency} />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
