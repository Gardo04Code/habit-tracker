import type { ComponentType } from "react";

export interface NavigationItem {
  id: string;
  label: string;
  shortLabel?: string;
  path: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}
