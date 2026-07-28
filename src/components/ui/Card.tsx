import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import clsx from "clsx";

export type CardVariant = "elevated" | "glass" | "flat";

interface CardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  padded?: boolean;
  variant?: CardVariant;
  interactive?: boolean;
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  elevated: "bg-surface border border-border shadow-elevation-2",
  glass: "glass-surface shadow-elevation-2",
  flat: "bg-surface-muted border border-border",
};

export function Card({
  children,
  padded = true,
  variant = "elevated",
  interactive = false,
  className,
  ...rest
}: CardProps) {
  return (
    <motion.div
      className={clsx("rounded-2xl", VARIANT_CLASSES[variant], padded && "p-5", className)}
      whileHover={interactive ? { y: -3 } : undefined}
      style={interactive ? { willChange: "transform" } : undefined}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
