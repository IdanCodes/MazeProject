import { isPlayerRole, PlayerRole } from "@src/constants/PlayerRole";
import { isVector2, Vector2 } from "./Vector2";

export interface PlayerInfo {
  username: string;
  position: Vector2;
  isReady: boolean;
  role: PlayerRole;
}

export function isPlayerInfo(value: any): value is PlayerInfo {
  return (
    value !== undefined &&
    typeof value === "object" &&
    value.username !== undefined &&
    typeof value.username === "string" &&
    value.position !== undefined &&
    isVector2(value.position) &&
    value.isReady !== undefined &&
    typeof value.isReady === "boolean" &&
    value.role !== undefined &&
    isPlayerRole(value.role)
  );
}

export function parsePlayerInfo(obj: any): PlayerInfo | undefined {
  if (isPlayerInfo(obj)) {
    return {
      username: obj.username,
      position: obj.position,
      isReady: obj.isReady,
      role: obj.role,
    };
  }
  return undefined;
}
