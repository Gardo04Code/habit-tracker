import { useCallback, useEffect, useMemo, useState } from "react";
import type { Habit, HabitStatus } from "../types/habit";
import type { HabitSchedule } from "../types/entities";
import { activeHabits as mockActiveHabits } from "../data/mockHabits";
import { getLogForHabitOnDate } from "../data/mockHabitLogs";
import { TODAY } from "../data/referenceDate";
import { addDays, toDateOnly } from "../utils/formatDate";
import { isHabitScheduledForDate, isHabitScheduledUsingHistory } from "../utils/habitSchedule";
import { isLogEditable } from "../utils/dateRestrictions";
import { deriveStatusFromDeadline, deriveStatusFromValue } from "../utils/deriveHabitStatus";
import { isSupabaseDataSource } from "../lib/dataSource";
import { useHabits } from "./useHabits";
import { habitLogsService, type HabitLog } from "../services/habitLogs.service";
import { habitSchedulesService } from "../services/habitSchedules.service";
import { AppError, normalizeSupabaseError } from "../lib/errors";

function groupSchedulesByHabit(rows: HabitSchedule[]): Map<string, HabitSchedule[]> {
  const map = new Map<string, HabitSchedule[]>();
  for (const row of rows) {
    const list = map.get(row.habit_id);
    if (list) list.push(row);
    else map.set(row.habit_id, [row]);
  }
  return map;
}

export interface ChecklistEntry {
  habit: Habit;
  status: HabitStatus;
  value?: number;
  recordedTime?: string;
  note?: string;
  isReadOnly: boolean;
}

interface LogOverride {
  status: HabitStatus;
  value?: number;
  recordedTime?: string;
  note?: string;
}

export type StatusFilterValue = "all" | HabitStatus;

function overrideKey(habitId: string, date: string): string {
  return `${habitId}|${date}`;
}

function errorMessage(caught: unknown): string {
  if (caught instanceof AppError) return caught.friendlyMessage;
  return caught instanceof Error ? caught.message : "Ocurrió un error inesperado. Intenta de nuevo.";
}

// Ventana real de 7 días tal como la implementa enforce_habit_log_edit_
// window_trg (D-06): hoy y los 6 días naturales anteriores, ambos
// inclusive. Deliberadamente NO se reutiliza dateRestrictions.ts
// (isLogEditable/EDITABLE_WINDOW_DAYS) para el modo Supabase: esa utilidad
// es de la era mock y permite 8 días distintos (<=7 de diferencia), no 7 —
// un desajuste preexistente ajeno a esta tarea, documentado en MDs/12 en
// vez de "corregido" silenciosamente aquí (tocar dateRestrictions.ts
// afectaría también al modo mock, fuera de alcance). El modo mock sigue
// usando exactamente isLogEditable/TODAY sin ningún cambio.
function isWithinRealEditWindow(date: string, today: string): boolean {
  if (date > today) return false;
  return date >= addDays(today, -6);
}

/**
 * Alterna entre datos mock (comportamiento IDÉNTICO al de antes de esta
 * tarea, sin ningún cambio) y habit_logs reales de Supabase, según
 * VITE_DATA_SOURCE. DailyChecklistPage y HabitMissionCard no cambian: este
 * hook sigue devolviendo exactamente la misma forma pública.
 */
