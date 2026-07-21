import { BarChart3 } from "lucide-react";
import { ComingSoon } from "../components/common/ComingSoon";

export function StatisticsPage() {
  return (
    <ComingSoon
      icon={<BarChart3 size={22} aria-hidden="true" />}
      title="Estadísticas en construcción"
      description="Aquí podrás analizar tendencias, rachas y comparaciones entre hábitos."
    />
  );
}
