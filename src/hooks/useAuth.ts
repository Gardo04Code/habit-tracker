// Re-exporta el hook definido junto a su Provider en
// src/contexts/AuthContext.tsx (mismo patrón de colocación que
// src/hooks/useTheme.tsx). Este archivo existe solo para que `useAuth` sea
// localizable donde viven los demás hooks del proyecto.
export { useAuth } from "../contexts/AuthContext";
