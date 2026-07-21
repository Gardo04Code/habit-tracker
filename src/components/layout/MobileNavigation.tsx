import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import clsx from "clsx";
import { mobileMoreNavigation, mobilePrimaryNavigation } from "../../routes/navigation";
import { MobileMoreMenu } from "./MobileMoreMenu";

export function MobileNavigation() {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const location = useLocation();
  const isMoreActive = mobileMoreNavigation.some((item) => location.pathname.startsWith(item.path));

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Navegación móvil"
      >
        {mobilePrimaryNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                clsx(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium",
                  isActive ? "text-primary" : "text-text-secondary",
                )
              }
            >
              <Icon size={20} aria-hidden="true" />
              {item.label.split(" ")[0]}
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={() => setIsMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isMoreOpen}
          className={clsx(
            "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium",
            isMoreActive ? "text-primary" : "text-text-secondary",
          )}
        >
          <MoreHorizontal size={20} aria-hidden="true" />
          Más
        </button>
      </nav>
      <MobileMoreMenu isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} />
    </>
  );
}
