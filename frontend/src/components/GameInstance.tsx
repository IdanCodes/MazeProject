import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import usePlayerInputHandler from "../hooks/usePlayerPositionHandler";
import { getMazeRenderHeight, MazeSize } from "../types/maze-size";
import { Maze } from "../types/Maze";
import GameCanvas, { GameCanvasHandle, PLAYER_RADIUS } from "./GameCanvas";
import { getRaw, lerp, moveTowards } from "../utils/common-helpers";
import useAnimationUpdate from "../hooks/useAnimationUpdate";
import {
  calcMagnitude,
  calcNormalized,
  scaleVec,
  Vector2,
  ZERO_VEC,
} from "../interfaces/Vector2";
import { PlayerInfo } from "@src/interfaces/PlayerInfo";
import { PassedState } from "@src/types/passed-state";
import { usePassedState } from "@src/hooks/usePassedState";

const GAME_FPS = 60;
const PHYSICS_UPDATE_FPS = 60;

export interface GameInstanceHandle {
  gameCanvasRef: GameCanvasHandle | null;
  cellScale: number;
}

const GameInstance = forwardRef<
  GameInstanceHandle,
  {
    mazeSize: MazeSize;
    maze: Maze;
    finishCell: Vector2;
    otherPlayers: PlayerInfo[];
    playerPosState: PassedState<Vector2>;
    onPlayerMove?: (pos: Vector2) => void;
  }
>(
  (
    {
      mazeSize,
      maze,
      finishCell,
      otherPlayers,
      playerPosState,
      onPlayerMove = undefined,
    },
    ref,
  ) => {
    const gameCanvasRef = useRef<GameCanvasHandle | null>(null);
    const targetVelocity = useRef<Vector2>({ x: 0, y: 0 });
    const velocity = useRef<Vector2>({ x: 0, y: 0 });

    const cellScale = useMemo(
      () => getMazeRenderHeight(mazeSize) / maze.height,
      [maze, mazeSize],
    );
    const [playerPos, setPlayerPos] = usePassedState<Vector2>(playerPosState);

    useEffect(() => {
      setPlayerPos({
        x: cellScale / 2,
        y: cellScale / 2,
      });
    }, [cellScale]);

    // cells per second
    const playerSpeed = 2.6;
    // const accelerationRate = 0.09;
    // const decelerationRate = 0.12;
    const accelerationRate = 0.3;
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


    useAnimationUpdate(PHYSICS_UPDATE_FPS, () => {
      const epsilon = 0.05;

      const updateVel = (target: Vector2, forceZero = false) => {
        const newX =
          target.x == 0 && forceZero
            ? 0
            : lerp(
                velocity.current.x,
                target.x,
                target.x != 0 ? accelerationSpeed : decelerationSpeed,
              );
        const newY =
          target.y == 0 && forceZero
            ? 0
            : lerp(
                velocity.current.y,
                target.y,
                target.y != 0 ? accelerationSpeed : decelerationSpeed,
              );
        velocity.current = {
          x: newX,
          y: newY,
        };
      };

      setPlayerPos((cp: Vector2): Vector2 => {
        if (!gameCanvasRef.current) return cp;
        const checkCollision = (pos: Vector2) =>
          gameCanvasRef.current?.checkCircleCollision(
            { x: pos.x + cellScale / 2, y: pos.y + cellScale / 2 },
            PLAYER_RADIUS * cellScale,
          );

        const newPos: Vector2 = {
          x: cp.x + velocity.current.x,
          y: cp.y + velocity.current.y,
        };

        // Check full movement
        if (!checkCollision(newPos)) {
          updateVel(targetVelocity.current);
          return newPos;
        }

        // Try horizontal only
        const onlyHorizontal: Vector2 = {
          x: newPos.x,
          y: cp.y,
        };
        if (!checkCollision(onlyHorizontal)) {
          updateVel(
            {
              x: targetVelocity.current.x,
              y: 0,
            },
            true,
          );
          return onlyHorizontal;
        }

        // Try vertical only
        const onlyVertical: Vector2 = {
          x: cp.x,
          y: newPos.y,
        };
        if (!checkCollision(onlyVertical)) {
          updateVel(
            {
              x: 0,
              y: targetVelocity.current.y,
            },
            true,
          );
          return onlyVertical;
        }
        updateVel(ZERO_VEC, true);

        return cp;
      });

      if (calcMagnitude(velocity.current) < epsilon)
        velocity.current = ZERO_VEC;
    });

    useImperativeHandle(
      ref,
      () => ({
        gameCanvasRef: gameCanvasRef.current,
        cellScale,
      }),
      [gameCanvasRef.current, cellScale, maze],
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
        finishCell={finishCell}
        cellScale={cellScale}
        playerPos={playerPos}
        otherPlayers={otherPlayers}
      />
    );
  },
);

export default GameInstance;
