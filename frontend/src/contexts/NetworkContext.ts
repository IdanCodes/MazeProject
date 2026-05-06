import { GameMsgType } from "@src/constants/game-msg-type";
import { NetworkMessage } from "@src/interfaces/NetworkMessage";
import { ServerResponse } from "@src/interfaces/ServerResponse";
import { createContext, useContext } from "react";

export interface NetworkContextType {
  // TODO: specify GameMsgType when subscribing
  onMessage: (msgType: GameMsgType, cb: (msg: NetworkMessage) => void) => void;
  onResponse: (resType: GameMsgType, cb: (res: ServerResponse) => void) => void;
  sendMessage: (msgType: GameMsgType, data?: any | undefined) => void;
  // TODO: remvoe if unnecessary
  //   onDisconnect?: (cb: (e: CloseEvent) => void) => void;
  isConnected: boolean;
  disconnect: () => void;
}

export const NetworkContext = createContext<NetworkContextType | null>(null);

export function useNetworkContext() {
  const networkContext = useContext(NetworkContext);

  if (!networkContext) {
    throw new Error(
      "useNetwork has to be used within <NetworkContext.Provider>",
    );
  }

  return networkContext;
}
