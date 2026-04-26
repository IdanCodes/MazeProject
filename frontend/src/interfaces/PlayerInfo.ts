import { isPlayerRole, PlayerRole } from "@src/constants/PlayerRole";
import { isVector2, Vector2 } from "./Vector2";

export interface PlayerInfo {
  name: string;
  position: Vector2;
  isReady: boolean;
  role: PlayerRole;
}

export function isPlayerInfo(value: any): value is PlayerInfo {
  return (
    value &&
    typeof value === "object" &&
    typeof value.name === "string" &&
    isVector2(value.position) &&
    typeof value.isReady === "boolean" &&
    isPlayerRole(value.role)
  );
}

export function parsePlayerInfo(obj: any): PlayerInfo | undefined {
  if (isPlayerInfo(obj)) {
    return {
      name: obj.name,
      position: obj.position,
      isReady: obj.isReady,
      role: obj.role,
    };
  }
  return undefined;
}
