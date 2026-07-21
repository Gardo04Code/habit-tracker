import { Repeat } from "lucide-react";
import { ComingSoon } from "../components/common/ComingSoon";

export function HabitsPage() {
  return (
    <ComingSoon
      icon={<Repeat size={22} aria-hidden="true" />}
      title="Mis hábitos en construcción"
      description="Aquí podrás crear, editar, pausar, archivar y restaurar tus hábitos."
    />
  );
}
