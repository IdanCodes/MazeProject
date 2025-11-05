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
  const canvasWidth: number = cellScale * maze.width;
  const canvasHeight: number = cellScale * maze.height;

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
    ctx.fillRect(canvasPos.x, canvasPos.y, cellScale, cellScale);
  };

  const strokeBarrier = (
    ctx: CanvasRenderingContext2D,
    p1: GridPos,
    p2: GridPos,
  ) => {
    ctx.strokeStyle = "2px black";
  };

  const drawMaze = (ctx: CanvasRenderingContext2D): void => {
    for (let i = 0; i < maze.height; i += 1) {
      for (let j = 0; j < maze.width; j += 1) {
        const pos = { row: i, col: j };
        fillCell(ctx, pos, cellColor(maze.getCell(pos)));

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
  };

  const drawGame = (ctx: CanvasRenderingContext2D): void => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    drawMaze(ctx);
    fillCell(ctx, playerPos, playerColor);
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
