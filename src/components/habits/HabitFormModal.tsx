import { useState } from "react";
import type { FormEvent } from "react";
import { Calendar, Palette, Repeat as RepeatIcon, Sparkles, Tag, Target } from "lucide-react";
import type { FrequencyType, GoalType, Habit } from "../../types/habit";
import type { HabitDraft } from "../../hooks/useHabitsManager";
import { mockCategories } from "../../data/mockCategories";
import { HABIT_COLOR_OPTIONS, HABIT_ICON_OPTIONS } from "../../utils/habitIcons";
import { TODAY } from "../../data/referenceDate";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { TextArea } from "../ui/TextArea";
import { Select } from "../ui/Select";
import { Toggle } from "../ui/Toggle";
import { HabitIcon3D } from "../ui/HabitIcon3D";
import clsx from "clsx";

function SectionTitle({ icon: Icon, children }: { icon: typeof Sparkles; children: string }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-muted text-primary">
        <Icon size={13} aria-hidden="true" />
      </span>
      {children}
    </h3>
  );
}

interface HabitFormModalProps {
  isOpen: boolean;
  habit?: Habit;
  isNameTaken: (name: string, excludeId?: string) => boolean;
  onClose: () => void;
  onSubmit: (draft: HabitDraft) => void;
}

interface FormState {
  name: string;
  description: string;
  categoryIds: string[];
  icon: string;
  color: string;
  frequencyType: FrequencyType;
  daysOfWeek: number[];
  frequencyTarget: string;
  intervalDays: string;
  goalType: GoalType;
  targetValue: string;
  targetUnit: string;
  deadlineTime: string;
  startDate: string;
  endDate: string;
  allowPartial: boolean;
}

const WEEKDAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

const FREQUENCY_OPTIONS: { value: FrequencyType; label: string }[] = [
  { value: "daily", label: "Todos los días" },
  { value: "specific_days", label: "Días específicos" },
  { value: "times_per_week", label: "X veces por semana" },
  { value: "times_per_month", label: "X veces por mes" },
  { value: "one_time", label: "Una vez" },
  { value: "custom_interval", label: "Cada N días" },
];

const GOAL_OPTIONS: { value: GoalType; label: string }[] = [
  { value: "boolean", label: "Sí / No" },
  { value: "quantity", label: "Cantidad" },
  { value: "duration", label: "Duración" },
  { value: "repetitions", label: "Repeticiones" },
  { value: "deadline", label: "Hora límite" },
  { value: "accumulated_days", label: "Días acumulados" },
];

const VALUE_GOAL_TYPES: GoalType[] = ["quantity", "duration", "repetitions", "accumulated_days"];

function toFormState(habit?: Habit): FormState {
  return {
    name: habit?.name ?? "",
    description: habit?.description ?? "",
    categoryIds: habit?.categoryIds ?? [],
    icon: habit?.icon ?? HABIT_ICON_OPTIONS[0].value,
    color: habit?.color ?? HABIT_COLOR_OPTIONS[0],
    frequencyType: habit?.frequencyType ?? "daily",
    daysOfWeek: habit?.daysOfWeek ?? [],
    frequencyTarget: habit?.frequencyTarget?.toString() ?? "3",
    intervalDays: habit?.intervalDays?.toString() ?? "2",
    goalType: habit?.goalType ?? "boolean",
    targetValue: habit?.targetValue?.toString() ?? "",
    targetUnit: habit?.targetUnit ?? "",
    deadlineTime: habit?.deadlineTime ?? "",
    startDate: habit?.startDate ?? TODAY,
    endDate: habit?.endDate ?? "",
    allowPartial: habit?.allowPartial ?? true,
  };
}

export function HabitFormModal({ isOpen, habit, isNameTaken, onClose, onSubmit }: HabitFormModalProps) {
  if (!isOpen) return null;

  return <HabitFormModalContent habit={habit} isNameTaken={isNameTaken} onClose={onClose} onSubmit={onSubmit} />;
}

