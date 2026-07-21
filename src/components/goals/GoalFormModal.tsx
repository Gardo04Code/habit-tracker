import { useState, type FormEvent } from "react";
import type { Goal } from "../../types/goal";
import type { GoalDraft } from "../../hooks/useGoalsManager";
import { browsableHabits } from "../../hooks/useHistoryLogs";
import { TODAY } from "../../data/referenceDate";
import { addDays } from "../../utils/formatDate";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { TextArea } from "../ui/TextArea";
import { Select } from "../ui/Select";

interface GoalFormModalProps {
  isOpen: boolean;
  goal?: Goal;
  onClose: () => void;
  onSubmit: (draft: GoalDraft) => void;
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
    startDate: goal?.startDate ?? TODAY,
    endDate: goal?.endDate ?? addDays(TODAY, 30),
  };
}

export function GoalFormModal({ isOpen, goal, onClose, onSubmit }: GoalFormModalProps) {
  if (!isOpen) return null;

  return <GoalFormModalContent goal={goal} onClose={onClose} onSubmit={onSubmit} />;
}

interface GoalFormModalContentProps {
  goal?: Goal;
  onClose: () => void;
  onSubmit: (draft: GoalDraft) => void;
}

function GoalFormModalContent({ goal, onClose, onSubmit }: GoalFormModalContentProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(goal));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};
    if (!form.title.trim()) nextErrors.title = "El título es obligatorio.";
    if (Number(form.targetValue) <= 0) nextErrors.targetValue = "Ingresa un objetivo mayor a 0.";
    if (Number(form.currentValue) < 0) nextErrors.currentValue = "El valor actual no puede ser negativo.";
    if (!form.unit.trim()) nextErrors.unit = "Indica una unidad, por ejemplo días o %.";
    if (!form.startDate) nextErrors.startDate = "La fecha de inicio es obligatoria.";
    if (!form.endDate) nextErrors.endDate = "La fecha límite es obligatoria.";
    else if (form.endDate < form.startDate) nextErrors.endDate = "La fecha límite debe ser posterior a la de inicio.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    onSubmit({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      habitId: form.habitId === "general" ? undefined : form.habitId,
      targetValue: Number(form.targetValue),
      currentValue: Number(form.currentValue),
      unit: form.unit.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
    });
    onClose();
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={goal ? "Editar meta" : "Crear meta"}
      description="Define un objetivo medible general o asociado a un hábito."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
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
          options={[
            { value: "general", label: "Meta general" },
            ...browsableHabits.map((habit) => ({ value: habit.id, label: habit.name })),
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Valor actual"
            type="number"
            min={0}
            value={form.currentValue}
            onChange={(event) => update("currentValue", event.target.value)}
            error={errors.currentValue}
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
          value={form.unit}
          onChange={(event) => update("unit", event.target.value)}
          placeholder="%, días, litros..."
          error={errors.unit}
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
