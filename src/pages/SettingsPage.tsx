import { Settings } from "lucide-react";
import { ComingSoon } from "../components/common/ComingSoon";

export function SettingsPage() {
  return (
    <ComingSoon
      icon={<Settings size={22} aria-hidden="true" />}
      title="Configuración en construcción"
      description="Aquí podrás administrar tu perfil, preferencias, apariencia y notificaciones."
    />
  );
}
