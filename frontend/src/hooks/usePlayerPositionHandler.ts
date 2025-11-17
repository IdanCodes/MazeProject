import { useEffect, useState } from "react";
import { Vector2 } from "../interfaces/Vector2";

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
const usePlayerPositionHandler = (
  movePlayer: (deltaPos: Vector2) => void,
): void => {
  // Saves whether a key for a direction is pressed
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());

  function generateMoveDirs() {
    const moveDirections: Set<MovementDirection> = new Set();
    for (const keyCode of keysPressed) {
      const md = getMovementDirection(keyCode)!;
      moveDirections.add(md);
    }

    return moveDirections;
  }

  function getDeltaPos(moveDirections: Set<MovementDirection>): Vector2 {
    let deltaY = 0;
    if (moveDirections.has(MovementDirection.Up)) deltaY -= 1;
    if (moveDirections.has(MovementDirection.Down)) deltaY += 1;

    let deltaX = 0;
    if (moveDirections.has(MovementDirection.Right)) deltaX += 1;
    if (moveDirections.has(MovementDirection.Left)) deltaX -= 1;

    return { x: deltaX, y: deltaY };
  }

  useEffect(() => {
    movePlayer(getDeltaPos(generateMoveDirs()));
  }, [keysPressed]);

  window.onkeydown = (e) => {
    if (e.repeat || !isMovementKey(e.code)) return;
    setKeysPressed((oldKeys) => {
      const newKeys: Set<string> = new Set(oldKeys);
      newKeys.add(e.code);
      return newKeys;
    });
  };

  window.onkeyup = (e) => {
    if (e.repeat || !isMovementKey(e.code)) return;
    setKeysPressed((oldKeys) => {
      const newKeys: Set<string> = new Set(oldKeys);
      newKeys.delete(e.code);
      return newKeys;
    });
  };
};

export default usePlayerPositionHandler;
