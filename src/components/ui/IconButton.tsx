import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import type { ButtonVariant } from "./Button";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  variant?: Extract<ButtonVariant, "ghost" | "secondary" | "primary" | "danger">;
}

const VARIANT_CLASSES: Record<string, string> = {
  ghost: "bg-transparent text-text-secondary hover:bg-surface-muted hover:text-text-primary",
  secondary: "bg-surface text-text-primary border border-border hover:bg-surface-muted",
  primary: "bg-primary text-white hover:bg-primary-hover",
  danger: "bg-surface text-danger border border-border hover:bg-danger-muted hover:border-danger",
};

export function IconButton({
  icon,
  label,
  variant = "ghost",
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
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
      {...rest}
    >
      {icon}
    </button>
  );
}
