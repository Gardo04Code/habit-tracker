import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
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
/** Separación entre el trigger y el menú. */
const GAP = 8;
/** Margen mínimo respecto a cualquier borde del viewport. */
const VIEWPORT_MARGIN = 8;

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Resuelve la posición final del menú evitando que se salga del viewport.
 * Vertical: prioriza abrir hacia abajo; si no cabe pero sí cabe arriba, abre
 * hacia arriba; si no cabe completamente en ningún sentido, lo deja dentro
 * del viewport (el propio menú aplica max-height + scroll interno).
 * Horizontal: clamp simétrico contra ambos bordes.
 */
function computeMenuPosition(anchor: DOMRect, menuWidth: number, menuHeight: number) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - anchor.bottom;
  const spaceAbove = anchor.top;

  let top: number;
  if (spaceBelow >= menuHeight + GAP) {
    top = anchor.bottom + GAP;
  } else if (spaceAbove >= menuHeight + GAP) {
    top = anchor.top - GAP - menuHeight;
  } else {
    top = spaceBelow >= spaceAbove ? anchor.bottom + GAP : anchor.top - GAP - menuHeight;
  }
  const maxTop = Math.max(VIEWPORT_MARGIN, viewportHeight - menuHeight - VIEWPORT_MARGIN);
  top = clampNumber(top, VIEWPORT_MARGIN, maxTop);

  const maxLeft = Math.max(VIEWPORT_MARGIN, viewportWidth - menuWidth - VIEWPORT_MARGIN);
  const left = clampNumber(anchor.right - menuWidth, VIEWPORT_MARGIN, maxLeft);

  const maxHeight = Math.max(120, viewportHeight - VIEWPORT_MARGIN * 2);

  return { top, left, maxHeight };
}

/**
 * El dropdown se porta a document.body: si viviera dentro del árbol normal
 * quedaría atrapado en el contexto de apilamiento que crea el `transform`
 * de TiltCard, y se recortaría bajo la siguiente tarjeta del grid.
 */
export function OverflowMenu({ items, label = "Más acciones" }: OverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setAnchorRect(rect);
    setPosition(null);
    setIsOpen(true);
  }

  // Mide la altura real del menú (offsetHeight, inmune a la escala de la
  // animación de entrada de Framer Motion) antes del primer paint y recién
  // ahí fija la posición final — evita adivinar la altura con un número fijo,
  // ya que la cantidad de opciones varía por consumidor.
  useLayoutEffect(() => {
    if (!isOpen || !anchorRect || !menuRef.current) return;
    const menuEl = menuRef.current;
    const next = computeMenuPosition(anchorRect, MENU_WIDTH, menuEl.offsetHeight);
    setPosition(next);
  }, [isOpen, anchorRect]);

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
          {isOpen && anchorRect && (
            <motion.div
              ref={menuRef}
              role="menu"
              aria-label={label}
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{
                position: "fixed",
                // Mientras no se midió la altura real (useLayoutEffect corre
                // antes del paint), se mantiene oculto en la posición del
                // trigger para no parpadear en un lugar incorrecto.
                visibility: position ? "visible" : "hidden",
                top: position?.top ?? anchorRect.bottom,
                left: position?.left ?? Math.max(VIEWPORT_MARGIN, anchorRect.right - MENU_WIDTH),
                width: MENU_WIDTH,
                maxHeight: position?.maxHeight,
                overflowY: "auto",
              }}
              className="glass-surface shadow-elevation-3 z-50 overflow-x-hidden rounded-xl bg-surface-elevated p-1.5"
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
