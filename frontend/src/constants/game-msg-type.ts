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

  ROOMS_LIST = "rooms_list",
  CREATE_ROOM = "create_room",
  JOIN_ROOM = "join_room",
  LEAVE_ROOM = "leave_room",
  ROOM_ADMIN = "room_admin",

  START_GAME = "start_game",
  PLAYER_FINISHED = "player_finished",
  END_GAME = "end_game",

  RESPONSE = "response",
}

export enum ResponseCode {
  ERROR,
  SUCCESS,
}

export function isGameMsgType(value: string): value is GameMsgType {
  return Object.values<string>(GameMsgType).includes(value);
}

export function isResponseCode(value: number): value is ResponseCode {
  return Object.values(ResponseCode).includes(value);
}
