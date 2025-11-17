import { JSX, useState } from "react";
import PageTitle from "@src/components/PageTitle";
import GameInstance from "@src/components/GameInstance";
import { MazeSize } from "@src/types/maze-size";
import { Vector2 } from "@src/interfaces/Vector2";
import { generateMaze } from "@src/types/Maze";
import GameOptionsSelector, {
  GameOptions,
} from "@src/components/GameOptionsSelector";
import PrimaryButton from "@src/components/buttons/PrimaryButton";
import { useNavigate } from "react-router-dom";
import { RoutePath } from "@src/constants/route-path";

export function Multiplayer(): JSX.Element {
  const [gameOptions, setGameOptions] = useState<GameOptions>({
    mazeScale: 15,
    mazeSize: MazeSize.Medium,
  });
  const [maze, setMaze] = useState(generateMaze(13));
  const [otherPlayers, setOtherPlayers] = useState<Map<string, Vector2>>(
    new Map(),
  );
  const navigate = useNavigate();
  // const [otherPlayers] = useNetworkHandler();

  return (
    <>
      <PageTitle text="Multiplayer" />
      <br />
      <div className="mx-auto w-fit">
        <GameInstance
          gameOptions={gameOptions}
          maze={maze}
          otherPlayers={otherPlayers}
        />
        <GameOptionsSelector gameOptionsState={[gameOptions, setGameOptions]} />
        <PrimaryButton
          text="Generate"
          onClick={() => setMaze(generateMaze(gameOptions.mazeScale))}
        />
        <PrimaryButton text="Home" onClick={() => navigate(RoutePath.Home)} />
      </div>
    </>
  );
}
