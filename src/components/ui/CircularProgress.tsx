import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  glow?: string;
  trackColor?: string;
  delay?: number;
  children?: ReactNode;
}

export function CircularProgress({
  percentage,
  size = 76,
  strokeWidth = 5,
  color = "var(--color-primary)",
  glow,
  trackColor = "var(--color-border)",
  delay = 0,
  children,
}: CircularProgressProps) {
  const prefersReducedMotion = useReducedMotion();
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, percentage)) / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90">
        <circle cx={center} cy={center} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: prefersReducedMotion ? offset : circumference }}
          whileInView={{ strokeDashoffset: offset }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay, ease: "easeOut" }}
          style={glow ? { filter: `drop-shadow(0 0 4px ${glow})` } : undefined}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}
