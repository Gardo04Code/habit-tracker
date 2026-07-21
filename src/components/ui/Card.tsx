import type { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

export function Card({ children, padded = true, className, ...rest }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-border bg-surface shadow-sm",
        padded && "p-5",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
