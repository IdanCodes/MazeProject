import React, { useMemo } from "react";
import { MazeSize } from "@src/types/maze-size";
import { clamp } from "@src/utils/common-helpers";

export interface GameOptions {
  mazeSize: MazeSize;
  mazeScale: number;
}

function GameOptionsSelector({
  gameOptionsState,
}: {
  gameOptionsState: [
    GameOptions,
    (v: React.SetStateAction<GameOptions>) => void,
  ];
}) {
  const [gameOptions, setGameOptions] = useMemo(
    () => gameOptionsState,
    [gameOptionsState],
  );

  const handleMazeSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setGameOptions(
      (go): GameOptions => ({
        ...go,
        mazeSize: Number(e.target.value) as unknown as MazeSize,
      }),
    );

  const handleMazeScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();

    const newVal = Number(e.target.value);
    console.log(clamp(newVal, 1, 50));
    if (newVal)
      setGameOptions(
        (go): GameOptions => ({ ...go, mazeScale: clamp(newVal, 1, 50) }),
      );
  };

  return (
    <div className="flex size-fit justify-between">
      <input
        type="number"
        name="size"
        className="border-3 text-3xl w-1/4 text-center rounded-xl"
        value={gameOptions.mazeScale}
        onChange={handleMazeScaleChange}
      />
      <select
        name="mazeSize"
        className="border-3 rounded-xl"
        onChange={handleMazeSizeChange}
        value={gameOptions.mazeSize}
      >
        <option value={MazeSize.XS}>XS</option>
        <option value={MazeSize.Small}>Small</option>
        <option value={MazeSize.Medium}>Medium</option>
        <option value={MazeSize.Large}>Large</option>
        <option value={MazeSize.XL}>XL</option>
      </select>
    </div>
  );
}

export default GameOptionsSelector;
