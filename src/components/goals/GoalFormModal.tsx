import { useMemo, useState, type FormEvent } from "react";
import type { Goal } from "../../types/goal";
import { getFormDefaultDate } from "../../data/referenceDate";
import { addDays } from "../../utils/formatDate";
import { isSupabaseDataSource } from "../../lib/dataSource";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { TextArea } from "../ui/TextArea";
import { Select } from "../ui/Select";

// Únicos goal_type de hábito con fórmula de progreso automático aprobada
// hoy (compute_goal_habit_logs_progress, 20260731004632_goal_progress_source.sql)
// — el mismo criterio que aplica goals.service.ts, replicado aquí solo
// para dar retroalimentación inmediata; el servidor sigue siendo la
// autoridad final.
const SUPPORTED_GOAL_TYPES = new Set(["quantity", "duration", "repetitions"]);

export interface GoalHabitOption {
  id: string;
  name: string;
  goalType: string;
  unit?: string;
}

// Forma que emite el formulario al guardar. GoalsPage decide si esto se
// traduce en un createGoal() (meta nueva) o en updateGoal() +,
// opcionalmente, updateManualGoalProgress() (edición) — este componente no
// llama a ningún servicio directamente.
export interface GoalFormSubmission {
  title: string;
  description?: string;
  targetValue: number;
  unit: string;
  startDate: string;
  endDate: string;
  progressSource: "manual" | "habit_logs";
  habitId?: string;
  currentValue?: number;
}

interface GoalFormModalProps {
  isOpen: boolean;
  goal?: Goal;
  habitOptions: GoalHabitOption[];
  onClose: () => void;
  onSubmit: (draft: GoalFormSubmission) => void;
  isSaving?: boolean;
}

interface FormState {
  title: string;
  description: string;
  habitId: string;
  targetValue: string;
  currentValue: string;
  unit: string;
  startDate: string;
  endDate: string;
}

function toFormState(goal?: Goal): FormState {
  return {
    title: goal?.title ?? "",
    description: goal?.description ?? "",
    habitId: goal?.habitId ?? "general",
    targetValue: goal?.targetValue.toString() ?? "",
    currentValue: goal?.currentValue.toString() ?? "0",
    unit: goal?.unit ?? "",
    startDate: goal?.startDate ?? getFormDefaultDate(),
    endDate: goal?.endDate ?? addDays(getFormDefaultDate(), 30),
  };
}

export function GoalFormModal({ isOpen, goal, habitOptions, onClose, onSubmit, isSaving }: GoalFormModalProps) {
  if (!isOpen) return null;

  return (
    <GoalFormModalContent
      goal={goal}
      habitOptions={habitOptions}
      onClose={onClose}
      onSubmit={onSubmit}
      isSaving={isSaving}
    />
  );
}

interface GoalFormModalContentProps {
  goal?: Goal;
  habitOptions: GoalHabitOption[];
  onClose: () => void;
  onSubmit: (draft: GoalFormSubmission) => void;
  isSaving?: boolean;
}

