import { Laptop, Moon, Sun } from "lucide-react";
import clsx from "clsx";
import type { ThemePreference } from "../../hooks/useSettingsForm";
import { Card } from "../ui/Card";
import { SectionHeader } from "../ui/SectionHeader";

interface AppearanceSectionProps {
  theme: ThemePreference;
  onThemeChange: (value: ThemePreference) => void;
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Laptop },
];

export function AppearanceSection({ theme, onThemeChange }: AppearanceSectionProps) {
  return (
    <Card className="flex flex-col gap-4">
      <SectionHeader
        title="Apariencia"
        description="El modo oscuro estará disponible próximamente; esta preferencia se guardará para entonces."
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
                "flex flex-col items-center gap-2 rounded-xl border px-4 py-4 text-sm font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                isSelected ? "border-primary bg-primary-muted text-primary" : "border-border bg-surface text-text-secondary hover:bg-surface-muted",
              )}
            >
              <Icon size={20} aria-hidden="true" />
              {option.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
