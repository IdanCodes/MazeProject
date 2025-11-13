import React from "react";
import PageTitle from "../components/PageTitle";
import PrimaryButton from "../components/buttons/PrimaryButton";
import { ButtonSize } from "../components/buttons/ButtonSize";
import Singleplayer from "@src/pages/gamemodes/Singleplayer";
import { useNavigate } from "react-router-dom";
import { RoutePath } from "@src/constants/route-path";

function Home() {
  const navigate = useNavigate();

  return (
    <>
      <PageTitle text="Maze Game" />
      <div className="flex flex-col justify-center w-3/10 py-20 mx-auto gap-3">
        <PrimaryButton
          text="Singleplayer"
          buttonSize={ButtonSize.Large}
          onClick={() => navigate(RoutePath.GameModes.Singleplayer)}
        />
        <PrimaryButton
          text="Multiplayer"
          buttonSize={ButtonSize.Large}
          onClick={() => navigate(RoutePath.GameModes.Multiplayer)}
        />
      </div>
    </>
  );
}

export default Home;
