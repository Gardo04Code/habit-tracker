import { lazy, Suspense, useState } from "react";
import clsx from "clsx";
import type { StatusBreakdownPoint } from "../../types/dashboard";
import type { HabitStatus } from "../../types/habit";
import { getStatusColorVar, getStatusLabel } from "../../utils/habitStatus";
import { Skeleton } from "../ui/Skeleton";

const StatusDonut3D = lazy(() =>
  import("./StatusDonut3D").then((module) => ({ default: module.StatusDonut3D })),
);

interface ProgressDonutProps {
  data: StatusBreakdownPoint[];
}

export function ProgressDonut({ data }: ProgressDonutProps) {
  const [activeStatus, setActiveStatus] = useState<HabitStatus | null>(null);
  const total = data.reduce((sum, point) => sum + point.count, 0);

  return (
    <div className="flex flex-col items-center gap-5">
      <Suspense fallback={<Skeleton className="h-[280px] w-[280px] shrink-0 rounded-full" />}>
        <StatusDonut3D data={data} activeStatus={activeStatus} onHoverStatus={setActiveStatus} />
      </Suspense>
      <ul className="flex w-full flex-col gap-0.5 text-sm">
        {data.map((point) => (
          <li
            key={point.status}
            className={clsx(
              "flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors",
              activeStatus === point.status && "bg-surface-muted",
            )}
            onMouseEnter={() => setActiveStatus(point.status)}
            onMouseLeave={() => setActiveStatus(null)}
          >
            <span className="flex min-w-0 items-center gap-2 text-text-secondary">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: getStatusColorVar(point.status) }}
                aria-hidden="true"
              />
              <span className="truncate">{getStatusLabel(point.status)}</span>
            </span>
            <span className="shrink-0 whitespace-nowrap font-medium text-text-primary">
              {point.count} · {total > 0 ? Math.round((point.count / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
