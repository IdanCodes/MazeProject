import { JSX, useState } from "react";
import PageTitle from "@src/components/PageTitle";
import GameInstance from "@src/components/GameInstance";
import { MazeSize } from "@src/types/maze-size";
import { Vector2 } from "@src/interfaces/Vector2";
import { generateMaze } from "@src/types/Maze";

export function Multiplayer(): JSX.Element {
  const [maze, setMaze] = useState(generateMaze(13));
  const [otherPlayers, setOtherPlayers] = useState<Map<string, Vector2>>(
    new Map(),
  );
  // const [otherPlayers] = useNetworkHandler();

  return (
    <>
      <PageTitle text="Multiplayer" />
      <GameInstance
        viewOptions={{
          mazeScale: 15,
          mazeSize: MazeSize.XL,
        }}
        maze={maze}
        otherPlayers={otherPlayers}
      />
    </>
  );
}
