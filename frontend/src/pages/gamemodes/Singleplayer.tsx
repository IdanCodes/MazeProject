import React, { JSX, useEffect, useRef, useState } from "react";
import PageTitle from "@src/components/PageTitle";
import { MazeSize } from "@src/types/maze-size";
import GameInstance from "@src/components/GameInstance";
import { ButtonSize } from "@src/components/buttons/ButtonSize";
import { RoutePath } from "@src/constants/route-path";
import PrimaryButton from "@src/components/buttons/PrimaryButton";
import { useNavigate } from "react-router-dom";
import { generateMaze, Maze } from "@src/types/Maze";

export default function Singleplayer(): JSX.Element {
  // const [maze, setMaze] = useState<Maze>(generateMaze(gameOptions.mazeScale));
  // const navigate = useNavigate();
  // function handleClickGenerate() {
  //   setMaze(generateMaze(gameOptions.mazeScale));
  // }
  // return (
  //   <>
  //     <PageTitle text="Singleplayer" />
  //     <br />
  //     <div className="w-full place-items-center">
  //       <GameInstance
  //         gameOptions={gameOptions}
  //         maze={maze}
  //         otherPlayers={new Map()}
  //       />
  //       <div>
  //         <GameOptionsSelector
  //           gameOptionsState={[gameOptions, setGameOptions]}
  //         />
  //         <PrimaryButton className="text-3xl" onClick={handleClickGenerate}>
  //           Generate
  //         </PrimaryButton>
  //       </div>
  //       <div className="mx-auto w-fit">
  //         <PrimaryButton
  //           className="text-4xl"
  //           onClick={() => navigate(RoutePath.Home)}
  //         >
  //           Home
  //         </PrimaryButton>
  //       </div>
  //     </div>
  //   </>
  // );
  return (
    <h1 className="text-center text-3xl">
      Singleplayer mode is under construction...
    </h1>
  );
}
