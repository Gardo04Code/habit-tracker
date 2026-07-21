import { useId, type InputHTMLAttributes } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, id, className, ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
        {label}
      </label>
      <input
        id={inputId}
        className={clsx(
          "h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary",
          "placeholder:text-text-disabled",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          error && "border-danger",
          className,
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...rest}
      />
      {error ? (
        <span id={`${inputId}-error`} className="text-xs text-danger">
          {error}
        </span>
      ) : hint ? (
        <span id={`${inputId}-hint`} className="text-xs text-text-secondary">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
