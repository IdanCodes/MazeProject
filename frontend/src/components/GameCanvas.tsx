import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Maze } from "../types/Maze";
import { CellType } from "../types/Grid";
import { calcNormalized, Vector2 } from "../interfaces/Vector2";
import { PlayerInfo } from "@src/interfaces/PlayerInfo";
import useAnimationUpdate from "@src/hooks/useAnimationUpdate";

const bgColor = "rgb(245, 245, 245)";
export const PLAYER_RADIUS = 0.25; // in grid cells
export const GAME_FPS = 60;

export interface GameCanvasHandle {
  dimensions: { width: number; height: number };
  gridToCanvas: (gridPos: Vector2) => Vector2;
  canvasToGrid: (canvasPos: Vector2) => Vector2;
  canvasToVisualGrid: (gridPos: Vector2) => Vector2;
  checkCircleCollision: (
    pos: Vector2,
    radius: number,
    cellType?: CellType,
  ) => boolean;
  // applyCanvasCircleOffset: (vec: Vector2) => ;
}

const GameCanvas = forwardRef<
  GameCanvasHandle,
  {
    maze: Maze;
    finishCell: Vector2;
    cellScale: number;
    playerPos: Vector2;
    otherPlayers: PlayerInfo[];
    playerColor?: string;
  }
