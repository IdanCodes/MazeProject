import React, { useCallback, useRef } from "react";
import { Maze } from "@shared/types/Maze";
import { GridPos } from "@shared/types/GridPos";

function GameCanvas({
  maze,
  cellScale,
  playerPos,
}: {
  maze: Maze;
  cellScale: number;
  playerPos: GridPos;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const matrix = maze.getMatrix();
  const canvasWidth: number = cellScale * maze.width;
  const canvasHeight: number = cellScale * maze.height;

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
  }, []);

  return (
    <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight}></canvas>
  );
}

export default GameCanvas;
