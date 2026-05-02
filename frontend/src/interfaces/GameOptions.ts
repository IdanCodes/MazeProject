export interface GameOptions {
  mazeDimensions: { width: number; height: number };
}

export function isGameOptions(value: any): value is GameOptions {
  return (
    value &&
    typeof value === "object" &&
    value.mazeDimensions &&
    value.mazeDimensions.width !== undefined &&
    value.mazeDimensions.height !== undefined &&
    typeof value.mazeDimensions.width === "number" &&
    typeof value.mazeDimensions.height === "number"
  );
}

export function parseGameOptions(value: any): GameOptions | undefined {
  return isGameOptions(value)
    ? {
        mazeDimensions: value.mazeDimensions,
      }
    : undefined;
}
