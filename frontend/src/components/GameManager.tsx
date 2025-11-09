import React, { useEffect, useRef, useState } from "react";
import usePlayerInputHandler from "../hooks/usePlayerPositionHandler";
import { getMazeRenderHeight, MazeSize } from "../types/maze-size";
import { Maze } from "@shared/types/Maze";
import GameCanvas from "./GameCanvas";
import {
  addPos,
  equalPos,
  GridPos,
  isDiagonalVector,
  ZERO_POS,
} from "@shared/types/GridPos";
import { CellType, createRectGrid } from "@shared/types/Grid";
import { generateDFSRectGrid } from "@shared/utils/maze-generator";
import { getRandomInt } from "@shared/utils/common-helpers";
import useAnimationUpdate from "../hooks/useAnimationUpdate";

function GameManager({
  mazeSize,
  mazeScale,
  fps = 5,
  genFlag,
}: {
  mazeSize: MazeSize;
  mazeScale: number;
  fps?: number;
  genFlag: { flag: boolean; setFlag: (value: boolean) => void };
}) {
  const [maze, setMaze] = useState<Maze>(new Maze(createRectGrid(5, 5)));
  const [playerPos, setPlayerPos] = useState<GridPos>({ row: 0, col: 0 });
  const inputVector = useRef<GridPos>({ row: 0, col: 0 });
  const cellScale = getMazeRenderHeight(mazeSize) / maze.height;

  function getNextPos(pos: GridPos, inputVec: GridPos): GridPos {
    let delta: GridPos = {
      row: inputVec.row > 0 ? 2 : inputVec.row < 0 ? -2 : 0,
      col: inputVec.col > 0 ? 2 : inputVec.col < 0 ? -2 : 0,
    };

    const targetPos = addPos(pos, delta);
    const targetBridge = addPos(pos, inputVec);
    if (!isDiagonalVector(inputVec)) {
      if (
        !maze.inBounds(targetPos) ||
        maze.getCell(targetBridge) === CellType.Wall
      )
        return pos;
      return targetPos;
    }

    const verticalBridge: GridPos = {
      row: pos.row + inputVec.row,
      col: pos.col,
    };
    const verticalTarget: GridPos = {
      row: pos.row + delta.row,
      col: pos.col,
    };
    if (
      !maze.inBounds(verticalTarget) ||
      maze.getCell(verticalBridge) === CellType.Wall
    )
      delta.row = 0;

    const horizontalBridge: GridPos = {
      row: pos.row,
      col: pos.col + inputVec.col,
    };
    const horizontalTarget: GridPos = {
      row: pos.row,
      col: pos.col + delta.col,
    };
    if (
      !maze.inBounds(horizontalTarget) ||
      maze.getCell(horizontalBridge) === CellType.Wall
    )
      delta.col = 0;

    // diagonal -> horizontal
    if (isDiagonalVector(delta)) delta.row = 0;

    return addPos(pos, delta);
  }

  usePlayerInputHandler((deltaPos: GridPos) => {
    inputVector.current = deltaPos;
    moveLoop(deltaPos);
  });

  function moveLoop(deltaPos: GridPos) {
    if (
      !equalPos(deltaPos, inputVector.current) ||
      equalPos(deltaPos, ZERO_POS)
    )
      return;

    setPlayerPos((pos) => getNextPos(pos, inputVector.current));

    setTimeout(() => {
      moveLoop(deltaPos);
    }, 1000 / fps);
  }

  function generateMaze() {
    const grid = generateDFSRectGrid(mazeScale * 2 - 1, mazeScale * 2 - 1);

    const border = {
      finishColumn: getRandomInt(1, mazeScale) * 2 - 1,
      startColumn: getRandomInt(1, mazeScale) * 2 - 1,
    };
    setMaze(new Maze(grid));
    setPlayerPos({
      row: maze.height - 1,
      col: border.startColumn - 1,
    });
  }

  useEffect(() => {
    if (!genFlag.flag) return;

    console.log("generate");
    genFlag.setFlag(false);
    generateMaze();
  }, [mazeSize, genFlag.flag]);

  return <GameCanvas maze={maze} cellScale={cellScale} playerPos={playerPos} />;
}

export default GameManager;
