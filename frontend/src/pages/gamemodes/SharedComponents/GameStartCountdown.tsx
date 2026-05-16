import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

export default function GameStartCountdown({
  startTime,
  onStart,
  DELTA_MS = 50,
}: {
  startTime: number;
  onStart: () => void;
  DELTA_MS?: number;
}) {
  const TIMED_COLORS: [number, string][] = [
    [3000, "rgb(255, 0, 0)"],
    [2000, "rgb(255, 255, 0)"],
    [1000, "rgb(0, 255, 255)"],
  ];
  const [timeLeft, setTimeLeft] = useState(() => startTime - Date.now());
  const [textColor, setTextColor] = useState<string>("rgb(0, 0, 0)");
  const hasStarted = useRef<boolean>(false);

  useEffect(() => {
    if (hasStarted.current) return;
    if (timeLeft <= DELTA_MS) {
      hasStarted.current = true;
      onStart();
    }
    setTimeout(() => {
      setTimeLeft(startTime - Date.now());
      if (getTimedColor() != textColor) setTextColor(getTimedColor());
    }, DELTA_MS);
  }, [timeLeft]);

  const getTimedColor = () => {
    for (let i = TIMED_COLORS.length - 1; i >= 0; i--) {
      if (timeLeft < TIMED_COLORS[i][0]) {
        console.log(TIMED_COLORS[i][1]);
        return TIMED_COLORS[i][1];
      }
    }
    return "rgb(0, 0, 0)";
  };

  return (
    <>
      <p className={clsx("text-3xl")} style={{ color: textColor }}>
        {hasStarted.current ? "Start!" : (timeLeft / 1000.0).toFixed(1)}
      </p>
    </>
  );
}
