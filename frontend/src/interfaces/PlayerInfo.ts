import { isVector2, Vector2 } from "./Vector2";

export interface PlayerInfo {
  name: string;
  position: Vector2;
  isReady: boolean;
}

export function isPlayerInfo(value: any): value is PlayerInfo {
  return (
    value &&
    typeof value === "object" &&
    typeof value.name === "string" &&
    isVector2(value.position) &&
    typeof value.isReady === "boolean"
  );
}

export function parsePlayerInfo(obj: any): PlayerInfo | undefined {
  if (isPlayerInfo(obj)) {
    return {
      name: obj.name,
      position: obj.position,
      isReady: obj.isReady,
    };
  }
  return undefined;
}
