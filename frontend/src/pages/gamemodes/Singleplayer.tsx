import React, { JSX, useEffect, useRef, useState } from "react";
import PageTitle from "@src/components/PageTitle";
import { MazeSize } from "@src/types/maze-size";
import GameInstance from "@src/components/GameInstance";
import { ButtonSize } from "@src/components/buttons/ButtonSize";
import { RoutePath } from "@src/constants/route-path";
import PrimaryButton from "@src/components/buttons/PrimaryButton";
import { useNavigate } from "react-router-dom";
import { generateMaze, Maze } from "@src/types/Maze";
import GameOptionsSelector, {
  GameOptions,
} from "@src/components/GameOptionsSelector";

export default function Singleplayer(): JSX.Element {
  const [gameOptions, setGameOptions] = useState<GameOptions>({
    mazeScale: 15,
    mazeSize: MazeSize.Medium,
  });
  const [maze, setMaze] = useState<Maze>(generateMaze(gameOptions.mazeScale));
  const navigate = useNavigate();

  function handleClickGenerate() {
    setMaze(generateMaze(gameOptions.mazeScale));
  }

  return (
    <>
      <PageTitle text="Singleplayer" />
      <br />
      <div className="w-full place-items-center">
        <GameInstance
          gameOptions={gameOptions}
          maze={maze}
          otherPlayers={new Map()}
        />
        <div>
          <GameOptionsSelector
            gameOptionsState={[gameOptions, setGameOptions]}
          />
          <PrimaryButton text="Generate" onClick={handleClickGenerate} />
        </div>
        <div className="mx-auto w-fit">
          <PrimaryButton
            text="Home"
            buttonSize={ButtonSize.Large}
            onClick={() => navigate(RoutePath.Home)}
          />
        </div>
      </div>
    </>
  );
}
