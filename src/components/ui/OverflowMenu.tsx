import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MoreVertical } from "lucide-react";
import clsx from "clsx";
import { IconButton } from "./IconButton";

export interface OverflowMenuItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: "default" | "danger";
}

interface OverflowMenuProps {
  items: OverflowMenuItem[];
  label?: string;
}

const MENU_WIDTH = 208;

/**
 * El dropdown se porta a document.body: si viviera dentro del árbol normal
 * quedaría atrapado en el contexto de apilamiento que crea el `transform`
 * de TiltCard, y se recortaría bajo la siguiente tarjeta del grid.
 */
export function OverflowMenu({ items, label = "Más acciones" }: OverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        top: rect.bottom + 8,
        left: Math.max(8, rect.right - MENU_WIDTH),
      });
    }
    setIsOpen(true);
  }

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    function handleScrollOrResize() {
      setIsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  return (
    <>
      <IconButton
        ref={triggerRef}
        icon={<MoreVertical size={16} />}
        label={label}
        variant="secondary"
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      />
      {createPortal(
        <AnimatePresence>
          {isOpen && position && (
            <motion.div
              ref={menuRef}
              role="menu"
              aria-label={label}
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{ position: "fixed", top: position.top, left: position.left, width: MENU_WIDTH }}
              className="glass-surface shadow-elevation-3 z-50 overflow-hidden rounded-xl bg-surface-elevated p-1.5"
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    item.onClick();
                    setIsOpen(false);
                  }}
                  className={clsx(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    item.tone === "danger"
                      ? "text-danger hover:bg-danger-muted"
                      : "text-text-primary hover:bg-surface-muted",
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
