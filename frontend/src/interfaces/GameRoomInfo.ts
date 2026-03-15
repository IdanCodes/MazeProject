export interface GameRoomInfo {
  id: string;
  name: string;
  playerCount: number;
  capacity: number;
  gameActive: boolean;
  hasPassword: boolean;
}

export function isRoomInfo(obj: any): obj is GameRoomInfo {
  console.log("Checking if object is GameRoomInfo:", obj);
  console.log("obj == object:", obj == Object(obj));
  console.log("obj.id is string:", typeof obj.id === "string");
  console.log("obj.name is string:", typeof obj.name === "string");
  console.log(
    "obj.playerCount is number:",
    typeof obj.playerCount === "number",
  );
  console.log("obj.capacity is number:", typeof obj.capacity === "number");
  console.log(
    "obj.gameActive is boolean:",
    typeof obj.gameActive === "boolean",
  );
  console.log(
    "obj.hasPassword is boolean:",
    typeof obj.hasPassword === "boolean",
  );
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
