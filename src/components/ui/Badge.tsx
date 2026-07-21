import type { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger" | "purple" | "streak";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  children: ReactNode;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-neutral-muted text-text-secondary",
  primary: "bg-primary-muted text-primary",
  success: "bg-success-muted text-success",
  warning: "bg-warning-muted text-warning",
  danger: "bg-danger-muted text-danger",
  purple: "bg-purple-muted text-purple",
  streak: "bg-streak-muted text-streak",
};

export function Badge({ tone = "neutral", className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
