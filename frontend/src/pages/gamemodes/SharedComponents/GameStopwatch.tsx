import { formatTime } from "@src/utils/common-helpers";
import { useState, useEffect } from "react";

export default function GameStopwatch({
  startTime,
  finishTime,
  DELTA_MS = 50,
}: {
  startTime: number;
  finishTime: number | undefined;
  DELTA_MS?: number;
}) {
  const [timeSinceStart, setTimeSinceStart] = useState<number>(
    () => Date.now() - startTime,
  );

  useEffect(() => {
    if (finishTime != null) return;
    setTimeout(() => {
      setTimeSinceStart(Date.now() - startTime);
    }, DELTA_MS);
  }, [startTime, timeSinceStart]);
  // useEffect(() => {
  //   if (finishTime != null) setTimeSinceStart(finishTime);
  // }, [finishTime]);

  return (
    <>
      <div className="w-full my-1">
        <p className="text-4xl text-center font-semibold">
          {formatTime(finishTime ?? timeSinceStart)}
        </p>
      </div>
    </>
  );
}
