import { motion, useReducedMotion } from "framer-motion";
import { getHabitAccent } from "../../utils/habitAccent";
import { getHabitIcon } from "../../utils/habitIcons";
import { lightenHex } from "../../utils/chartColors";

interface HabitIcon3DProps {
  iconName: string;
  size?: number;
  celebrate?: boolean;
  /** Color base a usar en vez del acento fijo por tipo de ícono — para
   * hábitos con color personalizado (Mis hábitos, formulario). */
  color?: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Ícono "pseudo-3D" (gradiente + glow + capa de brillo superior), mismo
 * lenguaje visual en toda la app: racha, insights, checklist y hábitos. */
export function HabitIcon3D({ iconName, size = 44, celebrate = false, color }: HabitIcon3DProps) {
  const accent = getHabitAccent(iconName);
  const base = color ?? accent.base;
  const light = color ? lightenHex(color, 0.35) : accent.light;
  const glow = color ? hexToRgba(color, 0.45) : accent.glow;
  const Icon = getHabitIcon(iconName);
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className="relative shrink-0 rounded-2xl"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(145deg, ${light}, ${base})`,
        boxShadow: `0 6px 16px -4px ${glow}, inset 0 1px 1px rgba(255,255,255,0.4)`,
      }}
    >
      <div className="absolute inset-x-1.5 top-1 h-1/3 rounded-full bg-white/30 blur-[2px]" />
      <div className="relative flex h-full w-full items-center justify-center">
        {/* eslint-disable-next-line react-hooks/static-components -- getHabitIcon resolves a stable reference from a static icon map, it never defines a new component type. */}
        <Icon size={size * 0.48} className="text-white drop-shadow-sm" strokeWidth={2.2} />
      </div>
      {celebrate && !prefersReducedMotion && (
        <motion.span
          className="absolute inset-0 rounded-2xl"
          style={{ boxShadow: `0 0 0 0 ${glow}` }}
          initial={{ boxShadow: `0 0 0 0 ${glow}`, opacity: 1 }}
          animate={{ boxShadow: `0 0 0 10px rgba(0,0,0,0)`, opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
