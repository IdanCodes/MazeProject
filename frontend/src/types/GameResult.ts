export type GameResult = {
  username: string;
  timeMs: number;
};

export function isGameResult(res: any): res is GameResult {
  return (
    res &&
    typeof res === "object" &&
    res.username &&
    typeof res.username === "string" &&
    res.timeMs &&
    typeof res.timeMs === "number"
  );
}
