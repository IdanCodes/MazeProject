import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Maze } from "../types/Maze";
import { CellType } from "../types/Grid";
import { Vector2 } from "../interfaces/Vector2";

const bgColor = "rgb(245, 245, 245)";
export const PLAYER_RADIUS = 0.25; // in grid cells

export interface GameCanvasHandle {
  dimensions: { width: number; height: number };
  gridToCanvas: (gridPos: Vector2) => Vector2;
  canvasToGrid: (canvasPos: Vector2) => Vector2;
  checkCircleCollision: (
    pos: Vector2,
    radius: number,
    cellType?: CellType,
  ) => boolean;
}

const GameCanvas = forwardRef<
  GameCanvasHandle,
  {
    maze: Maze;
    cellScale: number;
    playerPos: Vector2;
    otherPlayers: Map<string, Vector2>;
    playerColor?: string;
  }
>(
  (
    {
      maze,
      cellScale,
      otherPlayers,
      playerPos,
      playerColor = "rgb(120,0,255)",
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const wallWidth = useMemo(() => 0.27 * cellScale, [cellScale]);

    const canvasWidth: number = cellScale * (maze.width + 1);
    const canvasHeight: number = cellScale * (maze.height + 1);
    const dimensions = useMemo(
      () => ({
        width: canvasWidth,
        height: canvasHeight,
      }),
      [canvasWidth, canvasHeight],
    );

    function gridToCanvas(gridPos: Vector2): Vector2 {
      return {
        x: gridPos.x * cellScale,
        y: gridPos.y * cellScale,
      };
    }

    function canvasToGrid(canvasPos: Vector2): Vector2 {
      return {
        x: Math.floor(canvasPos.x / cellScale),
        y: Math.floor(canvasPos.y / cellScale),
      };
    }

    // canvas position to a grid location on the visible maze (only on the passage cells)
    function canvasToVisualGrid(canvasPos: Vector2): Vector2 {
      return {
        x: Math.round(Math.floor(canvasPos.x / cellScale) / 2) * 2,
        y: Math.round(Math.floor(canvasPos.y / cellScale) / 2) * 2,
      };
    }

    // check if a circle at pos with radius collides with another CellType in the maze or the boundary.
    // defaults to checking for walls.
    function checkCircleCollision(
      pos: Vector2,
      radius: number,
      cellType: CellType = CellType.Wall,
    ): boolean {
      // Check multiple points around the circle's perimeter
      const checkPoints = [
        { x: 0, y: -radius }, // top
        { x: radius, y: 0 }, // right
        { x: 0, y: radius }, // bottom
        { x: -radius, y: 0 }, // left
        { x: radius * 0.7, y: -radius * 0.7 }, // diagonals
        { x: radius * 0.7, y: radius * 0.7 },
        { x: -radius * 0.7, y: radius * 0.7 },
        { x: -radius * 0.7, y: -radius * 0.7 },
      ];

      for (const offset of checkPoints) {
        const checkPos = {
          x: pos.x + (offset.x * dimensions.width) / (maze.width * 2),
          y: pos.y + (offset.y * dimensions.height) / (maze.height * 2),
        };

        const gridPos = canvasToGrid(checkPos);

        // Check bounds or other collisions
        if (!maze.inBounds(gridPos) || maze.getCell(gridPos) === cellType)
          return true;
      }

      return false;
    }

    // export functions
    useImperativeHandle(
      ref,
      () => ({
        dimensions,
        gridToCanvas,
        canvasToGrid,
        checkCircleCollision,
      }),
      [canvasWidth, canvasHeight],
    );

    const drawGrid = (ctx: CanvasRenderingContext2D): void => {
      ctx.strokeStyle = "lightgray";
      ctx.lineWidth = wallWidth / 2;
      ctx.beginPath();

      for (let lineY = 0; lineY <= canvasHeight; lineY += 2 * cellScale) {
        ctx.moveTo(0, lineY);
        ctx.lineTo(canvasWidth, lineY);
      }

      for (let lineX = 0; lineX <= canvasWidth; lineX += 2 * cellScale) {
        ctx.moveTo(lineX, 0);
        ctx.lineTo(lineX, canvasHeight);
      }

      ctx.stroke();
    };

    const drawMaze = (ctx: CanvasRenderingContext2D): void => {
      ctx.strokeStyle = "black";
      ctx.lineWidth = wallWidth;
      ctx.beginPath();

      for (let i = 0; i < maze.height; i += 2) {
        for (let j = 0; j < maze.width; j += 2) {
          // vertical wall (up-down)
          const rightBar: Vector2 = { x: j + 1, y: i };
          if (maze.getCell(rightBar) === CellType.Wall) {
            const rightCanvasPos = gridToCanvas({ x: j + 2, y: i });
            ctx.moveTo(rightCanvasPos.x, rightCanvasPos.y - wallWidth / 3);
            ctx.lineTo(
              rightCanvasPos.x,
              rightCanvasPos.y + cellScale * 2 + wallWidth / 3,
            );
          }

          // horizontal wall (left-right)
          const downBar: Vector2 = { x: j, y: i + 1 };
          if (
            maze.inBounds(downBar) &&
            maze.getCell(downBar) === CellType.Wall
          ) {
            const downCanvasPos = gridToCanvas({ x: j, y: i + 2 });
            ctx.moveTo(downCanvasPos.x - wallWidth / 3, downCanvasPos.y);
            ctx.lineTo(
              downCanvasPos.x + cellScale * 2 + wallWidth / 3,
              downCanvasPos.y,
            );
          }
        }
      }

      ctx.stroke();
    };

    const highlightCell = (
      ctx: CanvasRenderingContext2D,
      cellPos: Vector2,
      highlightColor: string = "rgba(242,251,2,0.6)",
    ) => {
      ctx.fillStyle = highlightColor;
      ctx.fillRect(cellPos.x, cellPos.y, cellScale * 2, cellScale * 2);
    };

    // apply the offset from the canvas position to the position on the grid for drawing a circle
    const applyCanvasCircleOffset = (pos: Vector2): Vector2 => ({
      x: pos.x - cellScale / 2,
      y: pos.y - cellScale / 2,
    });

    const drawPlayer = (
      ctx: CanvasRenderingContext2D,
      pos: Vector2,
      color: string,
    ): void => {
      const position: Vector2 = {
        x: pos.x - cellScale / 2,
        y: pos.y - cellScale / 2,
      };

      ctx.strokeStyle = "black";
      ctx.lineWidth = 1.5;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(
        position.x + cellScale,
        position.y + cellScale,
        cellScale * PLAYER_RADIUS * 2,
        0,
        2 * Math.PI,
      );
      ctx.fill();
      ctx.stroke();
    };

    const drawGame = (ctx: CanvasRenderingContext2D): void => {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // -- background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      drawGrid(ctx);
      drawMaze(ctx);

      // -- highlight player cell
      const playerCell = gridToCanvas(
        canvasToVisualGrid(applyCanvasCircleOffset(playerPos)),
      );
      highlightCell(ctx, playerCell, "rgba(242,251,2,0.6)");

      for (const [otherAddr, otherPos] of otherPlayers)
        drawPlayer(ctx, otherPos, "green");

      drawPlayer(ctx, playerPos, playerColor);

      drawMaze(ctx);
    };

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      drawGame(ctx);
    }, [maze, cellScale, playerPos]);

    return (
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="border-4 border-solid border-black block rounded-xl size-fit"
      />
    );
  },
);

export default GameCanvas;
