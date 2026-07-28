import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  Flame,
  Lightbulb,
  Link2,
  PartyPopper,
  Play,
  ShieldAlert,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wand2,
  X,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import type { Insight, InsightAction, InsightActionKind, InsightPriority, InsightType } from "../../types/insight";
import { formatFullDate } from "../../utils/formatDate";
import { Card } from "../ui/Card";
import { IconButton } from "../ui/IconButton";
import { CircularProgress } from "../ui/CircularProgress";
import { ParticleBurst } from "../ui/ParticleBurst";
import { Sparkline } from "../ui/Sparkline";
import { InsightAvatar } from "./InsightAvatar";

interface InsightCardProps {
  insight: Insight;
  index: number;
  onDismiss: (id: string) => void;
}

const PRIORITY_META: Record<InsightPriority, { stars: number; label: string; badgeClass: string; borderClass: string; ringColor: string }> = {
  critical: { stars: 5, label: "Crítica", badgeClass: "bg-danger-muted text-danger", borderClass: "border-danger/40", ringColor: "var(--color-danger)" },
  high: { stars: 4, label: "Alta", badgeClass: "bg-warning-muted text-warning", borderClass: "border-warning/40", ringColor: "var(--color-warning)" },
  medium: { stars: 3, label: "Media", badgeClass: "bg-primary-muted text-primary", borderClass: "border-primary/30", ringColor: "var(--color-primary)" },
  low: { stars: 2, label: "Baja", badgeClass: "bg-surface-muted text-text-secondary", borderClass: "border-border", ringColor: "var(--color-text-secondary)" },
  informational: { stars: 1, label: "Informativa", badgeClass: "bg-surface-muted text-text-secondary", borderClass: "border-border", ringColor: "var(--color-text-secondary)" },
};

const TYPE_META: Record<InsightType, { label: string; icon: LucideIcon }> = {
  achievement: { label: "Logro", icon: Trophy },
  risk: { label: "Riesgo", icon: ShieldAlert },
  trend: { label: "Tendencia", icon: TrendingUp },
  prediction: { label: "Predicción", icon: Wand2 },
  correlation: { label: "Correlación", icon: Link2 },
  recommendation: { label: "Recomendación", icon: Lightbulb },
  motivation: { label: "Motivación", icon: Flame },
  celebration: { label: "Celebración", icon: PartyPopper },
  reminder: { label: "Recordatorio", icon: BellRing },
  curiosity: { label: "Curiosidad", icon: Eye },
  related_habits: { label: "Hábitos relacionados", icon: Link2 },
  next_goal: { label: "Próxima meta", icon: Target },
};

const ACTION_ICON: Record<InsightActionKind, LucideIcon> = {
  register: CheckCircle2,
  start: Play,
  postpone: Clock,
  view_details: ChevronDown,
  go_to_habit: ArrowRight,
  view_stats: BarChart3,
};

function PriorityStars({ priority }: { priority: InsightPriority }) {
  const { stars, label } = PRIORITY_META[priority];
  return (
    <span className="flex items-center gap-0.5" aria-label={`Prioridad: ${label}`} title={`Prioridad: ${label}`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={11}
          className={index < stars ? "fill-current text-current" : "text-border-strong"}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export function InsightCard({ insight, index, onDismiss }: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const priorityMeta = PRIORITY_META[insight.priority];
  const typeMeta = TYPE_META[insight.type];
  const TypeIcon = typeMeta.icon;
  const isCelebratory = insight.type === "achievement" || insight.type === "celebration";

  function runAction(action: InsightAction) {
    if (action.href) navigate(action.href);
    if (action.kind === "postpone") onDismiss(insight.id);
  }

  return (
    <Card
      layout
      variant="elevated"
      interactive
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }}
      transition={{ duration: 0.3, delay: prefersReducedMotion ? 0 : index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className={clsx("relative w-[300px] shrink-0 snap-center overflow-hidden border sm:w-full", priorityMeta.borderClass)}
    >
      {isCelebratory && <ParticleBurst className="left-6 top-6" />}

      <div className="flex items-start gap-3">
        <InsightAvatar />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-text-secondary">
              <TypeIcon size={11} aria-hidden="true" />
              {typeMeta.label}
            </span>
            <span className="text-[11px] text-text-disabled">{insight.category}</span>
            <span className={clsx("ml-auto inline-flex items-center rounded-full px-2 py-0.5", priorityMeta.badgeClass)}>
              <PriorityStars priority={insight.priority} />
            </span>
          </div>
          <p className="mt-1.5 text-sm font-semibold text-text-primary">{insight.title}</p>
          <p className={clsx("mt-1 text-sm text-text-secondary", !isExpanded && "line-clamp-2")}>{insight.analysis}</p>
        </div>
        <IconButton icon={<X size={15} />} label="Descartar insight" onClick={() => onDismiss(insight.id)} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <CircularProgress percentage={insight.confidence} size={44} strokeWidth={4} color={priorityMeta.ringColor}>
          <span className="text-[11px] font-bold text-text-primary">{insight.confidence}%</span>
        </CircularProgress>
        <div className="text-[11px] leading-tight text-text-disabled">
          Confianza
          <br />
          del modelo
        </div>

        {insight.impact && (
          <div className="flex items-center gap-1.5 rounded-lg bg-surface-muted px-2.5 py-1.5">
            {insight.impact.direction === "up" ? (
              <TrendingUp size={14} className="text-success" aria-hidden="true" />
            ) : (
              <TrendingDown size={14} className="text-danger" aria-hidden="true" />
            )}
            <span className="text-sm font-semibold text-text-primary">
              {insight.impact.direction === "up" ? "+" : "-"}
              {insight.impact.value}
              {insight.impact.unit}
            </span>
            <span className="text-xs text-text-secondary">{insight.impact.label}</span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            aria-expanded={isExpanded}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {isExpanded ? "Ver menos" : "Ver detalles"}
            <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={14} aria-hidden="true" />
            </motion.span>
          </button>
          <button
            type="button"
            onClick={() => runAction(insight.action)}
            className="shadow-glow inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {insight.action.label}
            <ArrowRight size={13} aria-hidden="true" />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-disabled">Evidencia</p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {insight.evidence.map((point) => (
                    <li key={point.label} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-text-secondary">{point.label}</span>
                      <span className="font-medium text-text-primary">{point.value}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {insight.trendData && (
                <div className="flex items-center gap-3 rounded-lg bg-surface-muted px-3 py-2">
                  <Sparkline data={insight.trendData} color={priorityMeta.ringColor} />
                  <span className="text-xs text-text-secondary">Tendencia reciente de cumplimiento</span>
                </div>
              )}

              {insight.expectedBenefit && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-disabled">Beneficio esperado</p>
                  <p className="text-sm text-text-primary">{insight.expectedBenefit}</p>
                </div>
              )}

              {insight.secondaryActions && insight.secondaryActions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {insight.secondaryActions.map((action) => {
                    const ActionIcon = ACTION_ICON[action.kind];
                    return (
                      <button
                        key={action.label}
                        type="button"
                        onClick={() => runAction(action)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-border-strong hover:bg-surface-muted hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        <ActionIcon size={13} aria-hidden="true" />
                        {action.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => onDismiss(insight.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-border-strong hover:bg-surface-muted hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <Clock size={13} aria-hidden="true" />
                    Posponer
                  </button>
                </div>
              )}

              <p className="text-[11px] text-text-disabled">Analizado el {formatFullDate(insight.analyzedAt)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
