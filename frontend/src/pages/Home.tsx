import React, { useEffect, useMemo, useRef } from "react";
import PageTitle from "../components/PageTitle";
import PrimaryButton from "../components/buttons/PrimaryButton";
import { ButtonSize } from "../components/buttons/ButtonSize";
import Singleplayer from "@src/pages/gamemodes/Singleplayer";
import { useNavigate } from "react-router-dom";
import { RoutePath } from "@src/constants/route-path";
import { RedirectButton } from "@src/components/buttons/RedirectButton";

export const WS_PORT_PARAM = "wsPort";
export const WS_TOKEN_PARAM = "wsToken";
// function Home({
//   username = null,
//   disconnect,
// }: {
//   username?: string | null;
//   disconnect: () => void;
// }) {
//   // const wsServerUrl = useRef<string>("");

//   // useEffect(() => {
//   //   const params = new URLSearchParams(window.location.search);
//   //   const port = Number(
//   //     params.get(WS_PORT_PARAM) ?? localStorage.getItem(WS_PORT_PARAM),
//   //   );
//   //   const token =
//   //     params.get(WS_TOKEN_PARAM) ?? localStorage.getItem(WS_TOKEN_PARAM);

//   //   if (!port || !token) {
//   //     console.error("No token or port provided for WebSocket connection");
//   //     alert("No token or port provided for WebSocket connection");
//   //     return;
//   //   }

//   //   localStorage.setItem(WS_PORT_PARAM, port.toString());
//   //   localStorage.setItem(WS_TOKEN_PARAM, token);
//   // }, []);

//   // useEffect(() => {
//   //   const port = localStorage.getItem(WS_PORT_PARAM);
//   //   const token = localStorage.getItem(WS_TOKEN_PARAM);
//   //   wsServerUrl.current = `ws://127.0.0.1:${port}?token=${token}`;
//   // }, []);
//   const isAuthenticated = useMemo(() => username != null, [username]);

//   return isAuthenticated ? (
//     <AuthenticatedHome username={username!} />
//   ) : (
//     <UnauthenticatedHome />
//   );
// }

export function AuthenticatedHome({
  username,
  disconnect,
}: {
  username: string;
  disconnect: () => void;
}) {
  return (
    <>
      <div className="mx-auto">
        <DisconnectButton />
        <div className="pb-4 pt-2">
          <PageTitle text="Maze Game" />
        </div>
      </div>
      <p className="text-2xl mt-4 text-center">{`Welcome, ${username}`}</p>
      <div className="flex flex-col justify-center w-3/10 py-7 mx-auto gap-3">
        <RedirectButton
          className="text-4xl"
          path={RoutePath.GameModes.Singleplayer}
        >
          Singleplayer
        </RedirectButton>
        <RedirectButton
          className="text-4xl"
          path={RoutePath.GameModes.Multiplayer}
        >
          Multiplayer
        </RedirectButton>
      </div>
    </>
  );

  function DisconnectButton() {
    return (
      <PrimaryButton
        className="bg-red-500 hover:bg-red-600 p-3 rounded-2xl text-xl absolute mx-3 my-2"
        onClick={disconnect}
      >
        Disconnect
      </PrimaryButton>
    );
  }
}

export function UnauthenticatedHome() {
  return (
    <>
      <PageTitle text="Maze Game" />
      <p className="text-2xl my-3 text-center">
        Authenticate To Enter The Game
      </p>
      <div className="flex flex-col justify-center w-4/10 py-10 mx-auto gap-3">
        <RedirectButton
          className="text-4xl"
          path={RoutePath.Authentication.Login}
        >
          Login
        </RedirectButton>
        <RedirectButton
          className="text-4xl"
          path={RoutePath.Authentication.Signup}
        >
          Sign Up
        </RedirectButton>
      </div>
    </>
  );
}

// export default Home;
