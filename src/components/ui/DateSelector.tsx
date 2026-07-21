import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatFullDate, isToday } from "../../utils/formatDate";
import { IconButton } from "./IconButton";
import { Button } from "./Button";

interface DateSelectorProps {
  date: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function DateSelector({ date, onPrevious, onNext, onToday }: DateSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <IconButton icon={<ChevronLeft size={18} />} label="Día anterior" onClick={onPrevious} variant="secondary" />
      <span className="min-w-[10rem] text-center text-sm font-medium capitalize text-text-primary">
        {formatFullDate(date)}
      </span>
      <IconButton icon={<ChevronRight size={18} />} label="Día siguiente" onClick={onNext} variant="secondary" />
      {!isToday(date) && (
        <Button variant="ghost" size="sm" onClick={onToday}>
          Hoy
        </Button>
      )}
    </div>
  );
}
