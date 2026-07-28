import { useEffect, useState } from "react";
import { useMotionValue, useReducedMotion, useSpring } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  formatter?: (value: number) => string;
  className?: string;
}

export function AnimatedNumber({ value, formatter, className }: AnimatedNumberProps) {
  const prefersReducedMotion = useReducedMotion();
  const motionValue = useMotionValue(prefersReducedMotion ? value : 0);
  const spring = useSpring(motionValue, { stiffness: 120, damping: 20, mass: 0.8 });
  const [display, setDisplay] = useState(prefersReducedMotion ? value : 0);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    return spring.on("change", (latest) => setDisplay(latest));
  }, [spring]);

  const formatted = formatter ? formatter(display) : Math.round(display).toString();

  return <span className={className}>{formatted}</span>;
}
