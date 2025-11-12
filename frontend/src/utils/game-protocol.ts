import { GameMsgType, isGameMsgType } from "../components/game-msg-type";

export function buildGameRequest(
  msgType: GameMsgType,
  data: any | undefined,
): string {
  return JSON.stringify({
    msgType: msgType,
    data: data,
  });
}

export function parseGameServerMessage(msgStr: string):
  | {
      msgType: GameMsgType;
      source: string;
      data: any | undefined;
    }
  | undefined {
  try {
    const msg = JSON.parse(msgStr);
    if (!(typeof msg === "object") || !("msgType" in msg) || !("source" in msg))
      return undefined;

    const msgType = msg.msgType;
    const source = msg.source;

    if (
      msgType === undefined ||
      source === undefined ||
      typeof msgType !== "string" ||
      typeof source !== "string" ||
      !isGameMsgType(msgType)
    )
      return undefined;

    return {
      msgType,
      source,
      data: "data" in msg ? msg.data : undefined,
    };
  } catch {
    return undefined;
  }
}
