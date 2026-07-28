import type { ReactNode } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

export type QuickActionTone = "primary" | "success" | "neutral" | "danger";

interface QuickActionButtonProps {
  icon: ReactNode;
  label: string;
  tone?: QuickActionTone;
  disabled?: boolean;
  onClick: () => void;
}

const TONE_CLASSES: Record<QuickActionTone, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover shadow-glow",
  success: "bg-success text-white hover:bg-success/90",
  neutral: "border border-border bg-surface-muted text-text-secondary hover:border-border-strong hover:bg-surface",
  danger: "border border-border bg-surface text-danger hover:bg-danger-muted hover:border-danger",
};

export function QuickActionButton({ icon, label, tone = "neutral", disabled, onClick }: QuickActionButtonProps) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        TONE_CLASSES[tone],
      )}
    >
      {icon}
      {label}
    </motion.button>
  );
}
