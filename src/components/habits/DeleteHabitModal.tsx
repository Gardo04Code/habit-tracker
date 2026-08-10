import { useState } from "react";
import clsx from "clsx";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

export type DeleteHabitOption = "archive" | "delete_habit" | "delete_habit_and_logs";

interface DeleteHabitModalProps {
  isOpen: boolean;
  habitName: string;
  onClose: () => void;
  onConfirm: (option: DeleteHabitOption) => void;
  /** "Eliminar hábito y todos sus registros" todavía no está implementado
   * contra Supabase (eliminación física fuera de alcance) — se oculta esa
   * opción en vez de dejarla fallar al confirmarla. Por defecto `true`
   * (modo mock, comportamiento sin cambios). */
  allowHardDelete?: boolean;
}

const OPTIONS: { value: DeleteHabitOption; title: string; description: string; destructive?: boolean }[] = [
  {
    value: "archive",
    title: "Archivar hábito",
    description: "Deja de aparecer en tu checklist diario, pero conserva todo su historial.",
  },
  {
    value: "delete_habit",
    title: "Eliminar únicamente el hábito",
    description: "El hábito se mueve a la papelera. Puedes restaurarlo más adelante.",
  },
  {
    value: "delete_habit_and_logs",
    title: "Eliminar hábito y todos sus registros",
    description: "Acción permanente: se borra el hábito y todo su historial. No se puede deshacer.",
    destructive: true,
  },
];

export function DeleteHabitModal({ isOpen, habitName, onClose, onConfirm, allowHardDelete = true }: DeleteHabitModalProps) {
  const [selected, setSelected] = useState<DeleteHabitOption>("archive");
  const visibleOptions = allowHardDelete ? OPTIONS : OPTIONS.filter((option) => option.value !== "delete_habit_and_logs");

  if (!isOpen) return null;

  const selectedOption = visibleOptions.find((option) => option.value === selected) ?? visibleOptions[0];

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Eliminar "${habitName}"`}
      description="Elige qué quieres hacer con este hábito."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant={selectedOption.destructive ? "danger" : "primary"}
            onClick={() => {
              onConfirm(selected);
              onClose();
            }}
          >
            Confirmar
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label="Opciones de eliminación" className="flex flex-col gap-2">
        {visibleOptions.map((option) => (
          <label
            key={option.value}
            className={clsx(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
              selected === option.value
                ? option.destructive
                  ? "border-danger bg-danger-muted"
                  : "border-primary bg-primary-muted"
                : "border-border hover:bg-surface-muted",
            )}
          >
            <input
              type="radio"
              name="delete-option"
              value={option.value}
              checked={selected === option.value}
              onChange={() => setSelected(option.value)}
              className="mt-1"
            />
            <span>
              <span
                className={clsx(
                  "block text-sm font-medium",
                  option.destructive ? "text-danger" : "text-text-primary",
                )}
              >
                {option.title}
              </span>
              <span className="block text-xs text-text-secondary">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
    </Modal>
  );
}
