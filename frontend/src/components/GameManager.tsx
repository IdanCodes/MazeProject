import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import usePlayerInputHandler from "../hooks/usePlayerPositionHandler";
import { getMazeRenderHeight, MazeSize } from "../types/maze-size";
import { Maze } from "@shared/types/Maze";
import GameCanvas, { GameCanvasHandle } from "./GameCanvas";
import { CellType, createRectGrid } from "@shared/types/Grid";
import { generateDFSRectGrid } from "@shared/utils/maze-generator";
import { getRandomInt, lerp } from "@shared/utils/common-helpers";
import useAnimationUpdate from "../hooks/useAnimationUpdate";
import {
  calcMagnitude,
  calcNormalized,
  equalVec,
  scaleVec,
  Vector2,
  ZERO_VEC,
} from "@shared/interfaces/Vector2";

export interface GameManagerHandle {
  generateMaze: () => void;
}

const GameManager = forwardRef<
  GameManagerHandle,
  {
    mazeSize: MazeSize;
    mazeScale: number;
    fps?: number;
    onPlayerMove?: (pos: Vector2) => void;
  }
>(({ mazeSize, mazeScale, fps = 60, onPlayerMove = undefined }, ref) => {
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
    setPlayerPos((cp: Vector2): Vector2 => {
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
    const epsilon = 0.05;
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

    if (calcMagnitude(velocity.current) < epsilon) velocity.current = ZERO_VEC;
  });

  useImperativeHandle(ref, () => ({
    generateMaze,
  }));

  if (onPlayerMove)
    useEffect(() => {
      onPlayerMove(playerPos);
    }, [playerPos]);

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

  return (
    <GameCanvas
      ref={gameCanvasRef}
      maze={maze}
      cellScale={cellScale}
      playerPos={playerPos}
    />
  );
});

export default GameManager;
