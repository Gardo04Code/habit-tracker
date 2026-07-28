import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function SectionHeader({ title, description, action, icon }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="shadow-elevation-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-muted text-primary" aria-hidden="true">
            {icon}
          </span>
        )}
        <div>
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-text-secondary">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
