import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import usePlayerInputHandler from "../hooks/usePlayerPositionHandler";
import { getMazeRenderHeight } from "../types/maze-size";
import { Maze } from "../types/Maze";
import GameCanvas, { GameCanvasHandle, PLAYER_RADIUS } from "./GameCanvas";
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
import { PlayerInfo } from "@src/interfaces/PlayerInfo";

const GAME_FPS = 60;
const PHYSICS_UPDATE_FPS = 50;

export interface GameInstanceHandle {
  gameCanvasRef: GameCanvasHandle | null;
}

const GameInstance = forwardRef<
  GameInstanceHandle,
  {
    gameOptions: GameOptions;
    maze: Maze;
    otherPlayers: PlayerInfo[];
    onPlayerMove?: (pos: Vector2) => void;
  }
>(({ gameOptions, maze, otherPlayers, onPlayerMove = undefined }, ref) => {
  if (!maze) return;

  const gameCanvasRef = useRef<GameCanvasHandle | null>(null);
  const targetVelocity = useRef<Vector2>({ x: 0, y: 0 });
  const velocity = useRef<Vector2>({ x: 0, y: 0 });

  const cellScale = useMemo(
    () => getMazeRenderHeight(gameOptions.mazeSize) / maze.height,
    [maze.height, gameOptions],
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
  const accelerationRate = 0.2;
  const decelerationRate = 0.13;

  const speedAmplifier = useMemo(() => {
    return (playerSpeed * cellScale * 4) / GAME_FPS;
  }, [cellScale]);

  const accelerationSpeed = useMemo(() => {
    return (accelerationRate * cellScale * 4) / GAME_FPS;
  }, [cellScale]);

  const decelerationSpeed = useMemo(() => {
    return (decelerationRate * cellScale * 4) / GAME_FPS;
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
      const checkCollision = (pos: Vector2) =>
        gameCanvasRef.current?.checkCircleCollision(pos, PLAYER_RADIUS);

      const newPos: Vector2 = {
        x: cp.x + velocity.current.x,
        y: cp.y + velocity.current.y,
      };

      // Check full movement
      if (!checkCollision(newPos)) return newPos;

      // Try horizontal only
      const onlyHorizontal: Vector2 = {
        x: newPos.x,
        y: cp.y,
      };
      if (!checkCollision(onlyHorizontal)) return onlyHorizontal;

      // Try vertical only
      const onlyVertical: Vector2 = {
        x: cp.x,
        y: newPos.y,
      };
      if (!checkCollision(onlyVertical)) return onlyVertical;

      // const newGridPos: Vector2 = gameCanvasRef.current.canvasToGrid(newPos);

      // if (
      //   maze.inBounds(newGridPos) &&
      //   maze.getCell(newGridPos) !== CellType.Wall
      // )
      //   return newPos;

      // const onlyHorizontal: Vector2 = {
      //   x: newPos.x,
      //   y: cp.y,
      // };
      // const onlyHorizontalGP: Vector2 =
      //   gameCanvasRef.current.canvasToGrid(onlyHorizontal);
      // if (
      //   maze.inBounds(onlyHorizontalGP) &&
      //   maze.getCell(onlyHorizontalGP) === CellType.Passage
      // )
      //   return onlyHorizontal;

      // const onlyVertical: Vector2 = {
      //   x: cp.x,
      //   y: newPos.y,
      // };
      // const onlyVerticalGP: Vector2 =
      //   gameCanvasRef.current.canvasToGrid(onlyVertical);
      // if (
      //   maze.inBounds(onlyVerticalGP) &&
      //   maze.getCell(onlyVerticalGP) === CellType.Passage
      // )
      //   return onlyVertical;

      return cp;
    });
  });

  useAnimationUpdate(PHYSICS_UPDATE_FPS, () => {
    const epsilon = 0.05;
    velocity.current = {
      x: lerp(
        velocity.current.x,
        targetVelocity.current.x,
        targetVelocity.current.x != 0 ? accelerationSpeed : decelerationSpeed,
      ),
      y: lerp(
        velocity.current.y,
        targetVelocity.current.y,
        targetVelocity.current.y != 0 ? accelerationSpeed : decelerationSpeed,
      ),
    };

    if (calcMagnitude(velocity.current) < epsilon) velocity.current = ZERO_VEC;
  });

  useImperativeHandle(
    ref,
    () => ({
      gameCanvasRef: gameCanvasRef.current,
    }),
    [gameCanvasRef.current],
  );

  if (onPlayerMove)
    useEffect(() => {
      onPlayerMove(playerPos);
    }, [playerPos]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(
          e.code,
        ) > -1
      )
        e.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <GameCanvas
      ref={gameCanvasRef}
      maze={maze}
      cellScale={cellScale}
      playerPos={playerPos}
      otherPlayers={otherPlayers}
    />
  );
});

export default GameInstance;
