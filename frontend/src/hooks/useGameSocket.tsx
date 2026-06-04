import { useCallback, useRef, useState } from "react";
import {
  GameMsgType,
  ResponseCode as ResponseCode,
} from "@src/constants/GameMsgType";
import {
  buildGameRequest,
  getUsernameError,
  parseGameServerMessage,
  parseGameServerResponse,
} from "@src/utils/game-protocol";
import { NetworkMessage } from "@src/interfaces/NetworkMessage";
import { ServerResponse } from "@src/interfaces/ServerResponse";

export function useGameSocket(
  url: string,
  handlers: {
    onMessage?: (msg: NetworkMessage) => void;
    onResponse?: (response: ServerResponse) => void;
    onConnect?: () => void;
    onDisconnect?: (e: CloseEvent) => void;
  } = {},
): {
  isConnected: boolean;
  // connect: (name: string) => Promise<string>;
  establishConnection: () => Promise<string>;
  // signUp: (username: string, password: string) => Promise<string>;
  // login: (username: string, password: string) => Promise<string>;
  disconnect: () => void;
  sendMessage: (msgType: GameMsgType, data?: any | undefined) => void;
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
    if (serverMsg.msgType == GameMsgType.RESPONSE) {
      const response = parseGameServerResponse(serverMsg.data);
      if (!response)
        console.error(`Received invalid response from server`, serverMsg.data);
      else if (handlers.onResponse) handlers.onResponse(response);
    } else if (handlers.onMessage) handlers.onMessage(serverMsg);
  };

  const handleError = (e: WebSocketEventMap["error"]) => {
    console.error("Socket error:", e);
  };

  function disconnect() {
    if (!isConnected || !ws.current) return;
    ws.current.close(1000);
  }

  const sendMessage = useCallback(
    (msgType: GameMsgType, data?: any | undefined) => {
      if (!isConnected || !ws.current) return;
      ws.current.send(buildGameRequest(msgType, data));
    },
    [isConnected, ws.current],
  );

  function establishConnection(): Promise<string> {
    return new Promise((res, rej) => {
      if (isConnected) return rej("Already connected");

      console.log("Connecting...");

      const handleConnectResponse = (e: MessageEvent) => {
        if (!ws.current) return;
        ws.current.onmessage = null;

        console.log("[ESTABLISH] Received Response:", e.data);
        if (e.data != "CONNECTED") {
          console.error("SERVER DID NOT CONNECT!");
          return rej("Was not able to connect... ! :(");
        }

        // register event handlers
        setIsConnected(true);
        handleOpen();
        ws.current.addEventListener("close", handleClose);
        ws.current.addEventListener("message", handleMessage);
        ws.current.addEventListener("error", handleError);
        res("Connected");
      };

      const handleConnectOpen = () => {
        if (!ws.current) return;
        ws.current.onopen = ws.current.onerror = null;
        ws.current.onmessage = handleConnectResponse;
        ws.current.onclose = handleClose;
        // ws.current.send(buildGameRequest(auth_msg, { username, password }));
      };

      const handleConnectError = (e: WebSocketEventMap["error"]) => {
        console.error(`Could not connect to ${url}. Error:`, e);
        ws.current = undefined;
        rej(`Could not connect to ${url}.\nError: ${JSON.stringify(e)}`);
      };

      if (
        ws.current &&
        ws.current.readyState != WebSocket.CLOSING &&
        ws.current.readyState != WebSocket.CLOSED
      ) {
        handleConnectOpen();
      } else {
        ws.current = new WebSocket(url);
        ws.current.onopen = handleConnectOpen;
        ws.current.onerror = handleConnectError;
      }
    });
  }

  return {
    establishConnection,
    isConnected,
    disconnect,
    sendMessage,
  };
}
