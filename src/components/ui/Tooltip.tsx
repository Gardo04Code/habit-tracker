import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import clsx from "clsx";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}

interface Position {
  left: number;
  top?: number;
  bottom?: number;
}

/**
 * El panel flotante se porta a document.body: si viviera dentro del árbol
 * normal quedaría recortado por cualquier ancestro con overflow-x-auto (el
 * carril de la línea de tiempo), ya que CSS fuerza overflow-y a clip cuando
 * solo se define overflow-x. Mismo problema y misma solución que OverflowMenu.
 */
export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const tooltipId = useId();
  const triggerRef = useRef<HTMLDivElement>(null);

  function show() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const left = rect.left + rect.width / 2;
      setPosition(
        side === "top" ? { left, bottom: window.innerHeight - rect.top + 8 } : { left, top: rect.bottom + 8 },
      );
    }
    setIsOpen(true);
  }

  function hide() {
    setIsOpen(false);
  }

  useEffect(() => {
    if (!isOpen) return;
    function handleScrollOrResize() {
      hide();
    }
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  return (
    <div
      ref={triggerRef}
      className={clsx("relative inline-flex", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <div aria-describedby={isOpen ? tooltipId : undefined}>{children}</div>
      {createPortal(
        <AnimatePresence>
          {isOpen && position && (
            <motion.div
              role="tooltip"
              id={tooltipId}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "fixed",
                left: position.left,
                top: position.top,
                bottom: position.bottom,
                transform: "translateX(-50%)",
              }}
              className="glass-surface shadow-elevation-3 pointer-events-none z-50 w-max max-w-[240px] rounded-xl bg-surface-elevated px-3 py-2 text-xs text-text-primary"
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
