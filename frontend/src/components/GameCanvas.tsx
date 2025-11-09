import React, { useEffect, useRef } from "react";
import { Maze } from "@shared/types/Maze";
import { GridPos } from "@shared/types/GridPos";
import { CellType } from "@shared/types/Grid";

interface CanvasPos {
  x: number;
  y: number;
}

const cellColor = (type: CellType): string =>
  type === CellType.Passage ? "white" : "black";

function GameCanvas({
  maze,
  cellScale,
  playerPos,
  playerColor = "purple",
}: {
  maze: Maze;
  cellScale: number;
  playerPos: GridPos;
  playerColor?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const canvasWidth: number = cellScale * (maze.width + 1);
  const canvasHeight: number = cellScale * (maze.height + 1);

  function getCanvasPos(gridPos: GridPos): CanvasPos {
    return {
      x: gridPos.col * cellScale,
      y: gridPos.row * cellScale,
    };
  }

  const fillCell = (
    ctx: CanvasRenderingContext2D,
    pos: GridPos,
    style?: string,
  ): void => {
    if (style) ctx.fillStyle = style;

    // assume pos is in bounds
    const canvasPos = getCanvasPos(pos);
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
    ctx.lineWidth = 1;
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
          const rightCanvasPos = getCanvasPos({ row: i, col: j + 2 });
          ctx.moveTo(rightCanvasPos.x, rightCanvasPos.y - 1);
          ctx.lineTo(rightCanvasPos.x, rightCanvasPos.y + cellScale * 2 + 1);
        }

        // horizontal wall (left-right)
        if (maze.inBounds(downBar) && maze.getCell(downBar) === CellType.Wall) {
          const downCanvasPos = getCanvasPos({ row: i + 2, col: j });
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

    drawGrid(ctx);

    const position = getCanvasPos(playerPos);
    ctx.strokeStyle = "black";
    ctx.fillStyle = playerColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(
      position.x + cellScale,
      position.y + cellScale,
      cellScale * 0.6,
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
}

export default GameCanvas;
