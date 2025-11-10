import React, { useEffect, useRef, useState } from "react";
import usePlayerInputHandler from "../hooks/usePlayerPositionHandler";
import { getMazeRenderHeight, MazeSize } from "../types/maze-size";
import { Maze } from "@shared/types/Maze";
import GameCanvas, { GameCanvasHandle } from "./GameCanvas";
import { CellType, createRectGrid } from "@shared/types/Grid";
import { generateDFSRectGrid } from "@shared/utils/maze-generator";
import { getRandomInt, lerp } from "@shared/utils/common-helpers";
import useAnimationUpdate from "../hooks/useAnimationUpdate";
import { calcNormalized, scaleVec, Vector2 } from "@shared/interfaces/Vector2";

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
  const [playerPos, setPlayerPos] = useState<Vector2>({ x: 0, y: 0 });
  const targetVelocity = useRef<Vector2>({ x: 0, y: 0 });
  const velocity = useRef<Vector2>({ x: 0, y: 0 });
  const speedAmplifier = 4;

  const cellScale = getMazeRenderHeight(mazeSize) / maze.height;
  usePlayerInputHandler((inputVec) => {
    targetVelocity.current = scaleVec(
      calcNormalized({
        x: inputVec.x,
        y: inputVec.y,
      }),
      speedAmplifier,
    );
  });

  const accelerationRate = 0.3;
  const decelerationRate = 0.4;
  useAnimationUpdate(fps, () => {
    setPlayerPos((cp) => {
      if (!gameCanvasRef.current) return cp;

      // TODO: if close to wall, clamp the next pos to be close to but not on the wall

      const newPos: Vector2 = {
        x: cp.x + velocity.current.x,
        y: cp.y + velocity.current.y,
      };

      const newGridPos: Vector2 = gameCanvasRef.current.canvasToGrid(newPos);

      if (
        maze.inBounds(newGridPos) &&
        maze.getCell(newGridPos) !== CellType.Wall
      )
        return newPos;

      const onlyHorizontal: Vector2 = {
        x: newPos.x,
        y: cp.y,
      };
      const onlyHorizontalGP: Vector2 =
        gameCanvasRef.current.canvasToGrid(onlyHorizontal);
      if (
        maze.inBounds(onlyHorizontalGP) &&
        maze.getCell(onlyHorizontalGP) === CellType.Passage
      )
        return onlyHorizontal;

      const onlyVertical: Vector2 = {
        x: cp.x,
        y: newPos.y,
      };
      const onlyVerticalGP: Vector2 =
        gameCanvasRef.current.canvasToGrid(onlyVertical);
      if (
        maze.inBounds(onlyVerticalGP) &&
        maze.getCell(onlyVerticalGP) === CellType.Passage
      )
        return onlyVertical;

      return cp;
    });
  });

  useAnimationUpdate(50, () => {
    velocity.current = {
      x: lerp(
        velocity.current.x,
        targetVelocity.current.x,
        targetVelocity.current.x != 0 ? accelerationRate : decelerationRate,
      ),
      y: lerp(
        velocity.current.y,
        targetVelocity.current.y,
        targetVelocity.current.x != 0 ? accelerationRate : decelerationRate,
      ),
    };
  });

  function generateMaze() {
    const grid = generateDFSRectGrid(mazeScale * 2 - 1, mazeScale * 2 - 1);

    const border = {
      finishColumn: getRandomInt(1, mazeScale) * 2 - 1,
      startColumn: getRandomInt(1, mazeScale) * 2 - 1,
    };
    setMaze(new Maze(grid));
    setPlayerPos({
      x: border.startColumn - 1,
      y: maze.height - 1,
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
      playerPos={playerPos}
    />
  );
}

export default GameManager;
