import {
  equalVec,
  parseVector2,
  Vector2,
  ZERO_VEC,
} from "@src/interfaces/Vector2";
import { useRef, useState } from "react";
import { GameMsgType } from "@src/components/game-msg-type";
import { CellType, Grid } from "@src/types/Grid";
import { Maze } from "@src/types/Maze";
import useAnimationUpdate from "@src/hooks/useAnimationUpdate";
import { useMazePlayerSocket } from "@src/hooks/useMazePlayerSocket";

const SERVER_PORT = 3003;
const SERVER_IP = "127.0.0.1";
const SERVER_WS_URL: string = `ws://${SERVER_IP}:${SERVER_PORT}`;

export interface NetworkMessage {
  msgType: GameMsgType;
  source: string;
  data: any | undefined;
}

export function useNetworkHandler(
  localPlayerPos: Vector2,
  canvasSize: { width: number; height: number },
  setMaze: (maze: Maze) => void,
  onError: (e: WebSocketEventMap["error"]) => void = (_) => {},
  onClose: (e: WebSocketEventMap["close"]) => void = (_) => {},
  posUpdateRate: number = 25,
): {
  otherPlayers: Map<string, Vector2>;
  sendMaze: (maze: Maze) => void;
  isConnected: boolean;
  connectToServer: (name: string) => Promise<string>;
  disconnectFromServer: () => void;
} {
  const lastSentPos = useRef<Vector2>(ZERO_VEC);
  const [otherPlayers, setOtherPlayers] = useState<Map<string, Vector2>>(
    new Map(),
  );
  const clientName = useRef<string>("");
  const { sendMessage, connect, disconnect, isConnected } = useMazePlayerSocket(
    SERVER_WS_URL,
    {
      onConnect: () => {
        console.log("Connection is open!");
      },
      onMessage: (msg) => onReceiveMessage(msg),
      // onError: (e: WebSocketEventMap["error"]) => onError(e),
      onDisconnect: (e: WebSocketEventMap["close"]) => onClose(e),
    },
  );

  function onReceiveMessage(msg: NetworkMessage) {
    handleServerMessage(msg);
  }

  // region Server Message Handlers
  function handleServerMessage(msg: NetworkMessage) {
    switch (msg.msgType) {
      case GameMsgType.MAZE:
        return handleMessageMaze(msg);
      case GameMsgType.UPDATE_POS:
        return handleMessageUpdatePos(msg);
      case GameMsgType.PLAYER_CONNECTED:
        return handlePlayerConnected();
      case GameMsgType.PLAYER_DISCONNECTED:
        return handlePlayerDisconnected(msg);
      default:
        break;
    }
  }

  function handleMessageMaze(msg: NetworkMessage) {
    const matrix = msg.data as CellType[][];
    const grid = new Grid(matrix);
    const maze = new Maze(grid);
    setMaze(maze);
  }

  const updatePlayerPos = (posList: [string, Vector2][]) => {
    setOtherPlayers((op) => {
      const newOp = new Map(op);
      for (const [src, pos] of posList) newOp.set(src, pos);
      return newOp;
    });
  };

  function handleMessageUpdatePos(msg: NetworkMessage) {
    const data = msg.data;
    if (!data || typeof data !== "object") return;

    const posList: [string, Vector2][] = [];
    Object.entries(data).forEach(([name, rawPos]) => {
      if (name === clientName.current) return;

      const normalized = parseVector2(rawPos);
      if (!normalized) return;

      const newPos: Vector2 = {
        x: normalized.x * canvasSize.width,
        y: normalized.y * canvasSize.height,
      };

      const oldPos = otherPlayers.get(name);
      if (oldPos && equalVec(oldPos, newPos)) return;

      posList.push([name, newPos]);
    });

    if (posList) updatePlayerPos(posList);
  }

  function handlePlayerConnected() {
    sendPos();
  }

  function handlePlayerDisconnected(msg: NetworkMessage) {
    setOtherPlayers((op) => {
      const newOp = new Map(op);
      newOp.delete(msg.source);
      return newOp;
    });
  }
  // endregion

  function sendPos() {
    const posToSend = {
      x: localPlayerPos.x / canvasSize.width,
      y: localPlayerPos.y / canvasSize.height,
    } as Vector2;
    sendMessage(GameMsgType.UPDATE_POS, posToSend);
    lastSentPos.current = localPlayerPos;
  }

  function sendMaze(maze: Maze) {
    sendMessage(GameMsgType.MAZE, maze.getMatrix());
  }

  useAnimationUpdate(posUpdateRate, () => {
    if (!equalVec(localPlayerPos, lastSentPos.current)) sendPos();
  });

  function connectToServer(name: string): Promise<string> {
    if (!name.length) {
      console.warn("Not connecting - no name was provided");
      return new Promise((res, rej) => rej("No name was provided"));
    }

    clientName.current = name;
    return connect(name);
    // setConnectOnDemand(true);
  }

  function disconnectFromServer() {
    setOtherPlayers(new Map());
    disconnect();
    // setConnectOnDemand(false);
  }

  return {
    otherPlayers,
    sendMaze,
    isConnected,
    connectToServer,
    disconnectFromServer,
  };
}
