import { useLocation } from "react-router-dom";
import { Bell, Flame } from "lucide-react";
import { primaryNavigation } from "../../routes/navigation";
import { IconButton } from "../ui/IconButton";
import { mockUser } from "../../data/mockUser";

export function TopHeader() {
  const location = useLocation();
  const currentItem = primaryNavigation.find((item) =>
    item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path),
  );

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 lg:hidden">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
          <Flame size={16} aria-hidden="true" />
        </span>
        <span className="text-sm font-semibold text-text-primary">Habit Tracker</span>
      </div>

      <h1 className="hidden text-lg font-semibold text-text-primary lg:block">
        {currentItem?.label ?? "Habit Tracker"}
      </h1>

      <div className="flex items-center gap-2">
        <IconButton icon={<Bell size={18} />} label="Notificaciones" variant="secondary" />
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-muted text-sm font-semibold text-primary"
          aria-hidden="true"
        >
          {mockUser.name.charAt(0)}
        </span>
      </div>
    </header>
  );
}
