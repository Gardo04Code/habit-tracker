import { Download, ShieldAlert, Trash2 } from "lucide-react";
import { Card } from "../ui/Card";
import { SectionHeader } from "../ui/SectionHeader";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

export function PrivacySection() {
  return (
    <Card className="flex flex-col gap-4">
      <SectionHeader title="Privacidad" description="Control sobre tus datos dentro de la aplicación." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-muted text-primary" aria-hidden="true">
            <Download size={16} />
          </span>
          <div>
            <p className="text-sm font-medium text-text-primary">Exportar mis datos</p>
            <p className="text-xs text-text-secondary">Descarga tus hábitos y registros en un archivo.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="neutral">Próximamente</Badge>
          <Button variant="secondary" size="sm" disabled>
            Exportar
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger-muted text-danger" aria-hidden="true">
            <ShieldAlert size={16} />
          </span>
          <div>
            <p className="text-sm font-medium text-text-primary">Eliminar cuenta</p>
            <p className="text-xs text-text-secondary">Elimina permanentemente tu cuenta y todos tus datos.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="neutral">Próximamente</Badge>
          <Button variant="danger" size="sm" leadingIcon={<Trash2 size={14} />} disabled>
            Eliminar
          </Button>
        </div>
      </div>
    </Card>
  );
}
