import React, {
  Dispatch,
  forwardRef,
  JSX,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PageTitle from "@src/components/PageTitle";
import GameInstance, { GameInstanceHandle } from "@src/components/GameInstance";
import { MazeSize } from "@src/types/maze-size";
import { equalVec, Vector2, ZERO_VEC } from "@src/interfaces/Vector2";
import { generateMaze, Maze } from "@src/types/Maze";
import GameOptionsSelector, {
  GameOptions,
} from "@src/components/GameOptionsSelector";
import PrimaryButton from "@src/components/buttons/PrimaryButton";
import { useNavigate } from "react-router-dom";
import { RoutePath } from "@src/constants/route-path";
import { useNetworkHandler } from "@src/hooks/useNetworkHandler";
import { ReadyState } from "react-use-websocket";
import { usePassedState } from "@src/hooks/usePassedState";
import { PassedState, SetStateFunc } from "@src/types/passed-state";

const MultiplayerGameManager = forwardRef<
  GameInstanceHandle,
  {
    gameOptions: GameOptions;
    maze: Maze;
    otherPlayers: Map<string, Vector2>;
    playerPosState: PassedState<Vector2>;
  }
>(({ gameOptions, maze, otherPlayers, playerPosState }, ref) => {
  const [playerPos, setPlayerPos] = usePassedState(playerPosState);

  return (
    <>
      <GameInstance
        ref={ref}
        gameOptions={gameOptions}
        maze={maze}
        otherPlayers={otherPlayers}
        onPlayerMove={(newPos) => {
          if (!equalVec(newPos, playerPos)) setPlayerPos(newPos);
        }}
      />
    </>
  );
});

export function Multiplayer(): JSX.Element {
  const [playerPos, setPlayerPos] = useState<Vector2>(ZERO_VEC);
  const [playerName, setPlayerName] = useState<string>("");
  const [gameOptions, setGameOptions] = useState<GameOptions>({
    mazeScale: 15,
    mazeSize: MazeSize.Medium,
  });
  const [maze, setMaze] = useState<Maze>(generateMaze(13));
  const [errorText, setErrorText] = useState<string>("");
  const gameInstanceRef = useRef<GameInstanceHandle | null>(null);
  const navigate = useNavigate();

  const canvasDimensions = useMemo<{
    width: number;
    height: number;
  }>(() => {
    return gameInstanceRef.current && gameInstanceRef.current.gameCanvasRef
      ? {
          ...gameInstanceRef.current.gameCanvasRef.dimensions,
        }
      : { width: 1, height: 1 };
  }, [gameInstanceRef.current]);
  const {
    otherPlayers,
    sendMaze,
    readyState,
    connectToServer,
    disconnectFromServer,
  } = useNetworkHandler(playerPos, canvasDimensions, setMaze, (e) =>
    console.error(e),
  );

  const isConnected = useMemo<boolean>(() => {
    return readyState === ReadyState.OPEN;
  }, [readyState]);

  const handleGenerateMaze = useCallback(
    () => setMaze(generateMaze(gameOptions.mazeScale)),
    [gameOptions],
  );

  return (
    <>
      <PageTitle text="Multiplayer" />
      <br />
      <div className="flex w-full justify-between">
        <div className="w-full">
          <div className="mx-auto pl-10 pr-10 w-fit flex flex-col">
            <NameInput nameState={[playerName, setPlayerName]} />
            <ConnectButton
              readyState={readyState}
              nameState={[playerName, setPlayerName]}
              connectToServer={connectToServer}
              disconnectFromServer={disconnectFromServer}
              setErrorText={setErrorText}
            />
            <ErrorLabel text={errorText} />
            {isConnected && (
              <>
                <PrimaryButton
                  text="Send Maze"
                  onClick={() => sendMaze(maze)}
                />
              </>
            )}
          </div>
        </div>
        <div className="w-full">
          {isConnected && (
            <>
              <MultiplayerGameManager
                gameOptions={gameOptions}
                maze={maze}
                otherPlayers={otherPlayers}
                playerPosState={[playerPos, setPlayerPos]}
              />
              <GameOptionsSelector
                gameOptionsState={[gameOptions, setGameOptions]}
              />
              <PrimaryButton text="Generate" onClick={handleGenerateMaze} />
            </>
          )}
          <PrimaryButton text="Home" onClick={() => navigate(RoutePath.Home)} />
        </div>
        <div className="w-full"></div>
      </div>
    </>
  );
}

function ConnectButton({
  readyState,
  nameState,
  connectToServer,
  disconnectFromServer,
  setErrorText,
}: {
  readyState: ReadyState;
  nameState: PassedState<string>;
  connectToServer: () => void;
  disconnectFromServer: () => void;
  setErrorText: SetStateFunc<string>;
}) {
  const minNameLen = 3;
  const maxNameLen = 15;

  const [name, setName] = usePassedState(nameState);
  const [isValidName, setIsValidName] = useState<boolean>(false);

  useEffect(() => {
    const formatted = name.trim();
    let error: string = "";
    if (formatted.length === 0) {
      setIsValidName(false);
      return;
    } else if (formatted.length < minNameLen)
      error = `Name should be at least ${minNameLen} characters`;
    else if (formatted.length > maxNameLen)
      error = `Name should be at most ${maxNameLen} characters`;
    else if (!/^[a-zA-Z0-9]+$/.test(formatted))
      error = `Name has to be alpha-numeric!`;
    else if (!Number.isNaN(Number(formatted[0])))
      error = `Name can't start with a number`;

    setErrorText(error);
    setIsValidName(error.length === 0);
  }, [name]);

  return (
    <PrimaryButton
      text={readyState === ReadyState.OPEN ? "Disconnect" : "Connect"}
      disabled={
        !isValidName ||
        (readyState !== ReadyState.OPEN &&
          readyState !== ReadyState.CLOSED &&
          readyState !== ReadyState.UNINSTANTIATED)
      }
      onClick={
        readyState === ReadyState.OPEN ? disconnectFromServer : connectToServer
      }
    />
  );
}

function ErrorLabel({ text }: { text: string }) {
  return (
    <>
      <p className="text-red-500 text-center">
        {text.length > 0 ? `Error: ${text}` : ""}
      </p>
    </>
  );
}

function NameInput({ nameState }: { nameState: PassedState<string> }) {
  const [name, setName] = usePassedState(nameState);

  return (
    <>
      <input
        type="text"
        className="bg-white text-2xl rounded-md p-2"
        placeholder="Name"
        maxLength={15}
        value={name}
        onChange={(e) => {
          e.preventDefault();
          setName(e.target.value);
        }}
      />
    </>
  );
}
