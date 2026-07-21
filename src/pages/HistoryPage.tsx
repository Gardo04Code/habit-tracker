import { History } from "lucide-react";
import { ComingSoon } from "../components/common/ComingSoon";

export function HistoryPage() {
  return (
    <ComingSoon
      icon={<History size={22} aria-hidden="true" />}
      title="Historial en construcción"
      description="Aquí podrás consultar tus registros anteriores en vista de calendario o tabla."
    />
  );
}
