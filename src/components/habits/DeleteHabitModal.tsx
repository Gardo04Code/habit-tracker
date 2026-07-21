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

export function DeleteHabitModal({ isOpen, habitName, onClose, onConfirm }: DeleteHabitModalProps) {
  const [selected, setSelected] = useState<DeleteHabitOption>("archive");

  if (!isOpen) return null;

  const selectedOption = OPTIONS.find((option) => option.value === selected)!;

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
        {OPTIONS.map((option) => (
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
