import { AnimatePresence, motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import { X } from "lucide-react";
import { mobileMoreNavigation } from "../../routes/navigation";
import { IconButton } from "../ui/IconButton";

interface MobileMoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMoreMenu({ isOpen, onClose }: MobileMoreMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end bg-black/60 md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
          <motion.div
            className="glass-surface shadow-elevation-3 relative w-full rounded-t-2xl border-b-0 bg-surface-elevated p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
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
                      `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
