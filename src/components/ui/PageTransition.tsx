import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";

export function PageTransition() {
  const location = useLocation();

  // BUG-PROD-002: mode="wait" mantiene la página SALIENTE montada y no monta
  // la ENTRANTE hasta que termine su animación de salida — si esa espera
  // queda interrumpida (p. ej. una navegación mientras la anterior seguía
  // saliendo), AnimatePresence puede quedar sin ningún hijo montado hasta
  // que algo fuerce un remount completo (F5). El modo por defecto (sin
  // "wait") monta la página entrante de inmediato mientras la saliente
  // termina de desvanecerse, eliminando esa ventana sin contenido.
  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}
