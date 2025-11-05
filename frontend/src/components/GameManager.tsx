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
  fps = 120,
  genFlag,
}: {
  mazeSize: MazeSize;
  mazeScale: number;
  fps?: number;
  genFlag: { flag: boolean; setFlag: (value: boolean) => void };
}) {
  const [maze, setMaze] = useState<Maze>(new Maze(createRectGrid(5, 5)));
  const [playerPos, setPlayerPos] = useState<GridPos>({ row: 0, col: 0 });
  const delta = useRef<GridPos>({ row: 0, col: 0 });
  const lastMove = useRef<GridPos>({ row: 0, col: 0 });
  const cellScale = getMazeRenderHeight(mazeSize) / maze.height;

  const currFrame = useRef<number>(0);
  const startMove = useRef<number>(-1);
  const moveCooldown = 10;

  function canMoveDelta(delta: GridPos): boolean {
    delta = {
      row: delta.row > 0 ? 1 : delta.row < 0 ? -1 : 0,
      col: delta.col > 0 ? 1 : delta.col < 0 ? -1 : 0,
    };

    const targetPos = addPos(playerPos, addPos(delta, delta));
    if (!maze.inBounds(targetPos)) return false;

    const bridgePos = addPos(playerPos, delta);
    return maze.getCell(bridgePos) !== CellType.Wall;
  }

  useAnimationUpdate(fps, () => {
    currFrame.current = (currFrame.current + 1) % fps;
    if (equalPos(delta.current, ZERO_POS)) return;

    if (startMove.current < 0) startMove.current = currFrame.current;

    if ((currFrame.current - startMove.current) % moveCooldown != 0) return;

    const oldPos = playerPos;
    let deltaPos = { ...delta.current };
    deltaPos = addPos(deltaPos, deltaPos);
    if (isDiagonalVector(deltaPos)) {
      // moving vertically
      if (lastMove.current.row != 0) {
        console.log("Moving vertically");
        const moveHorizontal = maze.clamp(
          addPos(oldPos, { row: 0, col: deltaPos.col }),
        );
        // if (maze.getCell(moveHorizontal) === CellType.Wall) deltaPos.col = 0;
        if (!canMoveDelta({ row: 0, col: deltaPos.col })) deltaPos.col = 0;
        else deltaPos.row = 0;
      } else {
        const moveVertical = maze.clamp(
          addPos(oldPos, { row: deltaPos.row, col: 0 }),
        );
        // if (maze.getCell(moveVertical) === CellType.Wall) deltaPos.row = 0;
        if (!canMoveDelta({ row: deltaPos.row, col: 0 })) deltaPos.row = 0;
        else deltaPos.col = 0;
      }
    }

    // let newPos = maze.clamp(addPos(oldPos, deltaPos));
    if (!canMoveDelta(deltaPos)) return oldPos;
    const newPos = addPos(oldPos, deltaPos);
    console.log(deltaPos);
    lastMove.current = deltaPos;
    setPlayerPos(newPos);
  });

  useEffect(() => {
    if (
      equalPos(delta.current, ZERO_POS) ||
      equalPos(lastMove.current, ZERO_POS)
    ) {
      startMove.current = -1;
      lastMove.current = ZERO_POS;
    } else startMove.current = currFrame.current;
  }, [delta.current, lastMove.current]);

  // usePlayerPositionHandler((deltaPos: GridPos) => {
  //   let newPos = maze.clamp(addPos(playerPos, deltaPos));
  //   if (equalPos(playerPos, newPos)) return (delta.current = ZERO_POS);
  //
  //   if (lastMove.current.row != 0) {
  //     if (!moveHorizontal() && !moveVertical())
  //       lastMove.current = { row: 0, col: 0 };
  //   } else if (!moveVertical() && !moveHorizontal())
  //     lastMove.current = { row: 0, col: 0 };
  //
  //   function moveHorizontal() {
  //     return tryMove({ row: 0, col: deltaPos.col });
  //   }
  //
  //   function moveVertical() {
  //     return tryMove({ row: deltaPos.row, col: 0 });
  //   }
  //
  //   function tryMove(deltaPos: GridPos): boolean {
  //     const newPos = maze.clamp(addPos(playerPos, deltaPos));
  //     if (maze.getCell(newPos) === CellType.Passage) {
  //       // setPlayerPos(newPos);
  //       delta.current = deltaPos;
  //       lastMove.current = deltaPos;
  //       return true;
  //     }
  //     return false;
  //   }
  // });

  usePlayerInputHandler((deltaPos: GridPos) => {
    // console.log(deltaPos);
    delta.current = deltaPos;
  });

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

  // useEffect(() => {
  //   console.log(playerPos);
  // }, [playerPos]);

  useEffect(() => {
    if (!genFlag.flag) return;

    console.log("generate");
    genFlag.setFlag(false);
    generateMaze();
  }, [mazeSize, genFlag.flag]);

  return <GameCanvas maze={maze} cellScale={cellScale} playerPos={playerPos} />;
}

export default GameManager;
