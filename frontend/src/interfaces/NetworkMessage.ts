import { GameMsgType } from "@src/constants/game-msg-type";

// A network message
export interface NetworkMessage {
  msgType: GameMsgType;
  source: string;
  data: any | undefined;
}
