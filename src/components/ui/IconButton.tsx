import { forwardRef, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import clsx from "clsx";
import type { ButtonVariant } from "./Button";

interface IconButtonProps extends HTMLMotionProps<"button"> {
  icon: ReactNode;
  label: string;
  variant?: Extract<ButtonVariant, "ghost" | "secondary" | "primary" | "danger">;
}

const VARIANT_CLASSES: Record<string, string> = {
  ghost: "bg-transparent text-text-secondary hover:bg-surface-muted hover:text-text-primary",
  secondary: "bg-surface text-text-primary border border-border hover:border-border-strong hover:bg-surface-muted",
  primary: "bg-primary text-white hover:bg-primary-hover shadow-glow",
  danger: "bg-surface text-danger border border-border hover:bg-danger-muted hover:border-danger",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = "ghost", className, disabled, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANT_CLASSES[variant],
        className,
      )}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.94 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      disabled={disabled}
      {...rest}
    >
      {icon}
    </motion.button>
  );
});
