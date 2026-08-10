import { useMemo, useState, type FormEvent } from "react";
import { Check, Pencil, Tag, Trash2, Undo2, X } from "lucide-react";
import clsx from "clsx";
import { Card } from "../ui/Card";
import { SectionHeader } from "../ui/SectionHeader";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { useCategories, type CategoryViewModel } from "../../hooks/useCategories";
import { getHabitIcon, HABIT_COLOR_OPTIONS, HABIT_ICON_OPTIONS } from "../../utils/habitIcons";
import { AppError } from "../../lib/errors";

// En modo Supabase, `caught` es siempre un AppError (categories.service.ts
// ya normaliza) — se usa `friendlyMessage`, nunca `.message` (que guarda el
// texto técnico/crudo de Postgres). En modo mock (useCategories.ts), los
// errores son `Error` planos ya redactados a mano como mensajes amigables
// (sin pasar por Supabase), así que `.message` es seguro de mostrar tal cual.
function errorMessage(caught: unknown): string {
  if (caught instanceof AppError) return caught.friendlyMessage;
  return caught instanceof Error ? caught.message : "Ocurrió un error inesperado. Intenta de nuevo.";
}

export function CategoriesSection() {
  const { categories, loading, error, createCategory, updateCategory, softDeleteCategory, restoreCategory } =
    useCategories();

  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState(HABIT_ICON_OPTIONS[0].value);
  const [newColor, setNewColor] = useState(HABIT_COLOR_OPTIONS[0]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const active = useMemo(() => categories.filter((c) => c.lifecycleStatus === "active"), [categories]);
  const deleted = useMemo(() => categories.filter((c) => c.lifecycleStatus === "deleted"), [categories]);

  function showConfirmation(message: string) {
    setConfirmation(message);
    setTimeout(() => setConfirmation((current) => (current === message ? null : current)), 2500);
  }

  function setSingleRowError(id: string, message: string | null) {
    setRowError((current) => {
      const next = { ...current };
      if (message) next[id] = message;
      else delete next[id];
      return next;
    });
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setIsCreating(true);
    try {
      const created = await createCategory({ name: newName, icon: newIcon, color: newColor });
      setNewName("");
      showConfirmation(`Categoría "${created.name}" creada.`);
    } catch (caught) {
      setCreateError(errorMessage(caught));
    } finally {
      setIsCreating(false);
    }
  }

  function startEditing(category: CategoryViewModel) {
    setEditingId(category.id);
    setEditingName(category.name);
    setSingleRowError(category.id, null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingName("");
  }

  async function saveEditing(id: string) {
    setRowBusyId(id);
    setSingleRowError(id, null);
    try {
      const updated = await updateCategory(id, { name: editingName });
      showConfirmation(`Categoría renombrada a "${updated.name}".`);
      setEditingId(null);
    } catch (caught) {
      setSingleRowError(id, errorMessage(caught));
    } finally {
      setRowBusyId(null);
    }
  }

  async function handleSoftDelete(category: CategoryViewModel) {
    setRowBusyId(category.id);
    setSingleRowError(category.id, null);
    try {
      await softDeleteCategory(category.id);
      showConfirmation(`Categoría "${category.name}" movida a la papelera.`);
    } catch (caught) {
      setSingleRowError(category.id, errorMessage(caught));
    } finally {
      setRowBusyId(null);
    }
  }

  async function handleRestore(category: CategoryViewModel) {
    setRowBusyId(category.id);
    setSingleRowError(category.id, null);
    try {
      await restoreCategory(category.id);
      showConfirmation(`Categoría "${category.name}" restaurada.`);
    } catch (caught) {
      setSingleRowError(category.id, errorMessage(caught));
    } finally {
      setRowBusyId(null);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <SectionHeader
        icon={<Tag size={18} aria-hidden="true" />}
        title="Categorías"
        description="Crea, renombra y administra las categorías que usas para clasificar tus hábitos."
      />

      {error && <p className="text-sm text-danger">{error}</p>}
      {confirmation && <p className="text-sm text-success">{confirmation}</p>}

      <form onSubmit={handleCreate} className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Nueva categoría"
            placeholder="p. ej. Salud"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            error={createError ?? undefined}
            required
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            label="Icono"
            value={newIcon}
            onChange={(event) => setNewIcon(event.target.value)}
            options={HABIT_ICON_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-primary">Color</span>
          <div className="flex h-10 items-center gap-1.5">
            {HABIT_COLOR_OPTIONS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Color ${color}`}
                onClick={() => setNewColor(color)}
                className={clsx(
                  "h-6 w-6 rounded-full border-2 transition-transform",
                  newColor === color ? "scale-110 border-text-primary" : "border-transparent",
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        <Button type="submit" isLoading={isCreating} className="sm:mb-0.5">
          Agregar
        </Button>
      </form>

      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
      ) : active.length === 0 ? (
        <EmptyState
          icon={<Tag size={22} aria-hidden="true" />}
          title="Todavía no tienes categorías"
          description="Crea tu primera categoría con el formulario de arriba."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {active.map((category) => {
            const Icon = getHabitIcon(category.icon);
            const isEditing = editingId === category.id;
            const isBusy = rowBusyId === category.id;

            return (
              <li key={category.id} className="flex flex-col gap-1 py-2.5">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${category.color}26`, color: category.color }}
                    aria-hidden="true"
                  >
                    <Icon size={15} />
                  </span>

                  {isEditing ? (
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void saveEditing(category.id);
                        if (event.key === "Escape") cancelEditing();
                      }}
                      className="h-8 flex-1 rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    />
                  ) : (
                    <span className="flex-1 text-sm font-medium text-text-primary">{category.name}</span>
                  )}

                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <IconButton
                          icon={<Check size={15} />}
                          label="Guardar nombre"
                          variant="secondary"
                          disabled={isBusy}
                          onClick={() => void saveEditing(category.id)}
                        />
                        <IconButton icon={<X size={15} />} label="Cancelar" onClick={cancelEditing} disabled={isBusy} />
                      </>
                    ) : (
                      <>
                        <IconButton
                          icon={<Pencil size={15} />}
                          label={`Renombrar ${category.name}`}
                          onClick={() => startEditing(category)}
                          disabled={isBusy}
                        />
                        <IconButton
                          icon={<Trash2 size={15} />}
                          label={`Eliminar ${category.name}`}
                          variant="danger"
                          disabled={isBusy}
                          onClick={() => void handleSoftDelete(category)}
                        />
                      </>
                    )}
                  </div>
                </div>
                {rowError[category.id] && <p className="pl-11 text-xs text-danger">{rowError[category.id]}</p>}
              </li>
            );
          })}
        </ul>
      )}

      {deleted.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Papelera ({deleted.length})
          </p>
          <ul className="flex flex-col divide-y divide-border">
            {deleted.map((category) => {
              const isBusy = rowBusyId === category.id;
              return (
                <li key={category.id} className="flex flex-col gap-1 py-2">
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-sm text-text-secondary line-through decoration-text-disabled">
                      {category.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      leadingIcon={<Undo2 size={14} />}
                      isLoading={isBusy}
                      onClick={() => void handleRestore(category)}
                    >
                      Restaurar
                    </Button>
                  </div>
                  {rowError[category.id] && <p className="text-xs text-danger">{rowError[category.id]}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}
