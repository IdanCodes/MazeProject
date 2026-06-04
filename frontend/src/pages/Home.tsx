import PageTitle from "../components/PageTitle";
import PrimaryButton from "../components/buttons/PrimaryButton";
import { RoutePath } from "@src/constants/route-path";
import { RedirectButton } from "@src/components/buttons/RedirectButton";

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
          className="text-4xl py-3"
          path={RoutePath.GameModes.Singleplayer}
        >
          Singleplayer
        </RedirectButton>
        <RedirectButton
          className="text-4xl py-3"
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
      <div className="flex flex-col justify-center w-3/10 py-10 mx-auto gap-4">
        <RedirectButton
          className="text-4xl py-5 px-3"
          path={RoutePath.Authentication.Login}
        >
          Login
        </RedirectButton>
        <RedirectButton
          className="text-4xl py-5 px-3"
          path={RoutePath.Authentication.Signup}
        >
          Sign Up
        </RedirectButton>
      </div>
    </>
  );
}

// export default Home;
