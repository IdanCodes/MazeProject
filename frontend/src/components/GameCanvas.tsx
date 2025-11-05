import React, { useCallback, useRef } from "react";
import { Maze } from "@shared/types/Maze";

function GameCanvas({
  maze,
  cellScale,
  cellSpacing = 0,
}: {
  maze: Maze;
  cellScale: number;
  cellSpacing?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const matrix = maze.getMatrix();
  const canvasWidth: number = (cellScale + cellSpacing) * maze.width;
  const canvasHeight: number = (cellScale + cellSpacing) * maze.height;

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
  }, []);

  return <canvas ref={canvasRef}></canvas>;
}

export default GameCanvas;
