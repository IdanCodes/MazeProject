import React, { useEffect, useRef, useState } from "react";
import usePlayerInputHandler from "../hooks/usePlayerPositionHandler";
import { getMazeRenderHeight, MazeSize } from "../types/maze-size";
import { Maze } from "@shared/types/Maze";
import GameCanvas, {
  calcNormalized,
  GameCanvasHandle,
  scaleVec,
  Vector2,
} from "./GameCanvas";
import { GridPos } from "@shared/types/GridPos";
import { CellType, createRectGrid } from "@shared/types/Grid";
import { generateDFSRectGrid } from "@shared/utils/maze-generator";
import { getRandomInt } from "@shared/utils/common-helpers";
import useAnimationUpdate from "../hooks/useAnimationUpdate";

function GameManager({
  mazeSize,
  mazeScale,
  fps = 60,
  genFlag,
}: {
  mazeSize: MazeSize;
  mazeScale: number;
  fps?: number;
  genFlag: { flag: boolean; setFlag: (value: boolean) => void };
}) {
  const [maze, setMaze] = useState<Maze>(new Maze(createRectGrid(5, 5)));
  const gameCanvasRef = useRef<GameCanvasHandle | null>(null);
  const [playerPos, setPlayerPos] = useState<GridPos>({ row: 0, col: 0 });
  const inputVector = useRef<GridPos>({ row: 0, col: 0 });
  const [canvasPos, setCanvasPos] = useState<Vector2>({ x: 0, y: 0 });
  const velocity = useRef<Vector2>({ x: 0, y: 0 });
  const speedAmplifier = 3.5;

  const cellScale = getMazeRenderHeight(mazeSize) / maze.height;
  usePlayerInputHandler((inputVec) => {
    velocity.current = scaleVec(
      calcNormalized({
        x: inputVec.col,
        y: inputVec.row,
      }),
      speedAmplifier,
    );
  });

  useAnimationUpdate(fps, () => {
    setCanvasPos((cp) => {
      if (!gameCanvasRef.current) return cp;

      // TODO: if close to wall, clamp the next pos to be close to but not on the wall

      const newPos: Vector2 = {
        x: cp.x + velocity.current.x,
        y: cp.y + velocity.current.y,
      };

      const newGridPos: GridPos = gameCanvasRef.current.canvasToGrid(newPos);

      if (
        maze.inBounds(newGridPos) &&
        maze.getCell(newGridPos) !== CellType.Wall
      )
        return newPos;

      const onlyHorizontal: Vector2 = {
        x: newPos.x,
        y: cp.y,
      };
      const onlyHorizontalGP: GridPos =
        gameCanvasRef.current.canvasToGrid(onlyHorizontal);
      if (
        maze.inBounds(onlyHorizontalGP) &&
        maze.getCell(onlyHorizontalGP) !== CellType.Wall
      )
        return onlyHorizontal;

      const onlyVertical: Vector2 = {
        x: cp.x,
        y: newPos.y,
      };
      const onlyVerticalGP: GridPos =
        gameCanvasRef.current.canvasToGrid(onlyVertical);
      if (
        maze.inBounds(onlyVerticalGP) &&
        maze.getCell(onlyVerticalGP) !== CellType.Wall
      )
        return onlyVertical;

      return cp;
    });
  });

  // function getNextPos(pos: GridPos, inputVec: GridPos): GridPos {
  //   let delta: GridPos = {
  //     row: inputVec.row > 0 ? 2 : inputVec.row < 0 ? -2 : 0,
  //     col: inputVec.col > 0 ? 2 : inputVec.col < 0 ? -2 : 0,
  //   };
  //
  //   const targetPos = addPos(pos, delta);
  //   const targetBridge = addPos(pos, inputVec);
  //   if (!isDiagonalVector(inputVec)) {
  //     if (
  //       !maze.inBounds(targetPos) ||
  //       maze.getCell(targetBridge) === CellType.Wall
  //     )
  //       return pos;
  //     return targetPos;
  //   }
  //
  //   const verticalBridge: GridPos = {
  //     row: pos.row + inputVec.row,
  //     col: pos.col,
  //   };
  //   const verticalTarget: GridPos = {
  //     row: pos.row + delta.row,
  //     col: pos.col,
  //   };
  //   if (
  //     !maze.inBounds(verticalTarget) ||
  //     maze.getCell(verticalBridge) === CellType.Wall
  //   )
  //     delta.row = 0;
  //
  //   const horizontalBridge: GridPos = {
  //     row: pos.row,
  //     col: pos.col + inputVec.col,
  //   };
  //   const horizontalTarget: GridPos = {
  //     row: pos.row,
  //     col: pos.col + delta.col,
  //   };
  //   if (
  //     !maze.inBounds(horizontalTarget) ||
  //     maze.getCell(horizontalBridge) === CellType.Wall
  //   )
  //     delta.col = 0;
  //
  //   // diagonal -> horizontal
  //   if (isDiagonalVector(delta)) delta.row = 0;
  //
  //   return addPos(pos, delta);
  // }
  //
  // const loopNumber = useRef<number>(0);
  // usePlayerInputHandler((deltaPos: GridPos) => {
  //   inputVector.current = deltaPos;
  //   loopNumber.current = (loopNumber.current + 1) % 5;
  //   moveLoop(loopNumber.current);
  // });
  //
  // function moveLoop(loopN: number) {
  //   if (loopNumber.current != loopN || equalPos(inputVector.current, ZERO_POS))
  //     return;
  //
  //   setPlayerPos((pos) => getNextPos(pos, inputVector.current));
  //
  //   setTimeout(() => {
  //     moveLoop(loopN);
  //   }, 1000 / fps);
  // }

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

    genFlag.setFlag(false);
    generateMaze();
  }, [mazeSize, genFlag.flag]);

  return (
    <GameCanvas
      ref={gameCanvasRef}
      maze={maze}
      cellScale={cellScale}
      playerPos={canvasPos}
    />
  );
}

export default GameManager;
