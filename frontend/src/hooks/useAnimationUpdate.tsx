import { useRef, useEffect, useCallback, useMemo } from "react";

const useAnimationUpdate = (fps: number, callback: () => void) => {
  const frameLengthMS = useMemo<number>(
    () => Math.floor(1000 * (1.0 / fps)),
    [fps],
  );
  const requestRef = useRef<DOMHighResTimeStamp | null>(null);
  const previousTimeRef = useRef<DOMHighResTimeStamp | null>(null);

  const animate = useCallback(
    (timestamp: DOMHighResTimeStamp) => {
      if (previousTimeRef.current !== null) {
        let deltaTime = timestamp - previousTimeRef.current;

        while (deltaTime >= frameLengthMS) {
          callback(); // call lost loops
          deltaTime -= frameLengthMS;
          previousTimeRef.current += frameLengthMS;
        }
      } else previousTimeRef.current = timestamp;

      // Schedule next frame
      requestRef.current = requestAnimationFrame(animate);
    },
    [callback, frameLengthMS],
  );

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);
};

export default useAnimationUpdate;
