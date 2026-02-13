import React, { Dispatch, useMemo } from "react";
import { MazeSize } from "@src/types/maze-size";
import { clamp } from "@src/utils/common-helpers";
import { PassedState } from "@src/types/passed-state";
import { usePassedState } from "@src/hooks/usePassedState";

export interface GameOptions {
  mazeSize: MazeSize;
  mazeScale: number;
}

function GameOptionsSelector({
  gameOptionsState,
}: {
  gameOptionsState: PassedState<GameOptions>;
}) {
  const [gameOptions, setGameOptions] = useMemo(
    () => gameOptionsState,
    [gameOptionsState],
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

  const setMazeSize = (action: React.SetStateAction<MazeSize>) => {
    const newVal =
      typeof action === "function" ? action(gameOptions.mazeSize) : action;
    setGameOptions((go) => ({ ...go, mazeSize: newVal }));
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
      <MazeSizeSelector mazeSizeState={[gameOptions.mazeSize, setMazeSize]} />
    </div>
  );
}

export function MazeSizeSelector({
  mazeSizeState,
}: {
  mazeSizeState: PassedState<MazeSize>;
}) {
  const [mazeSize, setMazeSize] = usePassedState(mazeSizeState);
  const handleMazeSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setMazeSize(Number(e.target.value) as unknown as MazeSize);

  return (
    <select
      name="mazeSize"
      className="border-3 rounded-xl text-2xl padding-2 text-center bg-gray-400"
      onChange={handleMazeSizeChange}
      value={mazeSize}
    >
      <option value={MazeSize.XS}>XS</option>
      <option value={MazeSize.Small}>Small</option>
      <option value={MazeSize.Medium}>Medium</option>
      <option value={MazeSize.Large}>Large</option>
      <option value={MazeSize.XL}>XL</option>
    </select>
  );
}

export default GameOptionsSelector;
