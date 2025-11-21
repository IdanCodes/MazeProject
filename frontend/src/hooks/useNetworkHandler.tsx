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
import {
  buildGameRequest,
  parseGameServerMessage,
} from "@src/utils/game-protocol";
import useWebSocket, { ReadyState } from "react-use-websocket";
import useAnimationUpdate from "@src/hooks/useAnimationUpdate";

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
  onError: (e: Event) => void = (_) => {},
  posUpdateRate: number = 10,
): {
  otherPlayers: Map<string, Vector2>;
  sendMaze: (maze: Maze) => void;
  readyState: ReadyState;
  connectToServer: () => void;
  disconnectFromServer: () => void;
} {
  const lastSentPos = useRef<Vector2>(ZERO_VEC);
  const [otherPlayers, setOtherPlayers] = useState<Map<string, Vector2>>(
    new Map(),
  );
  const [connectOnDemand, setConnectOnDemand] = useState<boolean>(false);
  const { sendMessage, readyState } = useWebSocket(
    SERVER_WS_URL,
    {
      onOpen: () => console.log("Connected!"),
      onMessage: (e: MessageEvent) => onReceiveMessage(e),
      onError: (e: Event) => onError(e),
    },
    connectOnDemand,
  );

  function onReceiveMessage(msg: MessageEvent) {
    const serverMsg = parseGameServerMessage(msg.data);
    if (serverMsg) handleServerMessage(serverMsg);
    else
      console.log(
        "Received message from server with invalid format:",
        msg.data,
      );
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

  const updatePlayerPos = (src: string, pos: Vector2) => {
    setOtherPlayers((op) => {
      const newOp = new Map(op);
      newOp.set(src, pos);
      return newOp;
    });
  };

  function handleMessageUpdatePos(msg: NetworkMessage) {
    const normalizedPos: Vector2 | undefined = parseVector2(msg.data);
    if (!normalizedPos) return;

    const newPlayerPos: Vector2 = {
      x: normalizedPos.x * canvasSize.width,
      y: normalizedPos.y * canvasSize.height,
    } as Vector2;

    const oldPlayerPos = otherPlayers.get(msg.source);
    if (oldPlayerPos && equalVec(oldPlayerPos, newPlayerPos)) return;

    updatePlayerPos(msg.source, newPlayerPos);
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
    sendMessage(buildGameRequest(GameMsgType.UPDATE_POS, posToSend));
    lastSentPos.current = localPlayerPos;
  }

  function sendMaze(maze: Maze) {
    sendMessage(buildGameRequest(GameMsgType.MAZE, maze.getMatrix()));
  }

  useAnimationUpdate(posUpdateRate, () => {
    if (!equalVec(localPlayerPos, lastSentPos.current)) sendPos();
  });

  function connectToServer() {
    setConnectOnDemand(true);
  }

  function disconnectFromServer() {
    setOtherPlayers(new Map());
    setConnectOnDemand(false);
  }

  return {
    otherPlayers,
    sendMaze,
    readyState,
    connectToServer,
    disconnectFromServer,
  };
}
