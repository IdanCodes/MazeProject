import { useEffect, useRef, useState } from "react";
import { GameMsgType } from "@src/constants/game-msg-type";
import {
  buildGameRequest,
  getUsernameError,
  parseGameServerMessage,
} from "@src/utils/game-protocol";
import { NetworkMessage } from "@src/hooks/useNetworkHandler";

export function useMazePlayerSocket(
  url: string,
  handlers: {
    onMessage?: (msg: NetworkMessage) => void;
    onConnect?: () => void;
    onDisconnect?: (e: CloseEvent) => void;
  } = {},
): {
  isConnected: boolean;
  connect: (name: string) => Promise<string>;
  disconnect: () => void;
  sendMessage: (msgType: GameMsgType, data: any | undefined) => void;
} {
  const ws = useRef<WebSocket | undefined>(undefined);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const handleOpen = () => {
    if (handlers.onConnect) handlers.onConnect();
  };

  const handleClose = (e: CloseEvent) => {
    ws.current = undefined;
    setIsConnected(false);
    if (handlers.onDisconnect) handlers.onDisconnect(e);
  };

  const handleMessage = (e: MessageEvent) => {
    const serverMsg = parseGameServerMessage(e.data);
    if (!serverMsg) return;
    if (handlers.onMessage) handlers.onMessage(serverMsg);
  };

  const handleError = (e: WebSocketEventMap["error"]) => {
    console.error("Socket error:", e);
  };

  // connect to the server with a name
  function connect(name: string): Promise<string> {
    return new Promise((res, rej) => {
      if (isConnected || getUsernameError(name) !== null) {
        rej("Invalid name");
        return;
      }

      console.log("Connecting...");

      const handleConnectResponse = (e: MessageEvent) => {
        if (!ws.current) return;
        ws.current.onmessage = null;
        console.log("message", e);

        const serverMsg = parseGameServerMessage(e.data);
        if (!serverMsg) {
          console.error("Received invalid server message");
          rej("Invalid name from server");
        } else if (serverMsg.msgType === GameMsgType.ACCEPT_CONNECTION) {
          // register event handlers
          setIsConnected(true);
          handleOpen();
          ws.current.addEventListener("close", handleClose);
          ws.current.addEventListener("message", handleMessage);
          ws.current.addEventListener("error", handleError);
          res("Connected");
        } else if (serverMsg.msgType === GameMsgType.ERR_NAME_TAKEN) {
          rej(`The name "${name}" is taken. Please use another name`);
        }
      };

      const handleConnectOpen = () => {
        if (!ws.current) return;
        ws.current.onopen = ws.current.onerror = null;
        ws.current.onmessage = handleConnectResponse;
        ws.current.send(buildGameRequest(GameMsgType.SET_NAME, name));
      };

      const handleConnectError = (e: WebSocketEventMap["error"]) => {
        console.error(`Could not connect to ${url}. Error:`, e);
        ws.current = undefined;
        rej(`Could not connect to ${url}.\nError: ${JSON.stringify(e)}`);
      };

      if (ws.current) {
        handleConnectOpen();
      } else {
        ws.current ??= new WebSocket(url);
        ws.current.onopen = handleConnectOpen;
        ws.current.onerror = handleConnectError;
      }
    });
  }

  function disconnect() {
    if (!isConnected || !ws.current) return;
    ws.current.close(1000);
  }

  function sendMessage(msgType: GameMsgType, data: any | undefined) {
    if (!isConnected || !ws.current) return;
    ws.current.send(buildGameRequest(msgType, data));
  }

  return {
    isConnected: isConnected,
    connect,
    disconnect,
    sendMessage,
  };
}
