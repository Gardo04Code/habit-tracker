import { BarChart3 } from "lucide-react";
import { useStatistics } from "../hooks/useStatistics";
import { downloadStatisticsCsv } from "../utils/exportStatistics";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { StatisticsFilters } from "../components/statistics/StatisticsFilters";
import { StatisticsKpis } from "../components/statistics/StatisticsKpis";
import { EvolutionLineChart } from "../components/statistics/EvolutionLineChart";
import { HabitComparisonChart } from "../components/statistics/HabitComparisonChart";
import { ConsistencyMap } from "../components/statistics/ConsistencyMap";
import { WeeklyProgressChart } from "../components/dashboard/WeeklyProgressChart";
import { ProgressDonut } from "../components/dashboard/ProgressDonut";

export function StatisticsPage() {
  const {
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
    isPeriodEmpty,
    hasInsufficientHistory,
    habitOptions,
    categoryOptions,
    loading,
    error,
  } = useStatistics();

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        icon={<BarChart3 size={20} aria-hidden="true" />}
        title="Estadísticas"
        description="Analiza tu comportamiento y descubre patrones para seguir mejorando."
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <StatisticsFilters
        period={period}
        habitId={habitId}
        categoryId={categoryId}
        habitOptions={habitOptions}
        categoryOptions={categoryOptions}
        onPeriodChange={setPeriod}
        onHabitChange={setHabitId}
        onCategoryChange={setCategoryId}
        onExport={() => downloadStatisticsCsv(dailyRates, period)}
      />

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      ) : hasInsufficientHistory ? (
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
          <StatisticsKpis kpis={kpis} trend={trend} />

          <Card>
            <SectionHeader title="Evolución de hábitos" description="Cumplimiento diario a lo largo del periodo seleccionado." />
            <div className="mt-4">
              <EvolutionLineChart data={dailyRates} />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <SectionHeader title="Cumplimiento por día" description="Barras de los últimos 14 días." />
              <div className="mt-4">
                <WeeklyProgressChart data={dailyRates.slice(-14)} />
              </div>
            </Card>
            <Card>
              <SectionHeader title="Distribución de estados" description="Registros del periodo por estado." />
              <div className="mt-4">
                <ProgressDonut data={statusBreakdown.filter((entry) => entry.count > 0)} />
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
            <SectionHeader title="Mapa de consistencia" description="Últimas 8 semanas, independiente del periodo." />
            <div className="mt-4">
              <ConsistencyMap days={consistency} />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
