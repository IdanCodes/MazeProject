import React, { useEffect, useState } from "react";
import usePlayerPositionHandler from "../hooks/usePlayerPositionHandler";
import { getMazeRenderHeight, MazeSize } from "../types/maze-size";
import { Maze } from "@shared/types/Maze";
import GameCanvas from "./GameCanvas";
import {
  addPos,
  equalPos,
  GridPos,
  isDiagonalVector,
} from "@shared/types/GridPos";
import { CellType, createRectGrid } from "@shared/types/Grid";
import { generateDFSRectGrid } from "@shared/utils/maze-generator";
import { getRandomInt } from "@shared/utils/common-helpers";

function GameManager({
  mazeSize,
  mazeScale,
  fps = 30,
  genFlag,
}: {
  mazeSize: MazeSize;
  mazeScale: number;
  fps?: number;
  genFlag: { flag: boolean; setFlag: (value: boolean) => void };
}) {
  const [maze, setMaze] = useState<Maze>(new Maze(createRectGrid(5, 5)));
  const [playerPos, setPlayerPos] = useState<GridPos>({ row: 0, col: 0 });
  const cellScale = getMazeRenderHeight(mazeSize) / maze.height;

  usePlayerPositionHandler((deltaPos: GridPos) => {
    let newPos = maze.clamp(addPos(playerPos, deltaPos));
    if (equalPos(playerPos, newPos)) return;
    let isWall = maze.getCell(newPos) === CellType.Wall;
    if (!isWall && !isDiagonalVector(deltaPos)) return setPlayerPos(newPos);

    newPos = maze.clamp(addPos(playerPos, { row: deltaPos.row, col: 0 }));
    isWall = maze.getCell(newPos) === CellType.Wall;
    if (!isWall) return setPlayerPos(newPos);

    newPos = maze.clamp(addPos(playerPos, { row: 0, col: deltaPos.col }));
    isWall = maze.getCell(newPos) === CellType.Wall;
    if (!isWall) return setPlayerPos(newPos);
  });

  function generateMaze() {
    const grid = generateDFSRectGrid(mazeScale * 2 - 1, mazeScale * 2 - 1);

    const border = {
      finishColumn: getRandomInt(1, mazeScale) * 2 - 1,
      startColumn: getRandomInt(1, mazeScale) * 2 - 1,
    };
    setMaze(new Maze(grid, border));
    setPlayerPos({
      row: maze.height - 2,
      col: border.startColumn,
    });
  }

  useEffect(() => {
    console.log(playerPos);
  }, [playerPos]);

  useEffect(() => {
    if (!genFlag.flag) return;

    console.log("generate");
    genFlag.setFlag(false);
    generateMaze();
  }, [mazeSize, genFlag.flag]);

  return <GameCanvas maze={maze} cellScale={cellScale} playerPos={playerPos} />;
}

export default GameManager;
