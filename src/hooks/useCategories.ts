import { useCallback, useEffect, useState } from "react";
import { isSupabaseDataSource } from "../lib/dataSource";
import { normalizeSupabaseError } from "../lib/errors";
import { mockCategories as mockCategoriesSeed } from "../data/mockCategories";
import {
  categoriesService,
  type Category,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
} from "../services/categories.service";

// Modelo visual, independiente de la forma exacta de la fila de Supabase —
// el componente que consume este hook no necesita saber si viene de
// `Database["public"]["Tables"]["categories"]["Row"]` (snake_case,
// `lifecycle_status`) o de un mock plano (`src/types/habit.ts`, sin estado).
// En modo mock, todas las categorías nacen "active": los mocks nunca
// tuvieron papelera, así que no hay un estado real que traducir.
export interface CategoryViewModel {
  id: string;
  name: string;
  color: string;
  icon: string;
  lifecycleStatus: "active" | "deleted";
}

function fromRow(row: Category): CategoryViewModel {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    lifecycleStatus: row.lifecycle_status,
  };
}

function byName(a: CategoryViewModel, b: CategoryViewModel): number {
  return a.name.localeCompare(b.name, "es");
}

function normalizedName(name: string): string {
  return name.trim().toLowerCase();
}

// Mismo mensaje que produciría Supabase (categories.service.ts) ante una
// violación del índice único normalizado — el componente que consume este
// hook no debe distinguir de dónde vino el error para mostrarlo.
function mockConflictError(operation: "create" | "restore"): Error {
  const message =
    operation === "restore"
      ? "No se pudo restaurar: ya tienes otra categoría activa con ese nombre. Cambia el nombre de una de las dos e inténtalo de nuevo."
      : "Ya tienes una categoría activa con ese nombre.";
  return new Error(message);
}

function mockEmptyNameError(): Error {
  return new Error("El nombre de la categoría no puede estar vacío.");
}

let mockSequence = 0;
function nextMockId(): string {
  mockSequence += 1;
  return `cat-mock-${Date.now()}-${mockSequence}`;
}

/**
 * Alterna entre datos mock (en memoria, sin persistencia entre recargas —
 * igual que el resto de los `use*Manager` del proyecto) y Supabase real,
 * según `VITE_DATA_SOURCE`. El componente que use este hook recibe siempre
 * la misma forma (`CategoryViewModel[]`, funciones que devuelven promesas),
 * sin ninguna rama condicional propia por origen de datos.
 */
export function useCategories() {
  const [categories, setCategories] = useState<CategoryViewModel[]>(() =>
    isSupabaseDataSource
      ? []
      : [...mockCategoriesSeed].sort((a, b) => a.name.localeCompare(b.name, "es")).map((c) => ({ ...c, lifecycleStatus: "active" as const })),
  );
  const [loading, setLoading] = useState(isSupabaseDataSource);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseDataSource) return;

    setLoading(true);
    setError(null);
    try {
      const rows = await categoriesService.getCategories();
      setCategories(rows.map(fromRow));
    } catch (caught) {
      setError(normalizeSupabaseError(caught).friendlyMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // No se llama a `refresh()` aquí (aunque haría lo mismo): su primera
  // línea ejecuta `setLoading(true)` de forma síncrona, y hacerlo dentro de
  // un efecto dispara "react-hooks/set-state-in-effect". `loading` ya nace
  // en `true` cuando isSupabaseDataSource (arriba), así que el efecto de
  // montaje solo necesita apagarlo al terminar — igual que el patrón ya
  // usado en AuthContext.tsx.
  useEffect(() => {
    if (!isSupabaseDataSource) return;
    let cancelled = false;

    categoriesService
      .getCategories()
      .then((rows) => {
        if (!cancelled) setCategories(rows.map(fromRow));
      })
      .catch((caught) => {
        if (!cancelled) setError(normalizeSupabaseError(caught).friendlyMessage);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const createCategory = useCallback(async (payload: CreateCategoryPayload): Promise<CategoryViewModel> => {
    if (!isSupabaseDataSource) {
      const name = payload.name.trim();
      if (!name) throw mockEmptyNameError();
      const conflict = categories.some(
        (c) => c.lifecycleStatus === "active" && normalizedName(c.name) === normalizedName(name),
      );
      if (conflict) throw mockConflictError("create");

      const created: CategoryViewModel = { id: nextMockId(), name, color: payload.color, icon: payload.icon, lifecycleStatus: "active" };
      setCategories((current) => [...current, created].sort(byName));
      return created;
    }

    const row = await categoriesService.createCategory(payload);
    const created = fromRow(row);
    setCategories((current) => [...current, created].sort(byName));
    return created;
  }, [categories]);

  const updateCategory = useCallback(async (id: string, payload: UpdateCategoryPayload): Promise<CategoryViewModel> => {
    if (!isSupabaseDataSource) {
      const name = payload.name.trim();
      if (!name) throw mockEmptyNameError();
      const conflict = categories.some(
        (c) => c.id !== id && c.lifecycleStatus === "active" && normalizedName(c.name) === normalizedName(name),
      );
      if (conflict) throw mockConflictError("create");

      let updated: CategoryViewModel | undefined;
      setCategories((current) =>
        current
          .map((c) => {
            if (c.id !== id) return c;
            updated = { ...c, name };
            return updated;
          })
          .sort(byName),
      );
      if (!updated) throw new Error("No encontramos esa categoría.");
      return updated;
    }

    const row = await categoriesService.updateCategory(id, payload);
    const updated = fromRow(row);
    setCategories((current) => current.map((c) => (c.id === id ? updated : c)).sort(byName));
    return updated;
  }, [categories]);

  const softDeleteCategory = useCallback(async (id: string): Promise<CategoryViewModel> => {
    if (!isSupabaseDataSource) {
      let updated: CategoryViewModel | undefined;
      setCategories((current) =>
        current.map((c) => {
          if (c.id !== id) return c;
          updated = { ...c, lifecycleStatus: "deleted" };
          return updated;
        }),
      );
      if (!updated) throw new Error("No encontramos esa categoría.");
      return updated;
    }

    const row = await categoriesService.softDeleteCategory(id);
    const updated = fromRow(row);
    setCategories((current) => current.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const restoreCategory = useCallback(async (id: string): Promise<CategoryViewModel> => {
    if (!isSupabaseDataSource) {
      const target = categories.find((c) => c.id === id);
      if (!target) throw new Error("No encontramos esa categoría.");
      const conflict = categories.some(
        (c) => c.id !== id && c.lifecycleStatus === "active" && normalizedName(c.name) === normalizedName(target.name),
      );
      if (conflict) throw mockConflictError("restore");

      let updated: CategoryViewModel | undefined;
      setCategories((current) =>
        current.map((c) => {
          if (c.id !== id) return c;
          updated = { ...c, lifecycleStatus: "active" };
          return updated;
        }),
      );
      if (!updated) throw new Error("No encontramos esa categoría.");
      return updated;
    }

    const row = await categoriesService.restoreCategory(id);
    const updated = fromRow(row);
    setCategories((current) => current.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, [categories]);

  return {
    categories,
    loading,
    error,
    refresh,
    createCategory,
    updateCategory,
    softDeleteCategory,
    restoreCategory,
  };
}
