import { NavLink } from "react-router-dom";
import { X } from "lucide-react";
import { mobileMoreNavigation } from "../../routes/navigation";
import { IconButton } from "../ui/IconButton";

interface MobileMoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMoreMenu({ isOpen, onClose }: MobileMoreMenuProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-text-primary/40 lg:hidden">
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full rounded-t-2xl bg-surface p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Más opciones</h2>
          <IconButton icon={<X size={18} />} label="Cerrar" onClick={onClose} />
        </div>
        <nav className="flex flex-col gap-1" aria-label="Más opciones de navegación">
          {mobileMoreNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${
                    isActive ? "bg-primary-muted text-primary" : "text-text-secondary hover:bg-surface-muted"
                  }`
                }
              >
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
