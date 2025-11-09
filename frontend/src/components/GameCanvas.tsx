import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { Maze } from "@shared/types/Maze";
import { GridPos } from "@shared/types/GridPos";
import { CellType } from "@shared/types/Grid";

export interface Vector2 {
  x: number;
  y: number;
}

export function calcMagnitude(vec: Vector2): number {
  return Math.sqrt(vec.x ** 2 + vec.y ** 2);
}

export const ZERO_VEC: Vector2 = { x: 0, y: 0 };

export function calcNormalized(vec: Vector2): Vector2 {
  const mag = calcMagnitude(vec);
  return mag == 0
    ? ZERO_VEC
    : {
        x: vec.x / mag,
        y: vec.y / mag,
      };
}

export function scaleVec(vec: Vector2, scale: number): Vector2 {
  return {
    x: vec.x * scale,
    y: vec.y * scale,
  };
}

export interface GameCanvasHandle {
  gridToCanvas: (gridPos: GridPos) => Vector2;
  canvasToGrid: (canvasPos: Vector2) => GridPos;
  isMovableCell: (canvasPos: Vector2) => boolean;
}

const GameCanvas = forwardRef<
  GameCanvasHandle,
  {
    maze: Maze;
    cellScale: number;
    playerPos: Vector2;
    playerColor?: string;
  }
>(({ maze, cellScale, playerPos, playerColor = "purple" }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const canvasWidth: number = cellScale * (maze.width + 1);
  const canvasHeight: number = cellScale * (maze.height + 1);

  function gridToCanvas(gridPos: GridPos): Vector2 {
    return {
      x: gridPos.col * cellScale,
      y: gridPos.row * cellScale,
    };
  }

  function canvasToGrid(canvasPos: Vector2): GridPos {
    return {
      row: Math.floor(canvasPos.y / cellScale),
      col: Math.floor(canvasPos.x / cellScale),
    };
  }

  function canvasToVisualGrid(canvasPos: Vector2): GridPos {
    return {
      row: Math.round(Math.floor(canvasPos.y / cellScale) / 2) * 2,
      col: Math.round(Math.floor(canvasPos.x / cellScale) / 2) * 2,
    };
  }

  function isMovableCell(canvasPos: Vector2): boolean {
    const gridPos = canvasToGrid(canvasPos);
    console.log(gridPos);
    return maze.inBounds(gridPos) && maze.getCell(gridPos) !== CellType.Wall;
  }

  useImperativeHandle(ref, () => ({
    gridToCanvas,
    canvasToGrid,
    isMovableCell,
  }));

  const fillCell = (
    ctx: CanvasRenderingContext2D,
    pos: GridPos,
    style?: string,
  ): void => {
    if (style) ctx.fillStyle = style;

    // assume pos is in bounds
    const canvasPos = gridToCanvas(pos);
    ctx.fillRect(canvasPos.x, canvasPos.y, cellScale * 2, cellScale * 2);
  };

  const strokeBarrier = (
    ctx: CanvasRenderingContext2D,
    p1: GridPos,
    p2: GridPos,
  ) => {
    ctx.strokeStyle = "2px black";
  };

  const drawGrid = (ctx: CanvasRenderingContext2D): void => {
    ctx.strokeStyle = "lightgray";
    ctx.lineWidth = 2;
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
    ctx.fillStyle = "black";
    ctx.lineWidth = 4;
    ctx.beginPath();

    for (let i = 0; i < maze.height; i += 2) {
      for (let j = 0; j < maze.width; j += 2) {
        const rightBar = { row: i, col: j + 1 };
        const downBar = { row: i + 1, col: j };

        // vertical wall (up-down)
        if (maze.getCell(rightBar) === CellType.Wall) {
          const rightCanvasPos = gridToCanvas({ row: i, col: j + 2 });
          ctx.moveTo(rightCanvasPos.x, rightCanvasPos.y - 1);
          ctx.lineTo(rightCanvasPos.x, rightCanvasPos.y + cellScale * 2 + 1);
        }

        // horizontal wall (left-right)
        if (maze.inBounds(downBar) && maze.getCell(downBar) === CellType.Wall) {
          const downCanvasPos = gridToCanvas({ row: i + 2, col: j });
          ctx.moveTo(downCanvasPos.x - 1, downCanvasPos.y);
          ctx.lineTo(downCanvasPos.x + cellScale * 2 + 1, downCanvasPos.y);
        }
      }
    }

    ctx.stroke();

    // fill "junctions"
    for (let i = 1; i < maze.height; i += 2) {
      for (let j = 1; j < maze.width; j += 2) {}
    }
  };

  const drawGame = (ctx: CanvasRenderingContext2D): void => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = "rgb(245,245,245)";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // -- highlight player square
    const position = {
      x: playerPos.x - cellScale / 2,
      y: playerPos.y - cellScale / 2,
    };
    const playerCellPos = gridToCanvas(canvasToVisualGrid(position));
    ctx.fillStyle = "rgba(242,251,2,0.6)";
    ctx.fillRect(
      playerCellPos.x,
      playerCellPos.y,
      cellScale * 2,
      cellScale * 2,
    );

    drawGrid(ctx);

    // const position = gridToCanvas(playerPos);
    ctx.strokeStyle = "black";
    ctx.fillStyle = playerColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(
      position.x + cellScale,
      position.y + cellScale,
      cellScale * 0.5,
      0,
      2 * Math.PI,
    );
    ctx.fill();
    ctx.stroke();
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
    <div className="flex place-content-center">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="border-4 border-solid border-black block rounded-xl"
      ></canvas>
    </div>
  );
});

export default GameCanvas;
