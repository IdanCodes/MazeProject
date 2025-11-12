export enum GameMsgType {
  CONNECT_REQUEST = "connect_request",
  MAZE = "maze",
  UPDATE_POS = "update_pos",

  PLAYER_CONNECTED = "player_connected",
  PLAYER_DISCONNECTED = "player_disconnected",
}

export function isGameMsgType(value: string): value is GameMsgType {
  return Object.values<string>(GameMsgType).includes(value);
}
