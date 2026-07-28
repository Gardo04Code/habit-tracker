import { Flame, Sparkles, TrendingDown, TrendingUp } from "lucide-react";

interface WeeklyInsightBannerProps {
  trend: number;
}

function getInsight(trend: number): { icon: typeof Sparkles; title: string; description: string } {
  if (trend > 0) {
    return {
      icon: Sparkles,
      title: "¡Vas súper bien!",
      description: `Tu consistencia mejoró ${trend}% frente a la semana pasada. Sigue así para alcanzar tu meta.`,
    };
  }
  if (trend < 0) {
    return {
      icon: TrendingDown,
      title: "Bajaste un poco el ritmo",
      description: `Tu cumplimiento cayó ${Math.abs(trend)}% frente a la semana pasada. Todavía puedes cerrar fuerte.`,
    };
  }
  return {
    icon: TrendingUp,
    title: "Vas estable",
    description: "Mantienes el mismo ritmo que la semana pasada. Un pequeño empujón y subes de nivel.",
  };
}

export function WeeklyInsightBanner({ trend }: WeeklyInsightBannerProps) {
  const { icon: Icon, title, description } = getInsight(trend);

  return (
    <div className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/15 via-surface-elevated to-surface-elevated px-4 py-3.5">
      <span className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-primary/20 blur-2xl" aria-hidden="true" />
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-glow">
        <Icon size={18} aria-hidden="true" />
      </span>
      <div className="relative min-w-0">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      <Flame size={64} className="ml-auto hidden shrink-0 text-primary/15 sm:block" aria-hidden="true" />
    </div>
  );
}
