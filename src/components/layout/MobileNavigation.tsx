import { useId, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { mobileMoreNavigation, mobilePrimaryNavigation } from "../../routes/navigation";
import { MobileMoreMenu } from "./MobileMoreMenu";

export function MobileNavigation() {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const location = useLocation();
  const isMoreActive = mobileMoreNavigation.some((item) => location.pathname.startsWith(item.path));
  const indicatorId = useId();

  return (
    <>
      <nav
        className="glass-surface fixed inset-x-0 bottom-0 z-30 flex border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden"
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
                  "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium",
                  isActive ? "text-primary" : "text-text-secondary",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId={`mobile-nav-active-${indicatorId}`}
                      className="absolute top-1 h-8 w-8 rounded-xl bg-primary-muted"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <Icon size={20} aria-hidden="true" className="relative z-10" />
                  <span className="relative z-10">{item.shortLabel ?? item.label}</span>
                </>
              )}
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
