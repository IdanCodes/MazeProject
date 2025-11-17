import React, { useMemo, useRef, useState } from "react";
import { MazeSize } from "../../types/maze-size";
import GameInstance, { GameManagerHandle } from "../../components/GameInstance";
import {
  equalVec,
  parseVector2,
  Vector2,
  ZERO_VEC,
} from "../../interfaces/Vector2";
import PrimaryButton from "../../components/buttons/PrimaryButton";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { Maze } from "../../types/Maze";
import { CellType, Grid } from "../../types/Grid";
import useAnimationUpdate from "../../hooks/useAnimationUpdate";
import {
  buildGameRequest,
  parseGameServerMessage,
} from "../../utils/game-protocol";
import { GameMsgType } from "../../components/game-msg-type";

const SERVER_PORT = 3003;
const SERVER_IP = "127.0.0.1";
const SERVER_WS_URL: string = `ws://${SERVER_IP}:${SERVER_PORT}`;

function NetworkConnDemo() {
  const [mazeSize, setMazeSize] = useState({
    scale: 10,
    sizeStr: "Medium",
    mazeSize: MazeSize.Medium,
  });
  const managerRef = useRef<GameManagerHandle | null>(null);
  const playerPos = useRef<Vector2>(ZERO_VEC);
  const lastSentPos = useRef<Vector2>(ZERO_VEC);
  const [connectOnDemand, setConnectOnDemand] = useState<boolean>(true);
  const { sendMessage, readyState } = useWebSocket(
    SERVER_WS_URL,
    {
      onOpen: () => console.log("Connected!"),
      onMessage: (e: MessageEvent) => onReceiveMessage(e),
    },
    connectOnDemand,
  );
  const [otherPlayers, setOtherPlayers] = useState<Map<string, Vector2>>(
    new Map(),
  );

  const connectedToServer = useMemo<boolean>(() => {
    return readyState === ReadyState.OPEN;
  }, [readyState]);

  function generateMaze() {
    if (!managerRef.current) return;
    managerRef.current.generateMaze();
  }

  function onReceiveMessage(msg: MessageEvent) {
    const serverMsg = parseGameServerMessage(msg.data);
    if (serverMsg) handleServerMessage(serverMsg);
    else
      console.log(
        "Received message from server with invalid format:",
        msg.data,
      );
  }

  function handleServerMessage(msg: {
    msgType: GameMsgType;
    source: string;
    data: any | undefined;
  }) {
    switch (msg.msgType) {
      case GameMsgType.MAZE: {
        if (!managerRef.current) return;
        const matrix = msg.data as CellType[][];
        const grid = new Grid(matrix);
        const maze = new Maze(grid);
        managerRef.current.setMaze(maze);
        break;
      }

      case GameMsgType.UPDATE_POS: {
        const newPlayerPos: Vector2 | undefined = parseVector2(msg.data);
        if (!newPlayerPos) return;

        const oldPlayerPos = otherPlayers.get(msg.source);
        if (oldPlayerPos && equalVec(oldPlayerPos, newPlayerPos)) return;

        setOtherPlayers((op) => {
          const newOp = new Map(op);
          newOp.set(msg.source, newPlayerPos);
          return newOp;
        });
        break;
      }

      case GameMsgType.PLAYER_CONNECTED: {
        sendPos();
        break;
      }

      case GameMsgType.PLAYER_DISCONNECTED: {
        setOtherPlayers((op) => {
          const newOp = new Map(op);
          newOp.delete(msg.source);
          return newOp;
        });
        break;
      }

      default:
        break;
    }
  }

  function sendMaze() {
    if (!managerRef.current) return;

    const maze = managerRef.current.getMaze();
    sendMessage(buildGameRequest(GameMsgType.MAZE, maze.getMatrix()));
  }

  function sendPos() {
    sendMessage(buildGameRequest(GameMsgType.UPDATE_POS, playerPos.current));
    lastSentPos.current = playerPos.current;
  }

  useAnimationUpdate(10, () => {
    if (!equalVec(playerPos.current, lastSentPos.current)) sendPos();
  });

  return (
    <>
      <div className="w-[80%] mx-auto flex flex-row justify-center border-5 gap-10 p-5">
        <div>
          <PrimaryButton onClick={generateMaze} text="Generate" />
          <PrimaryButton onClick={sendMaze} text="Send" />
          <p className="text-xl">
            Status:
            {readyState == ReadyState.OPEN
              ? "Connected"
              : readyState === ReadyState.CLOSED
                ? "Closed"
                : ""}
          </p>
        </div>
        <GameInstance
          ref={managerRef}
          gameOptions={{
            mazeScale: 14,
            mazeSize: MazeSize.Large,
          }}
          onPlayerMove={(pos) => {
            if (!equalVec(pos, playerPos.current)) playerPos.current = pos;
          }}
          otherPlayers={otherPlayers}
        />
      </div>
    </>
  );
}

export default NetworkConnDemo;

function strToSize(s: string): MazeSize {
  switch (s) {
    case "XS":
      return MazeSize.XS;
    case "Small":
      return MazeSize.Small;
    case "Medium":
      return MazeSize.Medium;
    case "Large":
      return MazeSize.Large;
    case "XL":
      return MazeSize.XL;
    default:
      return MazeSize.Medium;
  }
}