>(
  (
    {
      maze,
      finishCell,
      cellScale,
      otherPlayers,
      playerPos,
      playerColor = "rgb(120,0,255)",
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const wallWidth = useMemo(() => 0.2 * cellScale, [cellScale]);

    const canvasWidth: number = useMemo(
      () => cellScale * (maze.width + 1),
      [cellScale, maze.width],
    );
    const canvasHeight: number = useMemo(
      () => cellScale * (maze.height + 1),
      [cellScale, maze.height],
    );
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

    const normalizePos = (pos: Vector2): Vector2 => ({
      x: pos.x / canvasWidth,
      y: pos.y / canvasHeight,
    });

    const unnormalizePos = (pos: Vector2): Vector2 => ({
      x: pos.x * canvasWidth,
      y: pos.y * canvasHeight,
    });

    function checkCircleCollision(
      pos: Vector2,
      radius: number,
      cellType: CellType = CellType.Wall,
    ): boolean {
      // To match your visual drawings, we check the lines around the player's current area
      const playerGrid = canvasToGrid(pos);

      const visualRadius = radius + wallWidth / 1.2;
      if (
        pos.x - visualRadius < 0 ||
        pos.x + visualRadius > canvasWidth ||
        pos.y - visualRadius < 0 ||
        pos.y + visualRadius > canvasHeight
      )
        return true;

      // Look at a small neighborhood of cells around the player to check for walls
      const scanRadius = 2;
      const startY = Math.max(0, Math.floor(playerGrid.y / 2) * 2 - scanRadius);
      const endY = Math.min(
        maze.height,
        Math.floor(playerGrid.y / 2) * 2 + scanRadius,
      );
      const startX = Math.max(0, Math.floor(playerGrid.x / 2) * 2 - scanRadius);
      const endX = Math.min(
        maze.width,
        Math.floor(playerGrid.x / 2) * 2 + scanRadius,
      );

      // Helper function to check if a circle collides with a line segment
      function checkCircleLineCollision(
        p: Vector2,
        r: number,
        v: Vector2,
        w: Vector2,
      ): boolean {
        const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
        if (l2 === 0) return false; // Line is a point

        // Calculate projection factor t, clamped between 0 and 1
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));

        // Find closest point on the line segment
        const closestPoint = {
          x: v.x + t * (w.x - v.x),
          y: v.y + t * (w.y - v.y),
        };

        // Distance check
        const distSq =
          (p.x - closestPoint.x) ** 2 + (p.y - closestPoint.y) ** 2;
        return distSq < r * r;
      }

      for (let i = startY; i < endY; i += 2) {
        for (let j = startX; j < endX; j += 2) {
          // 1. Check Vertical Walls (Right Bars)
          const rightBar = { x: j + 1, y: i };
          if (maze.inBounds(rightBar) && maze.getCell(rightBar) === cellType) {
            const rightCanvasPos = gridToCanvas({ x: j + 2, y: i });
            const from = rightCanvasPos;
            const to = {
              x: rightCanvasPos.x,
              y: rightCanvasPos.y + cellScale * 2,
            };

            if (checkCircleLineCollision(pos, visualRadius, from, to)) {
              return true;
            }
          }

          // 2. Check Horizontal Walls (Down Bars)
          const downBar = { x: j, y: i + 1 };
          if (maze.inBounds(downBar) && maze.getCell(downBar) === cellType) {
            const downCanvasPos = gridToCanvas({ x: j, y: i + 2 });
            const from = downCanvasPos;
            const to = {
              x: downCanvasPos.x + cellScale * 2,
              y: downCanvasPos.y,
            };

            if (checkCircleLineCollision(pos, visualRadius, from, to)) {
              return true;
            }
          }
        }
      }

      return false;
    }

    useImperativeHandle(
      ref,
      () => ({
        dimensions,
        gridToCanvas,
        canvasToGrid,
        canvasToVisualGrid,
        checkCircleCollision,
      }),
      [canvasWidth, canvasHeight, maze],
    );

    const drawGrid = (ctx: CanvasRenderingContext2D): void => {
      ctx.strokeStyle = "lightgray";
      ctx.lineWidth = wallWidth / 2.3;
      ctx.lineJoin = ctx.lineCap = "round";

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

    const drawMaze = useCallback(
      (ctx: CanvasRenderingContext2D): void => {
        ctx.strokeStyle = "black";
        ctx.lineWidth = wallWidth;

        // Set join and cap to round
        ctx.lineJoin = ctx.lineCap = "round";

        const addMazeLine = (from: Vector2, to: Vector2) => {
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
        };

        ctx.beginPath();

        // trace the maze path
        for (let i = 0; i < maze.height; i += 2) {
          for (let j = 0; j < maze.width; j += 2) {
            // vertical wall (up-down)
            const rightBar: Vector2 = { x: j + 1, y: i };
            if (
              maze.inBounds(rightBar) &&
              maze.getCell(rightBar) === CellType.Wall
            ) {
              const rightCanvasPos = gridToCanvas({ x: j + 2, y: i });
              // ctx.moveTo(rightCanvasPos.x, rightCanvasPos.y - wallWidth / 3);
              // ctx.lineTo(
              //   rightCanvasPos.x,
              //   rightCanvasPos.y + cellScale * 2 + wallWidth / 3,
              // );
              const rightBarTop = rightCanvasPos;
              const rightBarBottom = {
                x: rightCanvasPos.x,
                y: rightCanvasPos.y + cellScale * 2,
              };
              addMazeLine(rightBarTop, rightBarBottom);
            }

            // horizontal wall (left-right)
            const downBar: Vector2 = { x: j, y: i + 1 };
            if (
              maze.inBounds(downBar) &&
              maze.getCell(downBar) === CellType.Wall
            ) {
              const downCanvasPos = gridToCanvas({ x: j, y: i + 2 });
              // ctx.moveTo(downCanvasPos.x - wallWidth / 3, downCanvasPos.y);
              // ctx.lineTo(
              //   downCanvasPos.x + cellScale * 2 + wallWidth / 3,
              //   downCanvasPos.y,
              // );
              const bottomBarLeft = downCanvasPos;
              const bottomBarRight = {
                x: downCanvasPos.x + cellScale * 2,
                y: downCanvasPos.y,
              };
              addMazeLine(bottomBarLeft, bottomBarRight);
            }
          }
        }

        ctx.stroke();
      },
      [maze],
    );

    // gridCell is the cell's visual grid position
    const highlightCell = (
      ctx: CanvasRenderingContext2D,
      gridCell: Vector2,
      highlightColor: string = "rgba(242,251,2,0.6)",
    ) => {
      const canvasPos = gridToCanvas(gridCell);
      ctx.fillStyle = highlightColor;
      ctx.fillRect(canvasPos.x, canvasPos.y, cellScale * 2, cellScale * 2);
    };

    const drawFinishCell = (ctx: CanvasRenderingContext2D) => {
      if (finishCell.x < 0 || finishCell.y < 0) return;
      const canvasPos = gridToCanvas(finishCell);
      const patternSize = 6; // patternSize x patternSize squares inside the cell
      const subCellSize = (cellScale * 2) / patternSize;

      for (let row = 0; row < patternSize; row++) {
        for (let col = 0; col < patternSize; col++) {
          // Check if the sum of row + col is even or odd
          ctx.fillStyle = (row + col) % 2 === 0 ? "white" : "black";

          ctx.fillRect(
            canvasPos.x + col * subCellSize,
            canvasPos.y + row * subCellSize,
            subCellSize,
            subCellSize,
          );
        }
      }
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

      // -- grid
      // drawMaze(ctx);

      // -- highlight player cell
      const playerCell = canvasToVisualGrid(applyCanvasCircleOffset(playerPos));
      highlightCell(ctx, playerCell, "rgba(242,251,2,0.6)");

      // -- finish cell
      drawFinishCell(ctx);

      drawGrid(ctx);

      // -- draw players
      for (const playerInfo of otherPlayers)
        drawPlayer(ctx, unnormalizePos(playerInfo.position), "green");

      drawPlayer(ctx, playerPos, playerColor);

      drawMaze(ctx);
    };

    useAnimationUpdate(GAME_FPS, () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      drawGame(ctx);
    });

    return (
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="border-4 border-solid border-black block rounded-xl size-fit mx-auto w-fit"
      />
    );
  },
);

export default GameCanvas;
