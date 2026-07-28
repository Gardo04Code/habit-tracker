import { Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

interface InsightAvatarProps {
  size?: number;
}

/** Identidad constante del "agente IA": siempre el mismo glifo, para que se
 * distinga de los íconos de categoría/hábito que sí varían por insight. */
export function InsightAvatar({ size = 40 }: InsightAvatarProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <span
      className="shadow-glow relative flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-hover text-white"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="absolute inset-0 rounded-full bg-white/20" style={{ clipPath: "polygon(0 0, 100% 0, 100% 35%, 0 55%)" }} />
      {!prefersReducedMotion && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: "0 0 0 0 var(--color-primary)" }}
          animate={{ boxShadow: ["0 0 0 0 rgba(76,124,240,0.5)", "0 0 0 6px rgba(76,124,240,0)"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <Sparkles size={size * 0.45} className="relative" strokeWidth={2.2} />
    </span>
  );
}
