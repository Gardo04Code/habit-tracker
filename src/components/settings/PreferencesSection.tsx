import { SlidersHorizontal } from "lucide-react";
import type { TimeFormat } from "../../hooks/useSettingsForm";
import { Card } from "../ui/Card";
import { SectionHeader } from "../ui/SectionHeader";
import { Select } from "../ui/Select";

const TIMEZONE_OPTIONS = [
  { value: "America/Mexico_City", label: "Ciudad de México (GMT-6)" },
  { value: "America/Bogota", label: "Bogotá (GMT-5)" },
  { value: "America/Lima", label: "Lima (GMT-5)" },
  { value: "America/Santiago", label: "Santiago (GMT-4)" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (GMT-3)" },
  { value: "Europe/Madrid", label: "Madrid (GMT+1)" },
  { value: "America/New_York", label: "Nueva York (GMT-5)" },
  { value: "America/Los_Angeles", label: "Los Ángeles (GMT-8)" },
];

const WEEK_START_OPTIONS = [
  { value: "1", label: "Lunes" },
  { value: "0", label: "Domingo" },
];

const TIME_FORMAT_OPTIONS: { value: TimeFormat; label: string }[] = [
  { value: "12h", label: "12 horas (a. m. / p. m.)" },
  { value: "24h", label: "24 horas" },
];

interface PreferencesSectionProps {
  timezone: string;
  weekStartsOn: 0 | 1;
  timeFormat: TimeFormat;
  onTimezoneChange: (value: string) => void;
  onWeekStartsOnChange: (value: 0 | 1) => void;
  onTimeFormatChange: (value: TimeFormat) => void;
}

export function PreferencesSection({
  timezone,
  weekStartsOn,
  timeFormat,
  onTimezoneChange,
  onWeekStartsOnChange,
  onTimeFormatChange,
}: PreferencesSectionProps) {
  return (
    <Card className="flex h-full flex-col gap-4">
      <SectionHeader
        icon={<SlidersHorizontal size={18} aria-hidden="true" />}
        title="Preferencias"
        description="Ajustes que afectan cómo se muestran tus fechas y horarios."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Zona horaria" value={timezone} onChange={(event) => onTimezoneChange(event.target.value)} options={TIMEZONE_OPTIONS} />
        <Select
          label="Inicio de semana"
          value={String(weekStartsOn)}
          onChange={(event) => onWeekStartsOnChange(Number(event.target.value) as 0 | 1)}
          options={WEEK_START_OPTIONS}
        />
        <Select
          label="Formato de hora"
          value={timeFormat}
          onChange={(event) => onTimeFormatChange(event.target.value as TimeFormat)}
          options={TIME_FORMAT_OPTIONS}
        />
        <Select label="Idioma visual" value="es" onChange={() => {}} options={[{ value: "es", label: "Español" }]} disabled hint="Más idiomas próximamente." />
      </div>
    </Card>
  );
}
