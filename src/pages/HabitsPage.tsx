import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ChevronDown, Flame, LayoutGrid, List, Plus, Repeat, Target } from "lucide-react";
import type { Habit, HabitLifecycleStatus } from "../types/habit";
import { useHabitsManager } from "../hooks/useHabitsManager";
import { calculateRecentCompletionRate } from "../utils/recentCompletion";
import {
  calculateAverageCompletion,
  calculateBestActiveStreak,
  calculateDailyCompletionTrend,
  calculateHabitCountTrend,
  countHabitsAtRisk,
} from "../utils/habitStats";
import { calculateCurrentStreak } from "../utils/streaks";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { HabitStatusTabs } from "../components/habits/HabitStatusTabs";
import { HabitFilters } from "../components/habits/HabitFilters";
import { KpiCard } from "../components/ui/KpiCard";
import { HabitCard } from "../components/habits/HabitCard";
import { HabitListRow } from "../components/habits/HabitListRow";
import { HabitFormModal } from "../components/habits/HabitFormModal";
import { DeleteHabitModal, type DeleteHabitOption } from "../components/habits/DeleteHabitModal";

type SortOption = "recent" | "name" | "completion" | "streak";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Más recientes" },
  { value: "name", label: "Nombre A-Z" },
  { value: "completion", label: "Mayor cumplimiento" },
  { value: "streak", label: "Racha más larga" },
];

