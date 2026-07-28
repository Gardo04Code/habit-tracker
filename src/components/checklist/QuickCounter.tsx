import { Minus, Plus } from "lucide-react";
import { motion } from "framer-motion";

interface QuickCounterProps {
  value: number;
  step?: number;
  min?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function QuickCounter({ value, step = 1, min = 0, disabled, onChange }: QuickCounterProps) {
  return (
    <div className="flex items-center gap-3" role="group" aria-label="Ajustar cantidad registrada">
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
        aria-label="Restar"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-text-secondary transition-colors hover:border-border-strong hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Minus size={15} aria-hidden="true" />
      </button>
      <motion.span
        key={value}
        initial={{ scale: 1.2, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="min-w-[2.5rem] text-center text-lg font-bold text-text-primary"
      >
        {value}
      </motion.span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(value + step)}
        aria-label="Sumar"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-glow transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Plus size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
