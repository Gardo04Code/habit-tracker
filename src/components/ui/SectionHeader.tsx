import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}
