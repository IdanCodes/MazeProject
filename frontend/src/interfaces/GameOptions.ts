export interface GameOptions {
  // mazeDimensions: { width: number; height: number };
  difficulty: MazeDifficulty;
}

export enum MazeDifficulty {
  Easy = "EASY",
  Medium = "MEDIUM",
  Hard = "HARD",
}

export function isGameOptions(value: any): value is GameOptions {
  return (
    value !== undefined &&
    value.difficulty !== undefined &&
    Object.values(MazeDifficulty).includes(value.difficulty)
  );
}

export function parseGameOptions(value: any): GameOptions | undefined {
  return isGameOptions(value)
    ? {
        difficulty: value.difficulty,
      }
    : undefined;
}
