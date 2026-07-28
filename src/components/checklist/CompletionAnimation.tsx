import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ParticleBurst } from "../ui/ParticleBurst";

interface CompletionAnimationProps {
  onFinished: () => void;
}

/** Overlay breve de éxito (glow + partículas) que se monta cuando un hábito
 * pasa a "completado" y se desmonta solo al terminar. */
export function CompletionAnimation({ onFinished }: CompletionAnimationProps) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const timeout = setTimeout(onFinished, prefersReducedMotion ? 0 : 850);
    return () => clearTimeout(timeout);
  }, [onFinished, prefersReducedMotion]);

  if (prefersReducedMotion) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl" aria-hidden="true">
      <ParticleBurst radius={40} className="left-1/2 top-1/2" />
      <motion.span
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: [0.4, 1.3, 1.1], opacity: [0, 0.7, 0] }}
        transition={{ duration: 0.8, times: [0, 0.4, 1], ease: "easeOut" }}
        className="absolute h-20 w-20 rounded-full bg-success/40"
      />
    </div>
  );
}
