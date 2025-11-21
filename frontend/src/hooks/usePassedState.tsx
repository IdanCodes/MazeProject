import { PassedState } from "@src/types/passed-state";
import { useMemo } from "react";

export function usePassedState<T>(state: PassedState<T>): PassedState<T> {
  return useMemo(() => state, [state]);
}
