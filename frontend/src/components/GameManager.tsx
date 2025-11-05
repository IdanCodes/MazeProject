import React, { useEffect, useState } from "react";
import useAnimationUpdate from "../hooks/useAnimationUpdate";
import { GridPos } from "@shared/types/Grid";
import usePlayerHandler from "../hooks/usePlayerHandler";
import { getMazeRenderHeight, MazeSize } from "../types/maze-size";
import { Maze } from "@shared/types/Maze";
import GameCanvas from "./GameCanvas";

function GameManager({
  maze,
  size,
  fps = 30,
}: {
  maze: Maze;
  size: MazeSize;
  fps?: number;
}) {
  const [playerPos, setPlayerPos] = useState<GridPos>();
  const cellScale = getMazeRenderHeight(size) / maze.height;
  usePlayerHandler(setPlayerPos, maze.height);

  useEffect(() => {
    console.log(playerPos);
  }, [playerPos]);

  return <GameCanvas maze={maze} cellScale={cellScale} />;
}

export default GameManager;
