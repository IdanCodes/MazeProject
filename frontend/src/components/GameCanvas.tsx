import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { Maze } from "@shared/types/Maze";
import { CellType } from "@shared/types/Grid";
import { Vector2 } from "@shared/interfaces/Vector2";

export interface GameCanvasHandle {
  gridToCanvas: (gridPos: Vector2) => Vector2;
  canvasToGrid: (canvasPos: Vector2) => Vector2;
}

const GameCanvas = forwardRef<
  GameCanvasHandle,
  {
    maze: Maze;
    cellScale: number;
    playerPos: Vector2;
    playerColor?: string;
  }
>(({ maze, cellScale, playerPos, playerColor = "rgb(120,0,255)" }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const canvasWidth: number = cellScale * (maze.width + 1);
  const canvasHeight: number = cellScale * (maze.height + 1);

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

  function canvasToVisualGrid(canvasPos: Vector2): Vector2 {
    return {
      x: Math.round(Math.floor(canvasPos.x / cellScale) / 2) * 2,
      y: Math.round(Math.floor(canvasPos.y / cellScale) / 2) * 2,
    };
  }

  // export functions
  useImperativeHandle(ref, () => ({
    gridToCanvas,
    canvasToGrid,
  }));

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
        // vertical wall (up-down)
        const rightBar: Vector2 = { x: j + 1, y: i };
        if (maze.getCell(rightBar) === CellType.Wall) {
          const rightCanvasPos = gridToCanvas({ x: j + 2, y: i });
          ctx.moveTo(rightCanvasPos.x, rightCanvasPos.y - 1);
          ctx.lineTo(rightCanvasPos.x, rightCanvasPos.y + cellScale * 2 + 1);
        }

        // horizontal wall (left-right)
        const downBar: Vector2 = { x: j, y: i + 1 };
        if (maze.inBounds(downBar) && maze.getCell(downBar) === CellType.Wall) {
          const downCanvasPos = gridToCanvas({ x: j, y: i + 2 });
          ctx.moveTo(downCanvasPos.x - 1, downCanvasPos.y);
          ctx.lineTo(downCanvasPos.x + cellScale * 2 + 1, downCanvasPos.y);
        }
      }
    }

    ctx.stroke();
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D): void => {
    const position = {
      x: playerPos.x - cellScale / 2,
      y: playerPos.y - cellScale / 2,
    };

    // -- highlight player cell
    const playerCellPos = gridToCanvas(canvasToVisualGrid(position));
    ctx.fillStyle = "rgba(242,251,2,0.6)";
    ctx.fillRect(
      playerCellPos.x,
      playerCellPos.y,
      cellScale * 2,
      cellScale * 2,
    );

    ctx.strokeStyle = "black";
    ctx.lineWidth = 1.5;
    ctx.fillStyle = playerColor;
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

  const drawGame = (ctx: CanvasRenderingContext2D): void => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // -- background
    ctx.fillStyle = "rgb(245,245,245)";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    drawGrid(ctx);
    drawMaze(ctx);
    drawPlayer(ctx);
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
