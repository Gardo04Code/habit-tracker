import clsx from "clsx";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={clsx("relative overflow-hidden rounded-lg bg-surface-muted", className)} aria-hidden="true">
      <div className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-text-primary/10 to-transparent" />
    </div>
  );
}
