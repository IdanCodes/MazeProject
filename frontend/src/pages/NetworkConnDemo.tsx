import React, { useEffect, useMemo, useRef, useState } from "react";
import { MazeSize } from "../types/maze-size";
import GameManager, { GameManagerHandle } from "../components/GameManager";
import { Vector2, ZERO_VEC } from "@shared/interfaces/Vector2";
import PrimaryButton from "../components/buttons/PrimaryButton";
import useAnimationUpdate from "../hooks/useAnimationUpdate";

function NetworkConnDemo() {
  const [mazeSize, setMazeSize] = useState({
    scale: 10,
    sizeStr: "Medium",
    mazeSize: MazeSize.Medium,
  });
  const managerRef = useRef<GameManagerHandle | null>(null);
  const [playerPos, setPlayerPos] = useState<Vector2>(ZERO_VEC);

  useEffect(() => {
    if (!managerRef.current) return;
    managerRef.current.generateMaze();
  }, []);

  return (
    <>
      <div className="w-[80%] mx-auto flex flex-row justify-center border-5 gap-10 p-5">
        <div>
          <PrimaryButton
            onClick={() => {
              if (managerRef.current) managerRef.current.generateMaze();
            }}
            text="Generate"
          />
        </div>
        <GameManager
          ref={managerRef}
          mazeSize={mazeSize.mazeSize}
          mazeScale={mazeSize.scale}
          onPlayerMove={setPlayerPos}
        />
      </div>
    </>
  );
}

export default NetworkConnDemo;

function strToSize(s: string): MazeSize {
  switch (s) {
    case "XS":
      return MazeSize.XS;
    case "Small":
      return MazeSize.Small;
    case "Medium":
      return MazeSize.Medium;
    case "Large":
      return MazeSize.Large;
    case "XL":
      return MazeSize.XL;
    default:
      return MazeSize.Medium;
  }
}
