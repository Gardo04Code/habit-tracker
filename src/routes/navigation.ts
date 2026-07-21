import { BarChart3, History, LayoutDashboard, ListChecks, Repeat, Settings, Target } from "lucide-react";
import type { NavigationItem } from "../types/navigation";

export const primaryNavigation: NavigationItem[] = [
  { id: "dashboard", label: "Dashboard", path: "/", icon: LayoutDashboard },
  { id: "checklist", label: "Checklist diario", path: "/checklist", icon: ListChecks },
  { id: "habits", label: "Mis hábitos", path: "/habits", icon: Repeat },
  { id: "history", label: "Historial", path: "/history", icon: History },
  { id: "statistics", label: "Estadísticas", path: "/statistics", icon: BarChart3 },
  { id: "goals", label: "Metas", path: "/goals", icon: Target },
  { id: "settings", label: "Configuración", path: "/settings", icon: Settings },
];

export const mobilePrimaryNavigation: NavigationItem[] = [
  primaryNavigation[0],
  primaryNavigation[1],
  primaryNavigation[2],
  primaryNavigation[4],
];

export const mobileMoreNavigation: NavigationItem[] = [
  primaryNavigation[3],
  primaryNavigation[5],
  primaryNavigation[6],
];
