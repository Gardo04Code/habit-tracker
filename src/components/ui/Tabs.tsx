import clsx from "clsx";

export interface TabItem {
  value: string;
  label: string;
  count?: number;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
}

export function Tabs({ items, value, onChange }: TabsProps) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto rounded-lg bg-surface-muted p-1">
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.value)}
            className={clsx(
              "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              isActive ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="rounded-full bg-surface-muted px-1.5 text-xs text-text-secondary">
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
