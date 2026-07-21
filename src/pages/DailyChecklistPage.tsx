import { ListChecks } from "lucide-react";
import { ComingSoon } from "../components/common/ComingSoon";

export function DailyChecklistPage() {
  return (
    <ComingSoon
      icon={<ListChecks size={22} aria-hidden="true" />}
      title="Checklist diario en construcción"
      description="Aquí podrás registrar el avance de tus hábitos programados para cada día."
    />
  );
}
