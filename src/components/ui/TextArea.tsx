import { useId, type TextareaHTMLAttributes } from "react";
import clsx from "clsx";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
}

export function TextArea({ label, hint, id, className, ...rest }: TextAreaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={textareaId} className="text-sm font-medium text-text-primary">
        {label}
      </label>
      <textarea
        id={textareaId}
        className={clsx(
          "min-h-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary",
          "placeholder:text-text-disabled",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          className,
        )}
        aria-describedby={hint ? `${textareaId}-hint` : undefined}
        {...rest}
      />
      {hint && (
        <span id={`${textareaId}-hint`} className="text-xs text-text-secondary">
          {hint}
        </span>
      )}
    </div>
  );
}
