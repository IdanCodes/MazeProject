import { GameMsgType, ResponseCode } from "@src/constants/GameMsgType";

// A response from the server
export interface ServerResponse {
  code: ResponseCode;
  responseTo: GameMsgType;
  data: any | undefined;
}
