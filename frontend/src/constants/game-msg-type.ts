export enum GameMsgType {
  CONNECT_REQUEST = "connect_request",
  MAZE = "maze",
  UPDATE_POS = "update_pos",
  SET_NAME = "set_name",

  ACCEPT_CONNECTION = "accept_connection",
  ERR_NAME_TAKEN = "err_name_taken",
  PLAYER_CONNECTED = "player_connected",
  PLAYER_DISCONNECTED = "player_disconnected",
  SET_READY = "set_ready",
}

export function isGameMsgType(value: string): value is GameMsgType {
  return Object.values<string>(GameMsgType).includes(value);
}
