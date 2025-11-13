import React, { JSX } from "react";
import PageTitle from "@src/components/PageTitle";
import { MazeSize } from "@src/types/maze-size";
import GameInstance from "@src/components/GameInstance";
import { ButtonSize } from "@src/components/buttons/ButtonSize";
import { RoutePath } from "@src/constants/route-path";
import PrimaryButton from "@src/components/buttons/PrimaryButton";
import { useNavigate } from "react-router-dom";

export default function Singleplayer(): JSX.Element {
  const navigate = useNavigate();

  return (
    <>
      <PageTitle text="Singleplayer" />
      <br />
      <GameInstance
        displayConfig={{ mazeSize: MazeSize.Large, mazeScale: 13 }}
        otherPlayers={new Map()}
      />
      <br />
      <div className="mx-auto w-fit">
        <PrimaryButton
          text="Home"
          buttonSize={ButtonSize.Large}
          onClick={() => navigate(RoutePath.Home)}
        />
      </div>
    </>
  );
}
