import type { Category } from "../types/habit";

export const mockCategories: Category[] = [
  { id: "cat-salud", name: "Salud", color: "#2eaf76", icon: "heart-pulse" },
  { id: "cat-bienestar", name: "Bienestar", color: "#7c5ce7", icon: "sparkles" },
  { id: "cat-aprendizaje", name: "Aprendizaje", color: "#4f6df5", icon: "book-open" },
  { id: "cat-productividad", name: "Productividad", color: "#e5a437", icon: "check-circle-2" },
  { id: "cat-ejercicio", name: "Ejercicio", color: "#f08a3c", icon: "dumbbell" },
  { id: "cat-sueno", name: "Sueño", color: "#4f6df5", icon: "moon" },
];

export function getCategoryById(id: string): Category | undefined {
  return mockCategories.find((category) => category.id === id);
}
