import React, { useEffect, useMemo, useRef, useState } from "react";
import usePlayerInputHandler from "../hooks/usePlayerPositionHandler";
import { getMazeRenderHeight, MazeSize } from "../types/maze-size";
import { Maze } from "../types/Maze";
import GameCanvas, { GameCanvasHandle } from "./GameCanvas";
import { CellType } from "../types/Grid";
import { lerp } from "../utils/common-helpers";
import useAnimationUpdate from "../hooks/useAnimationUpdate";
import {
  calcMagnitude,
  calcNormalized,
  scaleVec,
  Vector2,
  ZERO_VEC,
} from "../interfaces/Vector2";
import { GameOptions } from "@src/components/GameOptionsSelector";

const GAME_FPS = 60;
const PHYSICS_UPDATE_FPS = 50;

export interface GameManagerHandle {
  generateMaze: () => void;
  getMaze: () => Maze;
  setMaze: (maze: Maze) => void;
}

function GameInstance({
  viewOptions,
  maze,
  otherPlayers,
  onPlayerMove = undefined,
}: {
  viewOptions: GameOptions;
  maze: Maze;
  otherPlayers: Map<string, Vector2>;
  onPlayerMove?: (pos: Vector2) => void;
}) {
  if (!maze) return;

  const gameCanvasRef = useRef<GameCanvasHandle | null>(null);
  const targetVelocity = useRef<Vector2>({ x: 0, y: 0 });
  const velocity = useRef<Vector2>({ x: 0, y: 0 });

  const cellScale = useMemo(
    () => getMazeRenderHeight(viewOptions.mazeSize) / maze.height,
    [maze.height, viewOptions],
  );
  const [playerPos, setPlayerPos] = useState<Vector2>(ZERO_VEC);

  useEffect(() => {
    setPlayerPos({
      // 0, 0
      x: cellScale / 2,
      y: cellScale / 2,
    });
  }, [maze]);

  // cells per second
  const playerSpeed = 3;
  const accelerationRate = 0.25;
  const decelerationRate = 0.4;

  const speedAmplifier = useMemo(() => {
    return (playerSpeed * cellScale * 4) / GAME_FPS;
  }, [cellScale]);

  usePlayerInputHandler((inputVec) => {
    targetVelocity.current = scaleVec(
      calcNormalized({
        x: inputVec.x,
        y: inputVec.y,
      }),
      speedAmplifier,
    );
  });

  useAnimationUpdate(GAME_FPS, () => {
    setPlayerPos((cp: Vector2): Vector2 => {
      if (!gameCanvasRef.current) return cp;

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

  useAnimationUpdate(PHYSICS_UPDATE_FPS, () => {
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

  if (onPlayerMove)
    useEffect(() => {
      onPlayerMove(playerPos);
    }, [playerPos]);

  return (
    <GameCanvas
      ref={gameCanvasRef}
      maze={maze}
      cellScale={cellScale}
      playerPos={playerPos}
      otherPlayers={otherPlayers}
    />
  );
}

export default GameInstance;
