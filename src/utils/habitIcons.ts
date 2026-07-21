import {
  BookOpen,
  Brain,
  Dumbbell,
  Footprints,
  GlassWater,
  GraduationCap,
  HeartPulse,
  Moon,
  NotebookPen,
  Pencil,
  Sparkles,
  Sun,
  type LucideIcon,
} from "lucide-react";

export const HABIT_ICON_OPTIONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "glass-water", label: "Vaso de agua", icon: GlassWater },
  { value: "book-open", label: "Libro", icon: BookOpen },
  { value: "dumbbell", label: "Pesa", icon: Dumbbell },
  { value: "moon", label: "Luna", icon: Moon },
  { value: "sparkles", label: "Destellos", icon: Sparkles },
  { value: "graduation-cap", label: "Birrete", icon: GraduationCap },
  { value: "notebook-pen", label: "Cuaderno", icon: NotebookPen },
  { value: "heart-pulse", label: "Salud", icon: HeartPulse },
  { value: "sun", label: "Sol", icon: Sun },
  { value: "footprints", label: "Pasos", icon: Footprints },
  { value: "brain", label: "Mente", icon: Brain },
  { value: "pencil", label: "Lápiz", icon: Pencil },
];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  HABIT_ICON_OPTIONS.map((option) => [option.value, option.icon]),
);

export function getHabitIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] ?? Sparkles;
}

export const HABIT_COLOR_OPTIONS = [
  "#4f6df5",
  "#7c5ce7",
  "#2eaf76",
  "#e5a437",
  "#f08a3c",
  "#dc6673",
  "#0ea5b8",
  "#64748b",
];
