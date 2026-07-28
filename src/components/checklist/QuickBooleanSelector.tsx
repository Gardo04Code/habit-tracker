import { Check } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";

interface QuickBooleanSelectorProps {
  isCompleted: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

export function QuickBooleanSelector({ isCompleted, disabled, onToggle }: QuickBooleanSelectorProps) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={isCompleted}
      aria-label={isCompleted ? "Marcado como completado" : "Marcar como completado"}
      disabled={disabled}
      onClick={onToggle}
      whileTap={disabled ? undefined : { scale: 0.9 }}
      className={clsx(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:cursor-not-allowed disabled:opacity-60",
        isCompleted
          ? "border-success bg-success text-white shadow-glow"
          : "border-border-strong bg-surface text-transparent hover:border-primary",
      )}
    >
      <Check size={20} strokeWidth={3} aria-hidden="true" />
    </motion.button>
  );
}
