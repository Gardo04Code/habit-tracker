import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-text-secondary">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <p className="mt-1 max-w-xs text-sm text-text-secondary">{description}</p>
      </div>
      {action}
    </div>
  );
}
