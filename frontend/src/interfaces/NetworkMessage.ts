import { GameMsgType } from "@src/constants/GameMsgType";

// A network message
export interface NetworkMessage {
  msgType: GameMsgType;
  source: string;
  data: any | undefined;
}
