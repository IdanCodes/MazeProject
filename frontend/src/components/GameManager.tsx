import React, { useEffect, useState } from "react";
import usePlayerPositionHandler from "../hooks/usePlayerPositionHandler";
import { getMazeRenderHeight, MazeSize } from "../types/maze-size";
import { Maze } from "@shared/types/Maze";
import GameCanvas from "./GameCanvas";
import { addPos, equalPos, GridPos, ZERO_POS } from "@shared/types/GridPos";
import { CellType } from "@shared/types/Grid";

function GameManager({
  maze,
  size,
  fps = 30,
}: {
  maze: Maze;
  size: MazeSize;
  fps?: number;
}) {
  const [playerPos, setPlayerPos] = useState<GridPos>({ row: 0, col: 0 });
  const cellScale = getMazeRenderHeight(size) / maze.height;
  usePlayerPositionHandler((deltaPos: GridPos) => {
    const newPos = maze.clamp(addPos(playerPos, deltaPos));
    if (equalPos(playerPos, newPos)) return;

    console.log(maze.getCell(newPos));
    setPlayerPos(newPos);
  });

  useEffect(() => {
    console.log(playerPos);
  }, [playerPos]);

  return <GameCanvas maze={maze} cellScale={cellScale} playerPos={playerPos} />;
}

export default GameManager;
