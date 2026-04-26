export enum PlayerRole {
  ADMIN,
  PLAYER,
  SPECTATOR,
}

export function isPlayerRole(val: any): val is PlayerRole {
  return (
    val != undefined &&
    typeof val == "number" &&
    Object.values(PlayerRole).includes(val)
  );
}
