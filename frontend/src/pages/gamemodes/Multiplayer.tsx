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
            <div>
              <NameInput
                disabled={isConnected}
                nameState={[playerName, setPlayerName]}
              />
              <ConnectButton
                isConnected={isConnected}
                nameState={[playerName, setPlayerName]}
                connectToServer={() => connectToServer(playerName.trim())}
                disconnectFromServer={disconnectFromServer}
                setErrorText={setErrorText}
              />
            </div>
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
      text={isConnected ? "Disconnect" : "Connect"}
      disabled={!isValidName}
      onClick={
        isConnected
          ? disconnectFromServer
          : () => {
              setName(name.trim());
              connectToServer();
            }
      }
    />
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