export function HabitsPage() {
  const {
    habits,
    addHabit,
    updateHabit,
    isNameTaken,
    pauseHabit,
    reactivateHabit,
    archiveHabit,
    softDeleteHabit,
    restoreHabit,
    hardDeleteHabit,
  } = useHabitsManager();

  const [activeTab, setActiveTab] = useState<HabitLifecycleStatus>("active");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [sort, setSort] = useState<SortOption>("recent");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [formHabit, setFormHabit] = useState<Habit | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null);

  const counts = useMemo(
    () => ({
      active: habits.filter((h) => h.lifecycleStatus === "active").length,
      paused: habits.filter((h) => h.lifecycleStatus === "paused").length,
      archived: habits.filter((h) => h.lifecycleStatus === "archived").length,
      deleted: habits.filter((h) => h.lifecycleStatus === "deleted").length,
    }),
    [habits],
  );

  const kpis = useMemo(() => {
    const activeHabits = habits.filter((h) => h.lifecycleStatus === "active");
    return {
      total: habits.length,
      totalTrend: calculateHabitCountTrend(habits),
      bestStreak: calculateBestActiveStreak(habits),
      completionTrend: calculateDailyCompletionTrend(),
      averageCompletion: calculateAverageCompletion(habits),
      atRisk: countHabitsAtRisk(habits),
      activeCount: activeHabits.length,
    };
  }, [habits]);

  const visibleHabits = useMemo(() => {
    const filtered = habits.filter((habit) => {
      if (habit.lifecycleStatus !== activeTab) return false;
      if (search.trim() && !habit.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      if (categoryId !== "all" && !habit.categoryIds.includes(categoryId)) return false;
      return true;
    });

    const sorted = [...filtered];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "completion") sorted.sort((a, b) => calculateRecentCompletionRate(b.id) - calculateRecentCompletionRate(a.id));
    else if (sort === "streak") sorted.sort((a, b) => calculateCurrentStreak(b) - calculateCurrentStreak(a));
    else sorted.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return sorted;
  }, [habits, activeTab, search, categoryId, sort]);

  function handleFormSubmit(draft: Parameters<typeof addHabit>[0]) {
    if (formHabit && formHabit !== "new") {
      updateHabit(formHabit.id, draft);
    } else {
      addHabit(draft);
    }
  }

  function handleDeleteConfirm(option: DeleteHabitOption) {
    if (!deleteTarget) return;
    if (option === "archive") archiveHabit(deleteTarget.id);
    if (option === "delete_habit") softDeleteHabit(deleteTarget.id);
    if (option === "delete_habit_and_logs") hardDeleteHabit(deleteTarget.id);
  }

  const gridVariants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
  const cardVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Mis hábitos"
        description="Crea, edita y administra el ciclo de vida de tus hábitos."
        action={
          <Button leadingIcon={<Plus size={16} />} onClick={() => setFormHabit("new")}>
            Crear hábito
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<LayoutGrid size={18} aria-hidden="true" />}
          label="Total de hábitos"
          value={`${kpis.total}`}
          sublabel="Activos, pausados y más"
          trend={kpis.totalTrend}
          tone="primary"
          index={0}
        />
        <KpiCard
          icon={<Flame size={18} aria-hidden="true" />}
          label="Racha activa"
          value={`${kpis.bestStreak} ${kpis.bestStreak === 1 ? "día" : "días"}`}
          sublabel="¡Sigue así!"
          trend={kpis.completionTrend}
          tone="success"
          index={1}
        />
        <KpiCard
          icon={<Target size={18} aria-hidden="true" />}
          label="Cumplimiento promedio"
          value={`${kpis.averageCompletion}%`}
          sublabel="Últimos 14 días"
          trend={kpis.completionTrend}
          tone="info"
          index={2}
        />
        <KpiCard
          icon={<AlertTriangle size={18} aria-hidden="true" />}
          label="Hábitos en riesgo"
          value={`${kpis.atRisk}`}
          sublabel="Necesitan atención"
          trend={kpis.completionTrend.map((rate) => 100 - rate)}
          tone="danger"
          index={3}
        />
      </div>

      <HabitFilters search={search} onSearchChange={setSearch} categoryId={categoryId} onCategoryChange={setCategoryId} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <HabitStatusTabs value={activeTab} onChange={setActiveTab} counts={counts} />

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
              aria-label="Ordenar por"
              className="h-9 appearance-none rounded-lg border border-border bg-surface py-1.5 pl-3 pr-8 text-xs font-medium text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Ordenar por: {option.label}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
          </div>
          <div className="flex items-center rounded-lg border border-border p-0.5">
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
              aria-label="Vista de cuadrícula"
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${view === "grid" ? "bg-primary text-white shadow-glow" : "text-text-secondary hover:bg-surface-muted"}`}
            >
              <LayoutGrid size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              aria-label="Vista de lista"
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${view === "list" ? "bg-primary text-white shadow-glow" : "text-text-secondary hover:bg-surface-muted"}`}
            >
              <List size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {visibleHabits.length === 0 ? (
        <EmptyState
          icon={<Repeat size={22} aria-hidden="true" />}
          title="No hay hábitos en esta vista"
          description="Ajusta los filtros o crea un nuevo hábito para empezar a darle seguimiento."
          action={
            activeTab === "active" ? (
              <Button size="sm" leadingIcon={<Plus size={16} />} onClick={() => setFormHabit("new")}>
                Crear hábito
              </Button>
            ) : undefined
          }
        />
      ) : (
        <motion.div
          key={`${activeTab}-${view}`}
          className={view === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-3"}
          variants={gridVariants}
          initial="hidden"
          animate="show"
        >
          {visibleHabits.map((habit) => {
            const cardProps = {
              habit,
              recentCompletionRate: calculateRecentCompletionRate(habit.id),
              onEdit: () => setFormHabit(habit),
              onPause: activeTab === "active" ? () => pauseHabit(habit.id) : undefined,
              onReactivate:
                activeTab === "paused" || activeTab === "archived" ? () => reactivateHabit(habit.id) : undefined,
              onArchive: activeTab === "active" || activeTab === "paused" ? () => archiveHabit(habit.id) : undefined,
              onDelete: activeTab !== "deleted" ? () => setDeleteTarget(habit) : undefined,
              onRestore: activeTab === "deleted" ? () => restoreHabit(habit.id) : undefined,
              onHardDelete: activeTab === "deleted" ? () => hardDeleteHabit(habit.id) : undefined,
            };
            return (
              <motion.div key={habit.id} variants={cardVariants}>
                {view === "grid" ? <HabitCard {...cardProps} /> : <HabitListRow {...cardProps} />}
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <HabitFormModal
        isOpen={formHabit !== null}
        habit={formHabit && formHabit !== "new" ? formHabit : undefined}
        isNameTaken={isNameTaken}
        onClose={() => setFormHabit(null)}
        onSubmit={handleFormSubmit}
      />

      <DeleteHabitModal
        isOpen={deleteTarget !== null}
        habitName={deleteTarget?.name ?? ""}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
