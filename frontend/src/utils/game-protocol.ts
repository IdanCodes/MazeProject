import { GameMsgType, isGameMsgType } from "../constants/game-msg-type";
import { NetworkMessage } from "@src/hooks/useNetworkHandler";

export function buildGameRequest(
  msgType: GameMsgType,
  data: any | undefined,
): string {
  return JSON.stringify({
    msgType: msgType,
    data: data,
  });
}

export function parseGameServerMessage(
  msgStr: string,
): NetworkMessage | undefined {
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
    } as NetworkMessage;
  } catch {
    return undefined;
  }
}

export const minNameLen: number = 4;
export const maxNameLen: number = 10;
export function getUsernameError(name: string): string | null {
  if (name.length === 0) return "";
  else if (name.length < minNameLen)
    return `Name must be at least ${minNameLen} characters long`;
  else if (name.length > maxNameLen)
    return `Name must be at most ${maxNameLen} characters long`;
  else if (!/^[a-zA-Z0-9]+$/.test(name)) return `Name must to be alpha-numeric`;
  else if (!Number.isNaN(Number(name[0])))
    return `Name can't start with a number`;

  return null;
}
