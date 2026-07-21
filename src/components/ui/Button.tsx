import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover disabled:bg-primary/50",
  secondary: "bg-surface text-text-primary border border-border hover:bg-surface-muted",
  ghost: "bg-transparent text-text-secondary hover:bg-surface-muted hover:text-text-primary",
  danger: "bg-danger text-white hover:bg-danger/90 disabled:bg-danger/50",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-base gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  leadingIcon,
  trailingIcon,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        leadingIcon
      )}
      {children}
      {!isLoading && trailingIcon}
    </button>
  );
}
