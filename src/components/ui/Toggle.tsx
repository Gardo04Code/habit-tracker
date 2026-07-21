import { useId } from "react";
import clsx from "clsx";

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  disabled?: boolean;
}

export function Toggle({ label, checked, onChange, hint, disabled }: ToggleProps) {
  const id = useId();

  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-text-primary">
          {label}
        </label>
        {hint && <p className="text-xs text-text-secondary">{hint}</p>}
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
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}
