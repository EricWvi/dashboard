import { useState, useEffect, useRef } from "react";
import { Play, Pause, Square } from "lucide-react";
import type { Pomodoro } from "@/hooks/use-pomodoro";

export default function TodoStripe({ pomodoros }: { pomodoros: Pomodoro[] }) {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime((prevTime) => prevTime + 10);
      }, 10);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      hours: hours.toString().padStart(2, "0"),
      minutes: minutes.toString().padStart(2, "0"),
      seconds: seconds.toString().padStart(2, "0"),
    };
  };

  const handleStartStop = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(0);
  };

  const { hours, minutes, seconds } = formatTime(time);

  if (pomodoros.length === 0) return null;
  return (
    <>
      <div className="mt-[6px] space-y-[6px]">
        <div className="mx-1 flex gap-1">
          {pomodoros.map((p) => (
            <div key={p.id} className="h-1 flex-1 rounded-sm bg-pink-200"></div>
          ))}
          {pomodoros.length === 1 && (
            <div className="h-1 flex-1 rounded-sm bg-gray-200"></div>
          )}
        </div>
        <div className="bg-card flex items-center justify-between gap-2 rounded-2xl border px-4 py-2 shadow-sm">
          <div className="flex flex-1/1 items-center justify-center gap-1 text-2xl">
            <div className="text-foreground tabular-nums">{hours}</div>
            <div className="text-muted-foreground mb-1">:</div>
            <div className="text-foreground tabular-nums">{minutes}</div>
            <div className="text-muted-foreground mb-1">:</div>
            <div className="text-foreground tabular-nums">{seconds}</div>
          </div>
          <div className="sm:flex-1/3 md:flex-1/8"></div>

          <div className="flex-shrink-0 space-x-2">
            <button onClick={handleStartStop} className="group cursor-pointer">
              <div className="bg-primary hover:bg-primary/90 text-primary-foreground flex size-10 transform items-center justify-center rounded-full transition-all group-active:scale-95">
                {isRunning ? (
                  <Pause className="h-4 w-4" strokeWidth={2} />
                ) : (
                  <Play className="h-4 w-4" strokeWidth={2} />
                )}
              </div>
            </button>

            <button
              onClick={handleReset}
              className="group cursor-pointer"
              disabled={time === 0 && !isRunning}
            >
              <div
                className={`bg-muted hover:bg-muted/80 text-foreground flex size-10 transform items-center justify-center rounded-full transition-all group-active:scale-95`}
              >
                <Square
                  className="h-4 w-4 fill-gray-700 stroke-gray-700 dark:fill-gray-200 dark:stroke-gray-200"
                  strokeWidth={2}
                />
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
