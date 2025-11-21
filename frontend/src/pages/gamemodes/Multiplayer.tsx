import { JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import gameInstance from "@src/components/GameInstance";

export function Multiplayer(): JSX.Element {
  const [playerPos, setPlayerPos] = useState<Vector2>(ZERO_VEC);
  const [gameOptions, setGameOptions] = useState<GameOptions>({
    mazeScale: 15,
    mazeSize: MazeSize.Medium,
  });
  const [maze, setMaze] = useState<Maze>(generateMaze(13));
  const gameInstanceRef = useRef<GameInstanceHandle | null>(null);
  const navigate = useNavigate();

  const handleGenerateMaze = useCallback(
    () => setMaze(generateMaze(gameOptions.mazeScale)),
    [gameOptions],
  );

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

  return (
    <>
      <PageTitle text="Multiplayer" />
      <br />
      <div className="flex w-full justify-between">
        <p className="text-2xl"></p>
        <div className="w-full">
          <div className="mx-auto w-fit">
            <PrimaryButton
              text={readyState === ReadyState.OPEN ? "Disconnect" : "Connect"}
              disabled={
                readyState !== ReadyState.OPEN &&
                readyState !== ReadyState.CLOSED &&
                readyState !== ReadyState.UNINSTANTIATED
              }
              onClick={
                readyState === ReadyState.OPEN
                  ? disconnectFromServer
                  : connectToServer
              }
            />

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
          <GameInstance
            ref={gameInstanceRef}
            gameOptions={gameOptions}
            maze={maze}
            otherPlayers={otherPlayers}
            onPlayerMove={(newPos) => {
              if (!equalVec(newPos, playerPos)) setPlayerPos(newPos);
            }}
          />
          <GameOptionsSelector
            gameOptionsState={[gameOptions, setGameOptions]}
          />
          <PrimaryButton text="Generate" onClick={handleGenerateMaze} />
          <PrimaryButton text="Home" onClick={() => navigate(RoutePath.Home)} />
        </div>
        <div className="w-full"></div>
      </div>
    </>
  );
}
