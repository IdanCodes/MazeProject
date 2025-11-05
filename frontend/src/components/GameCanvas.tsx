import React, { useCallback, useRef } from "react";
import { Maze } from "../types/Maze";
import { getMazeRenderHeight, MazeSize } from "../types/maze-size";
import useAnimationUpdate from "../hooks/useAnimationUpdate";

function GameCanvas({
  maze,
  size,
  cellSpacing = 0,
}: {
  maze: Maze;
  size: MazeSize;
  cellSpacing?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const matrix = maze.getMatrix();
  const cellScale = getMazeRenderHeight(size) / maze.height;
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
