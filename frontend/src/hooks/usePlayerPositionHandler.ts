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

  // function updatePosition() {
  //   const moveDirections = generateMoveDirs();
  //   const deltaPos = getDeltaPos(moveDirections);
  //   const currFrame = frameNumber.current;
  //
  //   // if (startMoveFrame.current < 0) startMoveFrame.current = currFrame;
  //   // if ((currFrame - startMoveFrame.current) % moveCooldown == 0) {
  //   //   movePlayer(deltaPos);
  //   // }
  //   // const cooldownDoneY: boolean =
  //   //   (currFrame - lastVerticalMove.current.time) % singleDirMoveCooldown == 0;
  //   // const dirY =
  //   //   deltaPos.row > 0 ? MovementDirection.Down : MovementDirection.Up;
  //   // if (
  //   //   deltaPos.row != 0 &&
  //   //   (cooldownDoneY || dirY != lastVerticalMove.current.dir)
  //   // ) {
  //   //   lastVerticalMove.current.time = currFrame;
  //   //   lastVerticalMove.current.dir = dirY;
  //   // } else deltaPos.row = 0;
  //   //
  //   // const cooldownDoneX =
  //   //   (currFrame - lastHorizontalMove.current.time) % singleDirMoveCooldown ==
  //   //   0;
  //   // const dirX =
  //   //   deltaPos.col > 0 ? MovementDirection.Right : MovementDirection.Left;
  //   // if (
  //   //   deltaPos.col != 0 &&
  //   //   (cooldownDoneX || dirX != lastHorizontalMove.current.dir)
  //   // ) {
  //   //   lastHorizontalMove.current.time = currFrame;
  //   //   lastHorizontalMove.current.dir = dirX;
  //   // } else deltaPos.col = 0;
  //
  //   // movePlayer(deltaPos);
  // }

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

    // const md = getMovementDirection(e.code);
    // if (md !== undefined) {
    //   // const nowTime = Date.now();
    //   keysPressed.current.add(e.code);
    //   // if (md === MovementDirection.Up || md === MovementDirection.Down) {
    //   //   lastVerticalMove.current.time = Date.now();
    //   // } else lastHorizontalMove.current.time = Date.now();
    // }
    // updatePosition();
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
