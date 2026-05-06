import React, { useEffect, useRef } from "react";
import PageTitle from "../components/PageTitle";
import PrimaryButton from "../components/buttons/PrimaryButton";
import { ButtonSize } from "../components/buttons/ButtonSize";
import Singleplayer from "@src/pages/gamemodes/Singleplayer";
import { useNavigate } from "react-router-dom";
import { RoutePath } from "@src/constants/route-path";

export const WS_PORT_PARAM = "wsPort";
export const WS_TOKEN_PARAM = "wsToken";
function Home() {
  const navigate = useNavigate();
  // const wsServerUrl = useRef<string>("");

  // useEffect(() => {
  //   const params = new URLSearchParams(window.location.search);
  //   const port = Number(
  //     params.get(WS_PORT_PARAM) ?? localStorage.getItem(WS_PORT_PARAM),
  //   );
  //   const token =
  //     params.get(WS_TOKEN_PARAM) ?? localStorage.getItem(WS_TOKEN_PARAM);

  //   if (!port || !token) {
  //     console.error("No token or port provided for WebSocket connection");
  //     alert("No token or port provided for WebSocket connection");
  //     return;
  //   }

  //   localStorage.setItem(WS_PORT_PARAM, port.toString());
  //   localStorage.setItem(WS_TOKEN_PARAM, token);
  // }, []);

  // useEffect(() => {
  //   const port = localStorage.getItem(WS_PORT_PARAM);
  //   const token = localStorage.getItem(WS_TOKEN_PARAM);
  //   wsServerUrl.current = `ws://127.0.0.1:${port}?token=${token}`;
  // }, []);

  return (
    <>
      <PageTitle text="Maze Game" />
      <div className="flex flex-col justify-center w-3/10 py-20 mx-auto gap-3">
        <PrimaryButton
          className="text-4xl"
          onClick={() => navigate(RoutePath.GameModes.Singleplayer)}
        >
          Singleplayer
        </PrimaryButton>
        <PrimaryButton
          className="text-4xl"
          text="Multiplayer"
          onClick={() => navigate(RoutePath.GameModes.Multiplayer)}
        >
          Multiplayer
        </PrimaryButton>
      </div>
    </>
  );
}

export default Home;