interface HabitFormModalContentProps {
  habit?: Habit;
  isNameTaken: (name: string, excludeId?: string) => boolean;
  onClose: () => void;
  onSubmit: (draft: HabitDraft) => void;
}

function HabitFormModalContent({ habit, isNameTaken, onClose, onSubmit }: HabitFormModalContentProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(habit));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleCategory(categoryId: string) {
    setForm((current) => ({
      ...current,
      categoryIds: current.categoryIds.includes(categoryId)
        ? current.categoryIds.filter((id) => id !== categoryId)
        : [...current.categoryIds, categoryId],
    }));
  }

  function toggleWeekday(day: number) {
    setForm((current) => ({
      ...current,
      daysOfWeek: current.daysOfWeek.includes(day)
        ? current.daysOfWeek.filter((value) => value !== day)
        : [...current.daysOfWeek, day].sort(),
    }));
  }

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      nextErrors.name = "El nombre es obligatorio.";
    } else if (form.name.length > 150) {
      nextErrors.name = "El nombre admite hasta 150 caracteres.";
    } else if (isNameTaken(form.name, habit?.id)) {
      nextErrors.name = "Ya existe un hábito con este nombre.";
    }

    if (form.frequencyType === "specific_days" && form.daysOfWeek.length === 0) {
      nextErrors.frequency = "Selecciona al menos un día.";
    }
    if (
      (form.frequencyType === "times_per_week" || form.frequencyType === "times_per_month") &&
      Number(form.frequencyTarget) < 1
    ) {
      nextErrors.frequency = "Indica cuántas veces por periodo.";
    }
    if (form.frequencyType === "custom_interval" && Number(form.intervalDays) < 1) {
      nextErrors.frequency = "Indica cada cuántos días.";
    }

    if (VALUE_GOAL_TYPES.includes(form.goalType) && Number(form.targetValue) <= 0) {
      nextErrors.targetValue = "Ingresa una meta mayor a 0.";
    }
    if (form.goalType === "deadline" && !form.deadlineTime) {
      nextErrors.deadlineTime = "Selecciona una hora límite.";
    }

    if (!form.startDate) {
      nextErrors.startDate = "La fecha de inicio es obligatoria.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    const draft: HabitDraft = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      categoryIds: form.categoryIds,
      icon: form.icon,
      color: form.color,
      frequencyType: form.frequencyType,
      daysOfWeek: form.frequencyType === "specific_days" ? form.daysOfWeek : undefined,
      frequencyTarget:
        form.frequencyType === "times_per_week" || form.frequencyType === "times_per_month"
          ? Number(form.frequencyTarget)
          : undefined,
      intervalDays: form.frequencyType === "custom_interval" ? Number(form.intervalDays) : undefined,
      goalType: form.goalType,
      targetValue: VALUE_GOAL_TYPES.includes(form.goalType) ? Number(form.targetValue) : undefined,
      targetUnit: VALUE_GOAL_TYPES.includes(form.goalType) ? form.targetUnit.trim() || undefined : undefined,
      deadlineTime: form.goalType === "deadline" ? form.deadlineTime : undefined,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      allowPartial: form.goalType === "boolean" ? false : form.allowPartial,
    };

    onSubmit(draft);
    onClose();
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={habit ? "Editar hábito" : "Crear hábito"}
      description="Completa la información para dar seguimiento a este hábito."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {habit ? "Guardar cambios" : "Crear hábito"}
          </Button>
        </>
      }
    >
      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <section className="flex flex-col gap-3">
          <SectionTitle icon={Sparkles}>Datos básicos</SectionTitle>
          <Input
            label="Nombre"
            value={form.name}
            maxLength={150}
            onChange={(event) => update("name", event.target.value)}
            error={errors.name}
            required
          />
          <TextArea
            label="Descripción (opcional)"
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
          />
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle icon={Tag}>Categorías</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {mockCategories.map((category) => {
              const isSelected = form.categoryIds.includes(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className={clsx(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    isSelected
                      ? "border-primary bg-primary-muted text-primary"
                      : "border-border bg-surface text-text-secondary hover:bg-surface-muted",
                  )}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle icon={RepeatIcon}>Frecuencia</SectionTitle>
          <Select
            label="Tipo de frecuencia"
            value={form.frequencyType}
            onChange={(event) => update("frequencyType", event.target.value as FrequencyType)}
            options={FREQUENCY_OPTIONS}
          />
          {form.frequencyType === "specific_days" && (
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleWeekday(day.value)}
                  className={clsx(
                    "h-9 w-12 rounded-lg border text-xs font-medium transition-colors",
                    form.daysOfWeek.includes(day.value)
                      ? "border-primary bg-primary-muted text-primary"
                      : "border-border bg-surface text-text-secondary hover:bg-surface-muted",
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
          )}
          {(form.frequencyType === "times_per_week" || form.frequencyType === "times_per_month") && (
            <Input
              label={form.frequencyType === "times_per_week" ? "Veces por semana" : "Veces por mes"}
              type="number"
              min={1}
              value={form.frequencyTarget}
              onChange={(event) => update("frequencyTarget", event.target.value)}
            />
          )}
          {form.frequencyType === "custom_interval" && (
            <Input
              label="Repetir cada (días)"
              type="number"
              min={1}
              value={form.intervalDays}
              onChange={(event) => update("intervalDays", event.target.value)}
            />
          )}
          {errors.frequency && <p className="text-xs text-danger">{errors.frequency}</p>}
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle icon={Target}>Tipo de meta</SectionTitle>
          <Select
            label="Meta"
            value={form.goalType}
            onChange={(event) => update("goalType", event.target.value as GoalType)}
            options={GOAL_OPTIONS}
          />

          {VALUE_GOAL_TYPES.includes(form.goalType) && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Valor objetivo"
                type="number"
                min={1}
                value={form.targetValue}
                onChange={(event) => update("targetValue", event.target.value)}
                error={errors.targetValue}
              />
              <Input
                label="Unidad"
                value={form.targetUnit}
                onChange={(event) => update("targetUnit", event.target.value)}
                placeholder="minutos, vasos..."
              />
            </div>
          )}

          {form.goalType === "deadline" && (
            <Input
              label="Hora límite"
              type="time"
              value={form.deadlineTime}
              onChange={(event) => update("deadlineTime", event.target.value)}
              error={errors.deadlineTime}
            />
          )}

          {form.goalType !== "boolean" && (
            <Toggle
              label="Permitir registros parciales"
              hint="Si está activo, un avance menor a la meta se marca como parcial en vez de no realizado."
              checked={form.allowPartial}
              onChange={(checked) => update("allowPartial", checked)}
            />
          )}
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle icon={Calendar}>Vigencia</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fecha de inicio"
              type="date"
              value={form.startDate}
              onChange={(event) => update("startDate", event.target.value)}
              error={errors.startDate}
            />
            <Input
              label="Fecha de fin (opcional)"
              type="date"
              value={form.endDate}
              onChange={(event) => update("endDate", event.target.value)}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle icon={Palette}>Apariencia</SectionTitle>
          <div className="flex items-center gap-4">
            <HabitIcon3D iconName={form.icon} color={form.color} size={56} />
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {HABIT_ICON_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    title={option.label}
                    aria-label={option.label}
                    onClick={() => update("icon", option.value)}
                    className={clsx(
                      "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                      form.icon === option.value
                        ? "border-primary bg-primary-muted text-primary"
                        : "border-border bg-surface text-text-secondary hover:bg-surface-muted",
                    )}
                  >
                    <option.icon size={16} />
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {HABIT_COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Color ${color}`}
                    onClick={() => update("color", color)}
                    className={clsx(
                      "h-7 w-7 rounded-full border-2 transition-transform",
                      form.color === color ? "scale-110 border-text-primary" : "border-transparent",
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </form>
    </Modal>
  );
}
