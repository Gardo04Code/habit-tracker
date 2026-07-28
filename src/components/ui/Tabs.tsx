import { useId } from "react";
import { motion } from "framer-motion";
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
  const indicatorId = useId();

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
              "relative flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              isActive ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {isActive && (
              <motion.span
                layoutId={`tabs-indicator-${indicatorId}`}
                className="absolute inset-0 rounded-md bg-surface shadow-elevation-1"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {item.label}
              {item.count !== undefined && (
                <span className="rounded-full bg-surface-muted px-1.5 text-xs text-text-secondary">
                  {item.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
