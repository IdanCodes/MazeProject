export interface GameRoomInfo {
  id: string;
  name: string;
  playerCount: number;
  capacity: number;
  gameActive: boolean;
  hasPassword: boolean;
}

export function gameIsFull(room: GameRoomInfo): boolean {
  return room.playerCount >= room.capacity;
}
