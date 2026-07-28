import { useRef, type MouseEvent, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";

interface TiltCardProps {
  children: ReactNode;
  maxTilt?: number;
  className?: string;
}

/**
 * Tilt 3D sutil por posición del mouse, hecho con Framer Motion en vez de
 * una librería aparte (Vanilla-Tilt): mismo efecto, un solo motor de
 * animación en toda la app. Se desactiva por completo si el usuario prefiere
 * menos movimiento.
 */
export function TiltCard({ children, maxTilt = 7, className }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(pointerY, [0, 1], [maxTilt, -maxTilt]), {
    stiffness: 260,
    damping: 24,
  });
  const rotateY = useSpring(useTransform(pointerX, [0, 1], [-maxTilt, maxTilt]), {
    stiffness: 260,
    damping: 24,
  });

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (prefersReducedMotion) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    pointerX.set((event.clientX - rect.left) / rect.width);
    pointerY.set((event.clientY - rect.top) / rect.height);
  }

  function handleMouseLeave() {
    pointerX.set(0.5);
    pointerY.set(0.5);
  }

  if (prefersReducedMotion) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
    >
      {children}
    </motion.div>
  );
}
