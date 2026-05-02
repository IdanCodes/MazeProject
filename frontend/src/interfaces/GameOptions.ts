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

export const MIN_MAZE_DIMENSIONS = {
  width: 5,
  height: 5,
};

export const MAX_MAZE_DIMENSIONS = {
  width: 25,
  height: 25,
};

export const validMazeHeight = (height: number) =>
  MIN_MAZE_DIMENSIONS.height <= height && height <= MAX_MAZE_DIMENSIONS.height;
export const validMazeWidth = (width: number) =>
  MIN_MAZE_DIMENSIONS.width <= width && width <= MAX_MAZE_DIMENSIONS.width;
