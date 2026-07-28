import { motion } from "framer-motion";
import clsx from "clsx";

export type ProgressVariant = "primary" | "success" | "warning" | "danger" | "purple";

interface ProgressBarProps {
  percentage: number;
  variant?: ProgressVariant;
  label?: string;
  showValue?: boolean;
  className?: string;
}

const VARIANT_CLASSES: Record<ProgressVariant, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  purple: "bg-primary",
};

export function ProgressBar({
  percentage,
  variant = "primary",
  label,
  showValue = true,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(percentage, 100));
  const isExceeded = percentage > 100;

  return (
    <div className={clsx("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          {label && <span className="text-text-secondary">{label}</span>}
          {showValue && (
            <span className={clsx("font-medium", isExceeded ? "text-primary" : "text-text-primary")}>
              {percentage}%
            </span>
          )}
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className={clsx(
            "h-full rounded-full",
            isExceeded ? "bg-primary shadow-glow" : VARIANT_CLASSES[variant],
          )}
          initial={false}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}
