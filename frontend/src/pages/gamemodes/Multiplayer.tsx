import React, {
  forwardRef,
  JSX,
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
import { usePassedState } from "@src/hooks/usePassedState";
import { PassedState, SetStateFunc } from "@src/types/passed-state";
import { getUsernameError } from "@src/utils/game-protocol";
import clsx from "clsx";
import { PlayerInfo } from "@src/interfaces/PlayerInfo";

const MultiplayerGameManager = forwardRef<
  GameInstanceHandle,
  {
    gameOptions: GameOptions;
    maze: Maze;
    otherPlayers: PlayerInfo[];
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
  const [isReady, setIsReady] = useState<boolean>(false);

  const handleNetworkError = (e: WebSocketEventMap["error"]) => {
    console.error("Network error:", e);
    setErrorText(`A network error occurred. Please refresh the page`);
    setPlayerName("");
  };

  const {
    otherPlayers,
    sendMaze,
    isConnected,
    connectToServer,
    disconnectFromServer,
  } = useNetworkHandler(
    playerPos,
    canvasDimensions,
    setMaze,
    handleNetworkError,
  );

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
          <div className="mx-auto pl-10 pr-10 w-full flex flex-col">
            <PrimaryButton
              className="text-3xl w-[50%] my-5 mx-0"
              onClick={() => navigate(RoutePath.Home)}
            >
              Home
            </PrimaryButton>
            <div>
              <NameInput
                disabled={isConnected}
                nameState={[playerName, setPlayerName]}
              />
              <ConnectButton
                isConnected={isConnected}
                nameState={[playerName, setPlayerName]}
                connectToServer={async () => {
                  connectToServer(playerName.trim())
                    .then(() => {
                      setErrorText("");
                    })
                    .catch((err) => {
                      setErrorText(err);
                    });
                }}
                disconnectFromServer={() => {
                  disconnectFromServer();
                  setIsReady(false);
                }}
                setErrorText={setErrorText}
              />
            </div>
            <ErrorLabel text={errorText} />
            {isConnected && (
              <>
                <PrimaryButton
                  className="text-3xl"
                  onClick={() => sendMaze(maze)}
                >
                  Send Maze
                </PrimaryButton>
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
              <div className="flex justify-around">
                <PrimaryButton
                  className="text-3xl"
                  onClick={handleGenerateMaze}
                >
                  Generate
                </PrimaryButton>
                <ReadyButton
                  readyState={[isReady, setIsReady]}
                  disabled={!isConnected}
                />
              </div>
            </>
          )}
        </div>
        <div className="w-full">
          // TODO: Implement players list
          <PlayersList players={[]} />
        </div>
      </div>
    </>
  );
}

function ConnectButton({
  isConnected,
  nameState,
  connectToServer,
  disconnectFromServer,
  setErrorText,
}: {
  isConnected: boolean;
  nameState: PassedState<string>;
  connectToServer: () => void;
  disconnectFromServer: () => void;
  setErrorText: SetStateFunc<string>;
}) {
  const [name, setName] = usePassedState(nameState);
  const [isValidName, setIsValidName] = useState<boolean>(false);

  useEffect(() => {
    const formatted = name.trim();
    const error = getUsernameError(formatted);
    setIsValidName(error === null);
    setErrorText(error ?? "");
  }, [name]);

  return (
    <PrimaryButton
      className="text-3xl"
      disabled={!isValidName}
      onClick={
        isConnected
          ? disconnectFromServer
          : () => {
              setName(name.trim());
              connectToServer();
            }
      }
    >
      {isConnected ? "Disconnect" : "Connect"}
    </PrimaryButton>
  );
}

function ErrorLabel({ text }: { text: string }) {
  return (
    <>
      <p className="text-red-500 max-w-[70%]">
        {text.length > 0 ? `Error: ${text}` : ""}
      </p>
    </>
  );
}

function NameInput({
  disabled,
  nameState,
}: {
  disabled: boolean;
  nameState: PassedState<string>;
}) {
  const [name, setName] = usePassedState(nameState);

  return (
    <>
      <input
        type="text"
        className="bg-white text-2xl rounded-md p-2"
        disabled={disabled}
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

function ReadyButton({
  readyState,
  disabled,
}: {
  readyState: PassedState<boolean>;
  disabled: boolean;
}) {
  const [isReady, setIsReady] = usePassedState(readyState);
  return (
    <>
      <PrimaryButton
        className={clsx(
          "text-3xl",
          isReady
            ? "bg-green-500 hover:bg-green-500/80 active:bg-green-600/80"
            : "bg-emerald-400 hover:bg-emerald-400/80 active:bg-emerald-500/80",
        )}
        disabled={disabled}
        onClick={() =>
          setIsReady((r) => {
            return !r;
          })
        }
      >
        {isReady ? "Ready" : "Not Ready"}
      </PrimaryButton>
    </>
  );
}

function PlayersList({ players }: { players: PlayerInfo[] }) {
  return (
    <>
      {players.map((p) => (
        <>
          <p key={p.name} className="text-2xl">
            {p.name} - {p.isReady ? "Ready" : "Not Ready"}
          </p>
        </>
      ))}
    </>
  );
}
