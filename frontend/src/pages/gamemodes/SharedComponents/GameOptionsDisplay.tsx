import PrimaryButton from "@src/components/buttons/PrimaryButton";
import { ErrorLabel } from "@src/components/ErrorLabel";
import { usePassedState } from "@src/hooks/usePassedState";
import { GameOptions, MazeDifficulty } from "@src/interfaces/GameOptions";
import { PassedState } from "@src/types/passed-state";
import clsx from "clsx";
import { useEffect, useState } from "react";

function GameOptionsDisplay({
  optionsState,
  canEditOptions,
  gameOptionsError,
}: {
  optionsState: PassedState<GameOptions>;
  canEditOptions: boolean;
  gameOptionsError: string | undefined;
}) {
  const [options, setOptions] = usePassedState<GameOptions>(optionsState);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [newOptions, setNewOptions] = useState<GameOptions>({ ...options });

  function startEdit() {
    setNewOptions({ ...options });
    setIsEditing(true);
  }
  function cancelEdit() {
    if (!isEditing) return;
    setIsEditing(false);
  }
  function saveEdit() {
    if (!isEditing) return;
    setOptions(newOptions);
    setIsEditing(false);
  }

  const onChangeOpt = (name: string, value: any) => {
    setNewOptions((oldOpts) => {
      const newOpts = { ...oldOpts };
      switch (name) {
        case "difficulty": {
          newOpts.difficulty = value;
          break;
        }
      }

      return newOpts;
    });
  };

  return (
    <div className="bg-gray-500/20 w-fit p-5 rounded-2xl">
      <p className="text-2xl text-center bold">Game Options:</p>
      <div
        className={clsx(
          "flex flex-col mx-auto gap-3 justify-between items-center my-1 transition-all px-3",
          !canEditOptions && "opacity-0.4",
        )}
      >
        {gameOptionsError && <ErrorLabel text={gameOptionsError} />}
        {/* Maze Dimensions */}
        <MazeDifficultySection
          isEditing={isEditing}
          onChangeOpt={onChangeOpt}
          options={options}
          newOptions={newOptions}
        />
        {/* Edit buttons */}
        <div className="my-3 px-5">
          {canEditOptions &&
            (isEditing ? (
              <div className="flex justify-between w-full">
                <PrimaryButton
                  className="text-2xl bg-red-500/90 hover:bg-red-500"
                  onClick={cancelEdit}
                >
                  Cancel
                </PrimaryButton>
                <PrimaryButton
                  className="text-2xl w-1/2 bg-green-500/90 hover:bg-green-500 "
                  onClick={saveEdit}
                >
                  Save
                </PrimaryButton>
              </div>
            ) : (
              <div className="w-full">
                <PrimaryButton
                  className="text-xl mx-auto bg-gray-500/90 hover:bg-gray-500"
                  onClick={startEdit}
                >
                  Edit
                </PrimaryButton>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function MazeDifficultySection({
  isEditing,
  onChangeOpt,
  options,
  newOptions,
}: {
  isEditing: boolean;
  onChangeOpt: (name: string, value: any) => void;
  options: GameOptions;
  newOptions: GameOptions;
}) {
  return isEditing ? (
    <div className="text-xl truncate">
      <span>Maze Difficulty: </span>
      <div className="flex justify-around w-4/5 my-2">
        <select
          onMouseDown={(e) => e.stopPropagation()}
          value={newOptions.difficulty}
          onChange={(t) => onChangeOpt("difficulty", t.target.value)}
          className="border-2 rounded-xl p-1"
        >
          {Object.values(MazeDifficulty).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
    </div>
  ) : (
    <div className="text-xl truncate">
      <span>Maze Difficulty: </span>
      <span className="text-blue-500/80 font-semibold">
        {options.difficulty}
      </span>
    </div>
  );
}

export default GameOptionsDisplay;
