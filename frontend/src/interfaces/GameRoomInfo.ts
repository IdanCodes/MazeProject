export interface GameRoomInfo {
  id: string;
  name: string;
  playerCount: number;
  capacity: number;
  gameActive: boolean;
  hasPassword: boolean;
}

export function isRoomInfo(obj: any): obj is GameRoomInfo {
  return (
    typeof obj === "object" &&
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    typeof obj.playerCount === "number" &&
    typeof obj.capacity === "number" &&
    typeof obj.gameActive === "boolean" &&
    typeof obj.hasPassword === "boolean"
  );
}

export function gameIsFull(room: GameRoomInfo): boolean {
  return room.playerCount >= room.capacity;
}
