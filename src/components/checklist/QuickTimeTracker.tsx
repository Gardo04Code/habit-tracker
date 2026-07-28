import { useEffect, useState } from "react";
import { Pause, Play, Square } from "lucide-react";
import { HabitProgress } from "./HabitProgress";
import { QuickActionButton } from "./QuickActionButton";

interface QuickTimeTrackerProps {
  value: number;
  target: number;
  unit?: string;
  disabled?: boolean;
  onFinish: (totalMinutes: number) => void;
}

export function QuickTimeTracker({ value, target, unit = "min", disabled, onFinish }: QuickTimeTrackerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const liveMinutes = Math.round(value + elapsedSeconds / 60);
  const hasProgress = elapsedSeconds > 0 || value > 0;

  function finish() {
    setIsRunning(false);
    onFinish(liveMinutes);
    setElapsedSeconds(0);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <HabitProgress value={liveMinutes} target={target} unit={unit} variant="primary" />
      <div className="flex gap-2">
        {isRunning ? (
          <QuickActionButton icon={<Pause size={14} />} label="Pausar" tone="neutral" onClick={() => setIsRunning(false)} />
        ) : (
          <QuickActionButton
            icon={<Play size={14} />}
            label={elapsedSeconds > 0 ? "Reanudar" : "Iniciar"}
            tone="primary"
            disabled={disabled}
            onClick={() => setIsRunning(true)}
          />
        )}
        <QuickActionButton icon={<Square size={13} />} label="Finalizar" tone="success" disabled={disabled || !hasProgress} onClick={finish} />
      </div>
    </div>
  );
}
