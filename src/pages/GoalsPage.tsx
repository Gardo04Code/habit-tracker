import { Target } from "lucide-react";
import { ComingSoon } from "../components/common/ComingSoon";

export function GoalsPage() {
  return (
    <ComingSoon
      icon={<Target size={22} aria-hidden="true" />}
      title="Metas en construcción"
      description="Aquí podrás administrar tu meta mensual y las metas por hábito."
    />
  );
}
