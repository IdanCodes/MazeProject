import { GameMsgType, ResponseCode } from "@src/constants/game-msg-type";

// A response from the server
export interface ServerResponse {
  code: ResponseCode;
  responseTo: GameMsgType;
  data: any | undefined;
}