function GoalFormModalContent({ goal, habitOptions, onClose, onSubmit, isSaving }: GoalFormModalContentProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(goal));
  const [errors, setErrors] = useState<Record<string, string>>({});

  // progress_source es inmutable tras crear la meta (protect_goal_progress_
  // source_trg) — en edición de una meta real (progressSource conocido), el
  // selector "Asociada a" solo puede ofrecer opciones compatibles con el
  // origen ya fijado: una meta manual no puede pasar a vincularse a un
  // hábito, y una meta habit_logs no puede quedar sin hábito.
  const isEditingRealGoal = Boolean(goal && goal.progressSource);
  const lockedToGeneral = isEditingRealGoal && goal?.progressSource === "manual";
  const lockedToHabit = isEditingRealGoal && goal?.progressSource === "habit_logs";

  // Al editar una meta ya vinculada a un hábito (lockedToHabit), el
  // selector solo debe ofrecer hábitos "compatibles" — con una fórmula de
  // progreso automático aprobada (SUPPORTED_GOAL_TYPES) — para no permitir
  // elegir un reemplazo que el servidor rechazaría igualmente al guardar.
  const compatibleHabitOptions = useMemo(
    () => habitOptions.filter((habit) => SUPPORTED_GOAL_TYPES.has(habit.goalType)),
    [habitOptions],
  );

  const habitSelectOptions = useMemo(() => {
    const generalOption = { value: "general", label: "Meta general" };
    if (lockedToHabit) {
      return compatibleHabitOptions.map((habit) => ({ value: habit.id, label: habit.name }));
    }
    if (lockedToGeneral) return [generalOption];
    const options = habitOptions.map((habit) => ({ value: habit.id, label: habit.name }));
    return [generalOption, ...options];
  }, [habitOptions, compatibleHabitOptions, lockedToGeneral, lockedToHabit]);

  // BUG-PROD-008: el selector quedaba completamente disabled para
  // lockedToHabit, impidiendo elegir cualquier alternativa aunque
  // habitSelectOptions ya la calculara correctamente. Solo debe
  // deshabilitarse cuando no existe NINGÚN otro hábito compatible al que
  // cambiar (además del ya vinculado) — lockedToGeneral sigue disabled
  // siempre, porque una meta manual nunca puede vincularse a un hábito.
  const hasCompatibleAlternative =
    lockedToHabit && compatibleHabitOptions.some((habit) => habit.id !== form.habitId);
  const habitSelectDisabled = lockedToGeneral || (lockedToHabit && !hasCompatibleAlternative);

  const selectedHabit = habitOptions.find((habit) => habit.id === form.habitId);
  const isHabitLinked = form.habitId !== "general";
  const habitTypeUnsupported = isHabitLinked && selectedHabit && !SUPPORTED_GOAL_TYPES.has(selectedHabit.goalType);

  // BUG-PROD-005: current_value para progress_source = 'habit_logs' se
  // define en compute_goal_habit_logs_progress() (20260731004632_goal_progress_source.sql)
  // como la SUMA de habit_logs.value en la unidad propia del hábito — el
  // backend nunca conoció ni usó goals.unit para ese cálculo. Antes de este
  // fix, "Unidad" era texto libre sin relación con esa unidad real (el
  // Product Owner podía escribir "días" para una meta ligada a un hábito de
  // "vasos"), lo que producía lecturas sin sentido ("8 de 7 días") aunque el
  // cálculo del servidor fuera matemáticamente correcto. La unidad mostrada
  // ahora se deriva del hábito vinculado, para que siempre coincida con lo
  // que realmente se está sumando.
  const habitUnit = isHabitLinked ? selectedHabit?.unit?.trim() || undefined : undefined;
  const unitLocked = isHabitLinked && Boolean(habitUnit);
  const effectiveUnit = unitLocked ? habitUnit! : form.unit;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};
    if (!form.title.trim()) nextErrors.title = "El título es obligatorio.";
    if (Number(form.targetValue) <= 0) nextErrors.targetValue = "Ingresa un objetivo mayor a 0.";
    if (!isHabitLinked && Number(form.currentValue) < 0) nextErrors.currentValue = "El valor actual no puede ser negativo.";
    if (!effectiveUnit.trim()) nextErrors.unit = "Indica una unidad, por ejemplo días o %.";
    if (!form.startDate) nextErrors.startDate = "La fecha de inicio es obligatoria.";
    if (!form.endDate) nextErrors.endDate = "La fecha límite es obligatoria.";
    else if (form.endDate < form.startDate) nextErrors.endDate = "La fecha límite debe ser posterior a la de inicio.";
    if (habitTypeUnsupported) {
      nextErrors.habitId =
        "Este hábito todavía no admite progreso automático (solo cantidad, duración o repeticiones lo admiten hoy).";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    onSubmit({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      targetValue: Number(form.targetValue),
      unit: effectiveUnit.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      progressSource: isHabitLinked ? "habit_logs" : "manual",
      habitId: isHabitLinked ? form.habitId : undefined,
      currentValue: isHabitLinked ? undefined : Number(form.currentValue),
    });
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={goal ? "Editar meta" : "Crear meta"}
      description="Define un objetivo medible general o asociado a un hábito."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isSaving}>
            {goal ? "Guardar cambios" : "Crear meta"}
          </Button>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Input label="Título" value={form.title} onChange={(event) => update("title", event.target.value)} error={errors.title} />
        <TextArea
          label="Descripción (opcional)"
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
        />
        <Select
          label="Asociada a"
          value={form.habitId}
          onChange={(event) => update("habitId", event.target.value)}
          options={habitSelectOptions}
          disabled={habitSelectDisabled}
          hint={
            lockedToHabit
              ? hasCompatibleAlternative
                ? "El origen del progreso de una meta no se puede cambiar después de crearla — solo puedes elegir otro hábito compatible."
                : "El origen del progreso no se puede cambiar. Todavía no existe otro hábito compatible (cantidad, duración o repeticiones) al que cambiar."
              : lockedToGeneral
                ? "Esta meta es manual — el origen de su progreso no se puede cambiar después de crearla."
                : undefined
          }
        />
        {errors.habitId && <p className="-mt-2 text-xs text-danger">{errors.habitId}</p>}
        {isHabitLinked && (
          <p className="-mt-2 text-xs text-text-secondary">
            {isSupabaseDataSource
              ? "El progreso de esta meta se calcula automáticamente desde tus registros diarios de ese hábito."
              : "En modo demo, el progreso de metas vinculadas a un hábito también se calcula automáticamente."}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Valor actual"
            type="number"
            min={0}
            value={isHabitLinked ? "" : form.currentValue}
            onChange={(event) => update("currentValue", event.target.value)}
            error={errors.currentValue}
            disabled={isHabitLinked}
            placeholder={isHabitLinked ? "Automático" : undefined}
          />
          <Input
            label="Objetivo"
            type="number"
            min={1}
            value={form.targetValue}
            onChange={(event) => update("targetValue", event.target.value)}
            error={errors.targetValue}
          />
        </div>
        <Input
          label="Unidad"
          value={effectiveUnit}
          onChange={(event) => update("unit", event.target.value)}
          placeholder="%, días, litros..."
          error={errors.unit}
          disabled={unitLocked}
          hint={unitLocked ? `Se toma automáticamente del hábito vinculado (${habitUnit}).` : undefined}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fecha de inicio"
            type="date"
            value={form.startDate}
            onChange={(event) => update("startDate", event.target.value)}
            error={errors.startDate}
          />
          <Input
            label="Fecha límite"
            type="date"
            value={form.endDate}
            onChange={(event) => update("endDate", event.target.value)}
            error={errors.endDate}
          />
        </div>
      </form>
    </Modal>
  );
}
