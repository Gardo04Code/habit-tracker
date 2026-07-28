import { motion, useReducedMotion } from "framer-motion";
import clsx from "clsx";

interface ParticleBurstProps {
  className?: string;
  radius?: number;
}

const PARTICLE_COLORS = ["var(--color-success)", "var(--color-primary)", "var(--color-warning)"];

function buildParticles(radius: number) {
  return Array.from({ length: 10 }, (_, index) => {
    const angle = (index / 10) * Math.PI * 2;
    return {
      id: index,
      x: Math.cos(angle) * (radius + (index % 3) * 6),
      y: Math.sin(angle) * (radius + (index % 3) * 6),
      color: PARTICLE_COLORS[index % PARTICLE_COLORS.length],
      delay: (index % 4) * 0.03,
    };
  });
}

/** Estallido de partículas reutilizable, hecho con Framer Motion (sin
 * dependencias nuevas). Se desactiva por completo con prefers-reduced-motion.
 * Móntalo condicionalmente (ej. al transicionar a un estado de éxito) para
 * que dispare una sola vez. */
export function ParticleBurst({ className, radius = 28 }: ParticleBurstProps) {
  const prefersReducedMotion = useReducedMotion();
  if (prefersReducedMotion) return null;

  const particles = buildParticles(radius);

  return (
    <div className={clsx("pointer-events-none absolute h-0 w-0", className)} aria-hidden="true">
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: particle.color }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: particle.x, y: particle.y, opacity: 0, scale: 0.4 }}
          transition={{ duration: 0.7, delay: particle.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
