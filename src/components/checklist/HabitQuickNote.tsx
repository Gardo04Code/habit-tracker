import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NotebookPen } from "lucide-react";
import { TextArea } from "../ui/TextArea";
import { QuickActionButton } from "./QuickActionButton";

interface HabitQuickNoteProps {
  habitName: string;
  note?: string;
  isOpen: boolean;
  disabled?: boolean;
  onSave: (note: string) => void;
  onClose: () => void;
}

/** Editor de nota inline (nunca un modal): el toggle vive fuera, en el menú
 * de acciones secundarias de la tarjeta. */
export function HabitQuickNote({ habitName, note, isOpen, disabled, onSave, onClose }: HabitQuickNoteProps) {
  const [draft, setDraft] = useState(note ?? "");

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2">
            <TextArea
              label={`Nota para ${habitName}`}
              className="min-h-16"
              value={draft}
              disabled={disabled}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ej. Me costó llegar a la meta por reuniones seguidas."
            />
            <div className="flex justify-end gap-2">
              <QuickActionButton icon={null} label="Cancelar" tone="neutral" onClick={onClose} />
              <QuickActionButton
                icon={<NotebookPen size={13} />}
                label="Guardar nota"
                tone="primary"
                disabled={disabled}
                onClick={() => {
                  onSave(draft);
                  onClose();
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
