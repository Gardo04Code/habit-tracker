import { useId } from "react";
import { Check, Laptop, Moon, Palette, Sun } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";
import type { ThemePreference } from "../../hooks/useTheme";
import { Card } from "../ui/Card";
import { SectionHeader } from "../ui/SectionHeader";

interface AppearanceSectionProps {
  theme: ThemePreference;
  onThemeChange: (value: ThemePreference) => void;
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun; preview: string }[] = [
  { value: "light", label: "Claro", icon: Sun, preview: "bg-gradient-to-br from-slate-100 to-slate-300" },
  { value: "dark", label: "Oscuro", icon: Moon, preview: "bg-gradient-to-br from-slate-800 to-slate-950" },
  { value: "system", label: "Sistema", icon: Laptop, preview: "bg-gradient-to-br from-slate-300 via-slate-600 to-slate-950" },
];

export function AppearanceSection({ theme, onThemeChange }: AppearanceSectionProps) {
  const indicatorId = useId();

  return (
    <Card className="flex h-full flex-col gap-4">
      <SectionHeader
        icon={<Palette size={18} aria-hidden="true" />}
        title="Apariencia"
        description="Elige cómo se ve Habit Tracker. El tema se aplica de inmediato."
      />

      <div role="radiogroup" aria-label="Tema de la aplicación" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onThemeChange(option.value)}
              className={clsx(
                "relative flex flex-col items-center gap-2 overflow-hidden rounded-xl border p-2 text-sm font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                isSelected ? "border-primary" : "border-border hover:border-border-strong",
              )}
            >
              {isSelected && (
                <motion.span
                  layoutId={`appearance-active-${indicatorId}`}
                  className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-primary-muted"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span className={clsx("relative flex h-16 w-full items-center justify-center rounded-lg", option.preview)}>
                <Icon size={22} className="text-white drop-shadow" aria-hidden="true" />
                {isSelected && (
                  <span className="shadow-elevation-1 absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                    <Check size={12} aria-hidden="true" />
                  </span>
                )}
              </span>
              <span className={isSelected ? "text-primary" : "text-text-secondary"}>{option.label}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
