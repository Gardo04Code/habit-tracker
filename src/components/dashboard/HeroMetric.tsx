import { Flame } from "lucide-react";
import { motion } from "framer-motion";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { TiltCard } from "../ui/TiltCard";

interface HeroMetricProps {
  streak: number;
  bestStreak: number;
}

export function HeroMetric({ streak, bestStreak }: HeroMetricProps) {
  const progress = bestStreak > 0 ? Math.min(100, Math.round((streak / bestStreak) * 100)) : 100;

  return (
    <TiltCard maxTilt={4} className="h-full">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="glass-surface shadow-glow relative flex h-full flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-surface-elevated to-surface-elevated p-6"
      >
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/25 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex items-center justify-between">
          <span className="shadow-glow flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
            <Flame size={20} aria-hidden="true" />
          </span>
          <span className="text-xs font-medium text-text-secondary">Mejor racha: {bestStreak} días</span>
        </div>

        <div className="relative mt-6">
          <p className="flex items-baseline gap-1.5 text-5xl font-bold tracking-tight text-text-primary">
            <AnimatedNumber value={streak} />
            <span className="text-lg font-semibold text-text-secondary">días</span>
          </p>
          <p className="mt-1 text-sm text-text-secondary">Racha actual</p>
        </div>

        <div className="relative mt-5 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </motion.div>
    </TiltCard>
  );
}
