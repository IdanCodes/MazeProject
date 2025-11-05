import React, { useRef } from "react";
import useAnimationUpdate from "./useAnimationUpdate";
import { clamp } from "@shared/utils/common-helpers";
import { GridPos } from "@shared/types/GridPos";

enum MovementDirection {
  Up,
  Right,
  Down,
  Left,
}

const MovementKeys: Readonly<Map<MovementDirection, string[]>> = new Map([
  [MovementDirection.Up, ["ArrowUp", "KeyW"]],
  [MovementDirection.Right, ["ArrowRight", "KeyD"]],
  [MovementDirection.Down, ["ArrowDown", "KeyS"]],
  [MovementDirection.Left, ["ArrowLeft", "KeyA"]],
]);

// get the movement direction of a key
function getMovementDirection(code: string): MovementDirection | undefined {
  const md = MovementKeys.entries().find((mk) => mk[1].includes(code));
  return md ? md[0] : undefined;
}

// check whether a keyCode is a movement key
function isMovementKey(code: string): boolean {
  return getMovementDirection(code) !== undefined;
}

// mazeScale is the number of cells in a row/column
const usePlayerHandler = (
  setPlayerPos: (newPos: React.SetStateAction<GridPos | undefined>) => void,
  mazeScale: number,
): void => {
  // Saves whether a key for a direction is pressed
  const keysPressed = useRef<Set<string>>(new Set());

  function generateMoveDirs() {
    const moveDirections: Set<MovementDirection> = new Set();
    for (const keyCode of keysPressed.current) {
      const md = getMovementDirection(keyCode)!;
      moveDirections.add(md);
    }

    return moveDirections;
  }

  function updatePlayerPosition() {
    const moveDirections = generateMoveDirs();

    setPlayerPos((oldPos: GridPos | undefined) => {
      if (!oldPos) return { row: 0, col: 0 };

      let newRow = oldPos.row;
      if (moveDirections.has(MovementDirection.Up)) newRow -= 1;
      if (moveDirections.has(MovementDirection.Down)) newRow += 1;

      let newCol = oldPos.col;
      if (moveDirections.has(MovementDirection.Right)) newCol += 1;
      if (moveDirections.has(MovementDirection.Left)) newCol -= 1;

      return {
        row: clamp(newRow, 0, mazeScale),
        col: clamp(newCol, 0, mazeScale),
      };
    });
  }

  useAnimationUpdate(6, updatePlayerPosition);

  window.onkeydown = (e) => {
    if (isMovementKey(e.code) && !e.repeat) keysPressed.current.add(e.code);
  };

  window.onkeyup = (e) => {
    if (isMovementKey(e.code)) keysPressed.current.delete(e.code);
  };
};

export default usePlayerHandler;
