import { useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  hint?: string;
}

export function Select({ label, options, hint, id, className, ...rest }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-text-primary">
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          className={clsx(
            "h-10 w-full appearance-none rounded-lg border border-border bg-surface px-3 pr-9 text-sm text-text-primary",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            className,
          )}
          aria-describedby={hint ? `${selectId}-hint` : undefined}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
          aria-hidden="true"
        />
      </div>
      {hint && (
        <span id={`${selectId}-hint`} className="text-xs text-text-secondary">
          {hint}
        </span>
      )}
    </div>
  );
}
