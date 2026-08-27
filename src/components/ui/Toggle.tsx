import { useId, type ReactNode } from "react";
import clsx from "clsx";

export type ToggleTone = "primary" | "success" | "warning" | "danger" | "info";

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  disabled?: boolean;
  icon?: ReactNode;
  tone?: ToggleTone;
}

const TONE_CLASSES: Record<ToggleTone, string> = {
  primary: "bg-primary-muted text-primary",
  success: "bg-success-muted text-success",
  warning: "bg-warning-muted text-warning",
  danger: "bg-danger-muted text-danger",
  info: "bg-info-muted text-info",
};

export function Toggle({ label, checked, onChange, hint, disabled, icon, tone = "primary" }: ToggleProps) {
  const id = useId();

  return (
    // BUG-PROD-003: sin min-w-0 en el bloque izquierdo, el min-width:auto
    // por defecto de flexbox impedía que el texto (label/hint largos, p. ej.
    // "Permitir registros parciales") se ajustara al espacio disponible —
    // la fila entera desbordaba y empujaba el switch fuera del contenedor
    // visible en viewports angostos (320-375px). min-w-0 en ambos niveles
    // deja que el texto se ajuste (wrap) dentro del espacio real en vez de
    // forzar el desborde; el switch conserva shrink-0 para no comprimirse.
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {icon && (
          <span className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", TONE_CLASSES[tone])} aria-hidden="true">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <label htmlFor={id} className="text-sm font-medium text-text-primary">
            {label}
          </label>
          {hint && <p className="text-xs text-text-secondary">{hint}</p>}
        </div>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          "disabled:cursor-not-allowed disabled:opacity-60",
          checked ? "bg-primary" : "bg-surface-muted",
        )}
      >
        <span
          className={clsx(
            "absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}
