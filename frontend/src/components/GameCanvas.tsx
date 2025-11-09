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

  const matrix = maze.getMatrix();
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

  const drawMaze = (ctx: CanvasRenderingContext2D): void => {
    for (let i = 0; i < maze.height; i += 2) {
      for (let j = 0; j < maze.width; j += 2) {
        const pos = { row: i, col: j };
        // fillCell(ctx, pos, cellColor(maze.getCell(pos)));

        // check horizontal barrier
        // const rightBridgePos: GridPos = { row: i, col: j + 1 };
        // if (maze.getCell(rightBridgePos) === CellType.Wall) {
        //   ctx.fillStyle = "black";
        //   const startPos = getCanvasPos(pos);
        //   ctx.fillRect(
        //     startPos.x + (3 * cellScale) / 5,
        //     startPos.y,
        //     startPos.x + (5 * cellScale) / 4,
        //     startPos.y + cellScale * 2,
        //   );
        // }
      }
    }

    for (let i = 0; i < maze.height; i += 2) {
      for (let j = 0; j < maze.width; j += 2) {
        const pos = { row: i, col: j };
        const rightBar = { row: i, col: j + 1 };
        const downBar = { row: i + 1, col: j };

        // vertical wall (up-down)
        if (maze.getCell(rightBar) === CellType.Wall) {
          const rightCanvasPos = getCanvasPos({ row: i, col: j + 2 });
          ctx.fillStyle = "black";
          ctx.fillRect(
            rightCanvasPos.x - cellScale / 4,
            rightCanvasPos.y,
            cellScale / 2,
            cellScale * 2,
          );
        }

        // horizontal wall (left-right)
        if (maze.inBounds(downBar) && maze.getCell(downBar) === CellType.Wall) {
          const rightCanvasPos = getCanvasPos({ row: i + 2, col: j });
          ctx.fillStyle = "black";
          ctx.fillRect(
            rightCanvasPos.x,
            rightCanvasPos.y - cellScale / 4,
            cellScale * 2,
            cellScale / 2,
          );
        }
      }
    }
  };

  const drawGame = (ctx: CanvasRenderingContext2D): void => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // fillCell(ctx, playerPos, playerColor);
    const position = getCanvasPos(playerPos);
    ctx.strokeStyle = "black";
    ctx.fillStyle = playerColor;
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
        className="border-2 border-solid border-black block"
      ></canvas>
    </div>
  );
}

export default GameCanvas;
