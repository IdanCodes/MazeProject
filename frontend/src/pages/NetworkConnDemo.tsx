import React, { useEffect, useMemo, useRef, useState } from "react";
import { MazeSize } from "../types/maze-size";
import GameManager, { GameManagerHandle } from "../components/GameManager";
import { Vector2, ZERO_VEC } from "@shared/interfaces/Vector2";
import PrimaryButton from "../components/buttons/PrimaryButton";
import useWebSocket from "react-use-websocket";
import { Maze } from "@shared/types/Maze";
import { CellType, Grid } from "@shared/types/Grid";

const SERVER_PORT = 3003;
const SERVER_IP = "127.0.0.1";
const SERVER_WS_URL: string = `ws://${SERVER_IP}:${SERVER_PORT}`;

function constructMazeMessage(maze: Maze): unknown {
  return {
    type: "maze",
    maze: maze,
  };
}

function constructPosMessage(pos: Vector2): unknown {
  return {
    type: "pos",
    pos: pos,
  };
}

function NetworkConnDemo() {
  const [mazeSize, setMazeSize] = useState({
    scale: 10,
    sizeStr: "Medium",
    mazeSize: MazeSize.Medium,
  });
  const managerRef = useRef<GameManagerHandle | null>(null);
  const [playerPos, setPlayerPos] = useState<Vector2>(ZERO_VEC);
  const { sendMessage, sendJsonMessage, readyState, lastJsonMessage } =
    useWebSocket(SERVER_WS_URL, {
      onOpen: () => console.log("Connected!"),
      onMessage: (e: MessageEvent) => console.log("Received: ", e.data),
    });

  useEffect(() => {
    generateMaze();
  }, []);

  function generateMaze() {
    if (!managerRef.current) return;
    managerRef.current.generateMaze();
  }

  useEffect(() => {
    if (lastJsonMessage) executeMessage(lastJsonMessage);
  }, [lastJsonMessage]);

  function executeMessage(msg: any) {
    if (!msg || !("type" in msg) || typeof msg.type !== "string") {
      console.error(`Invalid message format ${msg}`);
      return;
    }

    const msgType: string = msg.type;
    if (msgType == "maze") {
      if (
        !managerRef.current ||
        !("maze" in msg) ||
        msg.maze === undefined ||
        !("grid" in msg.maze) ||
        msg.maze.grid === undefined
      )
        return;
      const matrix: CellType[][] = msg.maze.grid.matrix;
      const grid = new Grid(matrix);
      const maze = new Maze(grid);
      managerRef.current.setMaze(maze);
    }
  }

  function sendMaze() {
    if (!managerRef.current) return;

    const maze = managerRef.current.getMaze();
    sendJsonMessage(constructMazeMessage(maze));
  }

  return (
    <>
      <div className="w-[80%] mx-auto flex flex-row justify-center border-5 gap-10 p-5">
        <div>
          <PrimaryButton onClick={generateMaze} text="Generate" />
          <PrimaryButton onClick={sendMaze} text="Send" />
        </div>
        <GameManager
          ref={managerRef}
          mazeSize={mazeSize.mazeSize}
          mazeScale={mazeSize.scale}
          onPlayerMove={setPlayerPos}
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
