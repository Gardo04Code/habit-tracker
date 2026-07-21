import { useState } from "react";
import { Modal } from "../ui/Modal";
import { TextArea } from "../ui/TextArea";
import { Button } from "../ui/Button";

interface HabitNoteModalProps {
  isOpen: boolean;
  habitName: string;
  initialNote?: string;
  onClose: () => void;
  onSave: (note: string) => void;
}

export function HabitNoteModal({ isOpen, habitName, initialNote, onClose, onSave }: HabitNoteModalProps) {
  if (!isOpen) return null;

  return <HabitNoteModalContent habitName={habitName} initialNote={initialNote} onClose={onClose} onSave={onSave} />;
}

interface HabitNoteModalContentProps {
  habitName: string;
  initialNote?: string;
  onClose: () => void;
  onSave: (note: string) => void;
}

function HabitNoteModalContent({ habitName, initialNote, onClose, onSave }: HabitNoteModalContentProps) {
  const [note, setNote] = useState(initialNote ?? "");

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Nota para ${habitName}`}
      description="Agrega contexto sobre tu registro de hoy."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onSave(note);
              onClose();
            }}
          >
            Guardar nota
          </Button>
        </>
      }
    >
      <TextArea
        label="Nota"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Ej. Me costó llegar a la meta por reuniones seguidas."
      />
    </Modal>
  );
}
