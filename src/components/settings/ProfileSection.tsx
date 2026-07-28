import { Check, Save, User } from "lucide-react";
import { Card } from "../ui/Card";
import { SectionHeader } from "../ui/SectionHeader";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

interface ProfileSectionProps {
  name: string;
  email: string;
  isSaved: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onSave: () => void;
}

export function ProfileSection({ name, email, isSaved, onNameChange, onEmailChange, onSave }: ProfileSectionProps) {
  return (
    <Card className="flex flex-col gap-5">
      <SectionHeader icon={<User size={18} aria-hidden="true" />} title="Perfil" description="Tu información personal dentro de Habit Tracker." />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex items-center gap-4 lg:w-64 lg:shrink-0">
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-muted text-xl font-semibold text-primary"
            aria-hidden="true"
          >
            {name.charAt(0) || "?"}
          </span>
          <p className="text-xs text-text-secondary">
            El avatar se genera a partir de tu nombre. La carga de imágenes estará disponible más adelante.
          </p>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Nombre" value={name} onChange={(event) => onNameChange(event.target.value)} />
          <Input label="Correo (visual)" type="email" value={email} onChange={(event) => onEmailChange(event.target.value)} />
        </div>

        <Button leadingIcon={isSaved ? <Check size={16} /> : <Save size={16} />} onClick={onSave} className="lg:shrink-0">
          {isSaved ? "Guardado" : "Guardar cambios"}
        </Button>
      </div>
    </Card>
  );
}
