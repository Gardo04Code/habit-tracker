import { useLocation } from "react-router-dom";
import { Bell, Flame, LogOut } from "lucide-react";
import { primaryNavigation } from "../../routes/navigation";
import { IconButton } from "../ui/IconButton";
import { mockUser } from "../../data/mockUser";
import { useAuth } from "../../hooks/useAuth";
import { isSupabaseDataSource } from "../../lib/dataSource";

export function TopHeader() {
  const location = useLocation();
  const { signOut } = useAuth();
  const currentItem = primaryNavigation.find((item) =>
    item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path),
  );

  return (
    <header className="glass-surface sticky top-0 z-30 flex h-16 items-center justify-between border-x-0 border-t-0 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 md:hidden">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
          <Flame size={16} aria-hidden="true" />
        </span>
        <span className="text-sm font-semibold text-text-primary">Habit Tracker</span>
      </div>

      <h1 className="hidden text-lg font-semibold tracking-tight text-text-primary md:block">
        {currentItem?.label ?? "Habit Tracker"}
      </h1>

      <div className="flex items-center gap-2">
        {isSupabaseDataSource && (
          <IconButton
            icon={<LogOut size={18} />}
            label="Cerrar sesión"
            variant="secondary"
            onClick={() => {
              void signOut();
            }}
          />
        )}
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
