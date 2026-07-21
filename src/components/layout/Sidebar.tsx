import { NavLink } from "react-router-dom";
import { Flame } from "lucide-react";
import clsx from "clsx";
import { primaryNavigation } from "../../routes/navigation";
import { mockUser } from "../../data/mockUser";

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
      <div className="flex items-center gap-2 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
          <Flame size={18} aria-hidden="true" />
        </span>
        <span className="text-base font-semibold text-text-primary">Habit Tracker</span>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Navegación principal">
        {primaryNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  isActive
                    ? "bg-primary-muted text-primary"
                    : "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
                )
              }
            >
              <Icon size={18} aria-hidden="true" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <NavLink
        to="/settings"
        className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-surface-muted"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-muted text-sm font-semibold text-primary">
          {mockUser.name.charAt(0)}
        </span>
        <span className="flex flex-col overflow-hidden">
          <span className="truncate font-medium text-text-primary">{mockUser.name}</span>
          <span className="truncate text-xs text-text-secondary">{mockUser.email}</span>
        </span>
      </NavLink>
    </aside>
  );
}
