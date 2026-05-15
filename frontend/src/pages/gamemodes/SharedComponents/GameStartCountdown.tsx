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
  const [timeLeft, setTimeLeft] = useState(() => startTime - Date.now());
  const hasStarted = useRef<boolean>(false);

  useEffect(() => {
    if (hasStarted.current) return;
    if (timeLeft <= DELTA_MS) {
      hasStarted.current = true;
      onStart();
    }
    setTimeout(() => {
      setTimeLeft(startTime - Date.now());
    }, DELTA_MS);
  }, [timeLeft]);

  return (
    <>
      <p className="text-3xl">
        {hasStarted.current ? "Start!" : (timeLeft / 1000.0).toFixed(1)}
      </p>
    </>
  );
}