export function useDailyChecklist(initialDate: string = TODAY) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");

  // ---- Solo modo mock ----
  const [overrides, setOverrides] = useState<Record<string, LogOverride>>({});

  // ---- Solo modo Supabase ----
  // useHabits() ya alterna mock/Supabase internamente; en modo mock esta
  // llamada no se usa más abajo (se sigue usando mockActiveHabits/
  // getLogForHabitOnDate tal cual, sin cambios), pero debe invocarse
  // incondicionalmente (reglas de hooks).
  const { habits: allHabits } = useHabits();
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(isSupabaseDataSource);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingHabitIds, setSavingHabitIds] = useState<Set<string>>(new Set());

  const todayReference = isSupabaseDataSource ? toDateOnly(new Date()) : TODAY;

  const isReadOnly = isSupabaseDataSource
    ? selectedDate > todayReference || !isWithinRealEditWindow(selectedDate, todayReference)
    : selectedDate > TODAY || !isLogEditable(selectedDate, TODAY);

  const refreshLogs = useCallback(async () => {
    if (!isSupabaseDataSource) return;
    try {
      const rows = await habitLogsService.getHabitLogsForDate(selectedDate);
      setLogs(rows);
      setLogsError(null);
    } catch (caught) {
      setLogsError(normalizeSupabaseError(caught).friendlyMessage);
    }
  }, [selectedDate]);

  // El loading se activa en los cambios de fecha (changeDate, más abajo),
  // no aquí de forma síncrona — evita "react-hooks/set-state-in-effect"
  // (mismo motivo ya documentado en useCategories.ts/useHabits.ts). El
  // primer montaje ya nace con logsLoading=true cuando isSupabaseDataSource.
  useEffect(() => {
    if (!isSupabaseDataSource) return;
    let cancelled = false;

    habitLogsService
      .getHabitLogsForDate(selectedDate)
      .then((rows) => {
        if (!cancelled) {
          setLogs(rows);
          setLogsError(null);
        }
      })
      .catch((caught) => {
        if (!cancelled) setLogsError(normalizeSupabaseError(caught).friendlyMessage);
      })
      .finally(() => {
        if (!cancelled) setLogsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  function changeDate(next: string) {
    if (isSupabaseDataSource) setLogsLoading(true);
    setSelectedDate(next);
  }

  const activeHabits = useMemo(
    () => allHabits.filter((habit) => habit.lifecycleStatus === "active"),
    [allHabits],
  );

  // ---- Corrección de BUG-004 (solo modo Supabase) ----
  // Historial COMPLETO de habit_schedules de los hábitos activos, en UNA
  // sola consulta en lote (habitSchedulesService.getHabitScheduleHistories,
  // nunca una petición por hábito) — permite resolver qué versión regía en
  // `selectedDate`, en vez de asumir la vigente hoy (isHabitScheduledForDate
  // original). El modo mock no usa nada de esto: nunca tuvo versionado real
  // de schedules, isHabitScheduledForDate se mantiene sin cambios ahí.
  const activeHabitIds = useMemo(() => activeHabits.map((habit) => habit.id), [activeHabits]);
  const [scheduleHistories, setScheduleHistories] = useState<Map<string, HabitSchedule[]>>(new Map());
  const [schedulesLoading, setSchedulesLoading] = useState(isSupabaseDataSource);
  const [schedulesError, setSchedulesError] = useState<string | null>(null);

  const refreshScheduleHistories = useCallback(async () => {
    if (!isSupabaseDataSource) return;
    try {
      const rows = await habitSchedulesService.getHabitScheduleHistories(activeHabitIds);
      setScheduleHistories(groupSchedulesByHabit(rows));
      setSchedulesError(null);
    } catch (caught) {
      setSchedulesError(normalizeSupabaseError(caught).friendlyMessage);
    }
  }, [activeHabitIds]);

  // Mismo motivo que el resto de los efectos de este archivo: no se llama a
  // refreshScheduleHistories() aquí de forma síncrona ("react-hooks/set-
  // state-in-effect"); `schedulesLoading` ya nace en `true` cuando
  // isSupabaseDataSource. Depende de `activeHabitIds` (no de `activeHabits`
  // directamente) para no repetir la consulta si la identidad del arreglo
  // cambia pero el conjunto de ids sigue siendo el mismo.
  useEffect(() => {
    if (!isSupabaseDataSource) return;
    let cancelled = false;

    habitSchedulesService
      .getHabitScheduleHistories(activeHabitIds)
      .then((rows) => {
        if (!cancelled) {
          setScheduleHistories(groupSchedulesByHabit(rows));
          setSchedulesError(null);
        }
      })
      .catch((caught) => {
        if (!cancelled) setSchedulesError(normalizeSupabaseError(caught).friendlyMessage);
      })
      .finally(() => {
        if (!cancelled) setSchedulesLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // activeHabitIds ya está memoizado sobre [activeHabits] (a su vez sobre
    // [allHabits]) — mantiene la misma identidad de arreglo entre renders
    // mientras el conjunto de hábitos activos no cambie, así que depender
    // de él directamente no repite la consulta en cada render (mismo
    // patrón de estabilidad que el resto del archivo).
  }, [activeHabitIds]);

  const allEntries = useMemo<ChecklistEntry[]>(() => {
    if (!isSupabaseDataSource) {
      return mockActiveHabits
        .filter((habit) => isHabitScheduledForDate(habit, selectedDate))
        .map((habit) => {
          const baseLog = getLogForHabitOnDate(habit.id, selectedDate);
          const override = overrides[overrideKey(habit.id, selectedDate)];

          return {
            habit,
            status: override?.status ?? baseLog?.status ?? "pending",
            value: override?.value ?? baseLog?.value,
            recordedTime: override?.recordedTime ?? baseLog?.recordedTime,
            note: override?.note ?? baseLog?.note,
            isReadOnly,
          };
        });
    }

    return activeHabits
      .filter((habit) => isHabitScheduledUsingHistory(habit, scheduleHistories.get(habit.id) ?? [], selectedDate))
      .map((habit) => {
        const log = logs.find((l) => l.habit_id === habit.id);

        return {
          habit,
          status: log?.status ?? "pending",
          value: log?.value ?? undefined,
          recordedTime: log?.recorded_time ?? undefined,
          note: log?.note ?? undefined,
          isReadOnly,
        };
      });
  }, [selectedDate, overrides, isReadOnly, activeHabits, logs, scheduleHistories]);

  const filteredEntries = useMemo(() => {
    if (statusFilter === "all") return allEntries;
    return allEntries.filter((entry) => entry.status === statusFilter);
  }, [allEntries, statusFilter]);

  // ---- Escritura: modo mock (comportamiento sin cambios) ----

  function applyOverride(habitId: string, patch: Partial<LogOverride>) {
    const key = overrideKey(habitId, selectedDate);
    setOverrides((current) => ({
      ...current,
      [key]: { ...current[key], status: current[key]?.status ?? "pending", ...patch },
    }));
  }

  // ---- Escritura: modo Supabase (crea si no existe, actualiza si ya
  // existe — nunca INSERT si ya hay fila, nunca duplica) ----

  function currentEntryFor(habit: Habit): LogOverride {
    const log = logs.find((l) => l.habit_id === habit.id);
    return {
      status: log?.status ?? "pending",
      value: log?.value ?? undefined,
      recordedTime: log?.recorded_time ?? undefined,
      note: log?.note ?? undefined,
    };
  }

  async function saveEntry(habit: Habit, patch: Partial<LogOverride>) {
    if (isReadOnly) {
      setActionError(
        "Este día no se puede editar: es una fecha futura o pasaron más de 7 días desde entonces.",
      );
      return;
    }

    const merged = { ...currentEntryFor(habit), ...patch };
    const existing = logs.find((l) => l.habit_id === habit.id);

    setSavingHabitIds((current) => new Set(current).add(habit.id));
    setActionError(null);

    try {
      if (existing) {
        await habitLogsService.updateHabitLog(existing.id, {
          status: merged.status,
          value: merged.value ?? null,
          recordedTime: merged.recordedTime ?? null,
          note: merged.note ?? null,
        });
      } else {
        await habitLogsService.createHabitLog({
          habitId: habit.id,
          date: selectedDate,
          status: merged.status,
          value: merged.value ?? null,
          recordedTime: merged.recordedTime ?? null,
          note: merged.note ?? null,
        });
      }
      await refreshLogs();
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setSavingHabitIds((current) => {
        const next = new Set(current);
        next.delete(habit.id);
        return next;
      });
    }
  }

  async function removeEntry(habit: Habit) {
    const existing = logs.find((l) => l.habit_id === habit.id);
    if (!existing) return;

    if (isReadOnly) {
      setActionError(
        "Este día no se puede editar: es una fecha futura o pasaron más de 7 días desde entonces.",
      );
      return;
    }

    setSavingHabitIds((current) => new Set(current).add(habit.id));
    setActionError(null);

    try {
      await habitLogsService.deleteHabitLog(existing.id);
      await refreshLogs();
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setSavingHabitIds((current) => {
        const next = new Set(current);
        next.delete(habit.id);
        return next;
      });
    }
  }

  // ---- API pública (idéntica en ambos modos) ----

  function setBooleanStatus(habit: Habit, status: "completed" | "not_completed") {
    if (!isSupabaseDataSource) {
      applyOverride(habit.id, { status, value: undefined });
      return;
    }
    void saveEntry(habit, { status, value: undefined });
  }

  function setValue(habit: Habit, rawValue: number) {
    const status = deriveStatusFromValue(habit.targetValue, habit.allowPartial, rawValue);
    if (!isSupabaseDataSource) {
      applyOverride(habit.id, { status, value: rawValue });
      return;
    }
    void saveEntry(habit, { status, value: rawValue });
  }

  function setRecordedTime(habit: Habit, recordedTime: string) {
    const status = habit.deadlineTime
      ? deriveStatusFromDeadline(habit.deadlineTime, recordedTime, habit.allowPartial)
      : "completed";
    if (!isSupabaseDataSource) {
      applyOverride(habit.id, { status, recordedTime });
      return;
    }
    void saveEntry(habit, { status, recordedTime });
  }

  function markNotApplicable(habit: Habit) {
    if (!isSupabaseDataSource) {
      applyOverride(habit.id, { status: "not_applicable", value: undefined });
      return;
    }
    void saveEntry(habit, { status: "not_applicable", value: undefined });
  }

  function resetEntry(habit: Habit) {
    if (!isSupabaseDataSource) {
      const key = overrideKey(habit.id, selectedDate);
      setOverrides((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      return;
    }
    // En modo Supabase, "Pendiente" es la AUSENCIA de fila (regla explícita
    // de esta tarea) — reiniciar borra el habit_log en vez de "revertir un
    // override local", ya que aquí no existe una capa de override separada
    // del dato guardado.
    void removeEntry(habit);
  }

  function setNote(habit: Habit, note: string) {
    if (!isSupabaseDataSource) {
      const key = overrideKey(habit.id, selectedDate);
      const current = overrides[key];
      applyOverride(habit.id, {
        status: current?.status ?? allEntries.find((e) => e.habit.id === habit.id)?.status ?? "pending",
        note,
      });
      return;
    }
    void saveEntry(habit, { note });
  }

  return {
    selectedDate,
    goToPreviousDay: () => changeDate(addDays(selectedDate, -1)),
    goToNextDay: () => changeDate(addDays(selectedDate, 1)),
    goToToday: () => changeDate(todayReference),
    statusFilter,
    setStatusFilter,
    allEntries,
    filteredEntries,
    isReadOnly,
    setBooleanStatus,
    setValue,
    setRecordedTime,
    markNotApplicable,
    resetEntry,
    setNote,
    // Estados nuevos, solo relevantes/activos en modo Supabase (en modo
    // mock quedan siempre en sus valores neutros: loading=false, sin
    // errores, ningún hábito "guardando"). `loading`/`error`/`refresh`
    // ahora también incorporan el historial de schedules (corrección de
    // BUG-004) sin agregar campos nuevos al contrato público del hook.
    loading: logsLoading || schedulesLoading,
    error: logsError ?? schedulesError,
    actionError,
    isSaving: (habitId: string) => savingHabitIds.has(habitId),
    refresh: async () => {
      await Promise.all([refreshLogs(), refreshScheduleHistories()]);
    },
  };
}
