import PrimaryButton from "@src/components/buttons/PrimaryButton";
import { ErrorLabel } from "@src/components/ErrorLabel";
import GameInstance, { GameInstanceHandle } from "@src/components/GameInstance";
import OverlayModal from "@src/components/OverlayModal";
import PageTitle from "@src/components/PageTitle";
import { GameMsgType } from "@src/constants/GameMsgType";
import GameState from "@src/constants/GameState";
import { PlayerRole } from "@src/constants/PlayerRole";
import { useNetworkContext } from "@src/contexts/NetworkContext";
import { useGameNetworkHandler } from "@src/hooks/useGameNetworkHandler";
import { usePassedState } from "@src/hooks/usePassedState";
import { GameOptions, MazeDifficulty } from "@src/interfaces/GameOptions";
import { GameRoomInfo } from "@src/interfaces/GameRoomInfo";
import { PlayerInfo } from "@src/interfaces/PlayerInfo";
import { equalVec, Vector2, ZERO_VEC } from "@src/interfaces/Vector2";
import { GameResult } from "@src/types/GameResult";
import { Maze } from "@src/types/Maze";
import { MazeSize } from "@src/types/maze-size";
import { PassedState, SetStateFunc } from "@src/types/passed-state";
import { formatTime } from "@src/utils/common-helpers";
import clsx from "clsx";
import { JSX, useEffect, useMemo, useRef, useState } from "react";

function GameView({
  callerId,
  roomInfo,
  playerName,
  leaveRoom,
}: {
  callerId: string;
  roomInfo: GameRoomInfo;
  playerName: string;
  leaveRoom: () => void;
}): JSX.Element {
  const { onResponse, sendMessage } = useNetworkContext();
  const finishedSetup = useRef<boolean>(false);
  const [localPlayer, setLocalPlayer] = useState<PlayerInfo>({
    username: playerName,
    position: ZERO_VEC,
    isReady: false,
  } as PlayerInfo);
  const [canMove, setCanMove] = useState<boolean>(true);
  const [gameStartTime, setGameStartTime] = useState<number>(-1);
  const [gameState, setGameState] = useState<GameState>(GameState.Waiting);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [gameOptions, setGameOptions] = useState<GameOptions | undefined>(
    undefined,
  );
  // #region Player Attributes
  const isReady = useMemo(() => localPlayer.isReady, [localPlayer.isReady]);
  const setIsReady: SetStateFunc<boolean> = (
    action: React.SetStateAction<boolean>,
  ) => {
    const newVal =
      typeof action == "function" ? action(localPlayer.isReady) : action;
    setLocalPlayer((lp) => ({ ...lp, isReady: newVal }));
  };
  const playerPos = useMemo(() => localPlayer.position, [localPlayer.position]);
  const setPlayerPos = (action: React.SetStateAction<Vector2>) => {
    const newVal =
      typeof action == "function" ? action(localPlayer.position) : action;
    if (equalVec(newVal, playerPos)) return;

    setLocalPlayer((lp) => ({ ...lp, position: newVal }));
  };
  const playerRole = useMemo(() => localPlayer.role, [localPlayer.role]);
  const setPlayerRole = (action: React.SetStateAction<PlayerRole>) => {
    const newVal =
      typeof action == "function" ? action(localPlayer.role) : action;
    setLocalPlayer((lp) => ({ ...lp, role: newVal }));
  };
  // #endregion
  const [maze, setMaze] = useState<Maze | undefined>(undefined);
  const gameInstanceRef = useRef<GameInstanceHandle | null>(null);
  const [finishCell, setFinishCell] = useState<Vector2>({ x: -1, y: -1 });
  const [finishTimes, setFinishTimes] = useState<Map<string, number>>(
    new Map(),
  );
  const [lastGameResults, setLastGameResults] = useState<GameResult[] | null>(
    null,
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
  const [gameOptionsError, setGameOptionsError] = useState<string>("");

  const { otherPlayers } = useGameNetworkHandler(
    localPlayer,
    callerId + ".useGameNetworkHandler",
    canvasDimensions,
    setMaze,
    setFinishCell,
    setPlayerRole,
    (newOptions: GameOptions) => setGameOptions(newOptions),
    onStartGame,
    onPlayerFinishMaze,
    onEndGame,
    onRestartGame,
  );
  const allPlayersReady = useMemo(
    () => isReady && !otherPlayers.find((p) => !p.isReady),
    [isReady, otherPlayers],
  );
  const isAdmin = useMemo(
    () => localPlayer.role === PlayerRole.ADMIN,
    [localPlayer],
  );

  useEffect(() => {
    if (finishedSetup.current) return;
    finishedSetup.current = true;
    onResponse(callerId, GameMsgType.GAME_OPTIONS, (res) =>
      setGameOptionsError(res.data),
    );

    sendMessage(GameMsgType.PLAYER_CONNECTED); // notify server the client is ready for room info
  }, []);

  function sendStartGame() {
    sendMessage(GameMsgType.START_GAME);
  }

  function onStartGame(startTime: number) {
    setGameStartTime(startTime);
    console.log(`Game starting in ${startTime - Date.now()}ms`);
    setGameState(GameState.Active);
    setCanMove(false);
    setIsReady(false);
    setTimeout(() => {
      // Access the scale directly from the ref to ensure it's current
      const scale = gameInstanceRef.current?.cellScale ?? 0;
      setPlayerPos({
        x: scale / 2,
        y: scale / 2,
      });
    }, 0);
  }

  function onFinishCountdown() {
    setGameStarted(true);
    setCanMove(true);

    console.log("Start!");
  }

  function onPlayerFinishMaze(username: string, place: number, timeMs: number) {
    setFinishTimes((ft) => {
      const newFt = new Map(ft);
      newFt.set(username, timeMs);
      return newFt;
    });
    if (username == localPlayer.username) {
      setCanMove(false);
      // TODO: handle local player finishing
    }
  }

  function onEndGame(gameResults: GameResult[]) {
    setLastGameResults(gameResults);
    setGameState(GameState.Ended);
    setCanMove(true);

    // print results
    for (let i = 0; i < gameResults.length; i++) {
      console.log(
        `${i + 1}. ${gameResults[i].username} (${gameResults[i].timeMs / 10 / 100.0}s)`,
      );
    }
  }

  function onRestartGame() {
    console.log("Restarting Game!");
    setGameStarted(false);
    setGameState(GameState.Waiting);
    setGameStartTime(-1);
    setFinishCell({ x: -1, y: -1 });
    setFinishTimes(new Map());
  }

  return !maze ? (
    <>Waiting for maze...</>
  ) : (
    <div>
      <div className="flex justify-center flex-row">
        <PrimaryButton
          onClick={leaveRoom}
          className="bg-red-500 hover:bg-red-600 rounded-2xl text-lg h-10 left-1/3 top-5 absolute"
        >
          Leave Room
        </PrimaryButton>
        <p className="text-4xl text-center font-semibold my-4">
          {roomInfo.name}
        </p>
      </div>
      <div className="flex flex-row justify-center gap-5">
        <div className="flex flex-row justify-center w-full">
          <div className="flex flex-col">
            {gameState == GameState.Waiting && (
              <>
                {gameOptions && (
                  <GameOptionsDisplay
                    canEditOptions={isAdmin}
                    options={gameOptions}
                    setOptions={(newOptions) => {
                      sendMessage(GameMsgType.GAME_OPTIONS, newOptions);
                    }}
                    gameOptionsError={gameOptionsError}
                  />
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col justify-center w-fit">
          <div className="mx-auto w-full"></div>
          <GameInstance
            ref={gameInstanceRef}
            mazeSize={MazeSize.Medium}
            maze={maze}
            finishCell={finishCell}
            otherPlayers={otherPlayers}
            playerPosState={[
              playerPos,
              (action: React.SetStateAction<Vector2>) => {
                if (canMove) setPlayerPos(action);
              },
            ]}
          />
          {gameState == GameState.Active && !gameStarted && (
            <GameStartCountdown
              startTime={gameStartTime}
              onStart={onFinishCountdown}
            />
          )}
          {gameState == GameState.Active && gameStarted && (
            <GameStopwatch
              startTime={gameStartTime}
              finishTime={finishTimes.get(localPlayer.username)}
            />
          )}
          {/* {isAdmin && gameState == GameState.Ended && <RestartButton />} */}

          <div className="flex justify-around pt-2 pb-1">
            {isAdmin && (
              <div className="w-3/5 flex justify-center">
                <StartGameButton
                  canStart={allPlayersReady && otherPlayers.length > 0}
                  startGame={sendStartGame}
                />
              </div>
            )}
            <div className="w-3/5 flex justify-center">
              {gameState == GameState.Waiting && (
                <ReadyButton
                  readyState={[isReady, setIsReady]}
                  disabled={false}
                />
              )}
            </div>
          </div>
        </div>
        <div className="w-full flex flex-col justify-start gap-15">
          <PlayersList
            players={[localPlayer, ...otherPlayers]}
            finishTimes={finishTimes}
          />
          {gameState != GameState.Active && lastGameResults && (
            <GameResultsPanel />
          )}
        </div>
      </div>
    </div>
  );

  function StartGameButton({
    canStart,
    startGame,
  }: {
    canStart: boolean;
    startGame: () => void;
  }) {
    return (
      <>
        <PrimaryButton
          className="text-2xl bg-blue-500 my-1 hover:bg-blue-600/90 active:bg-blue-500/90"
          disabled={!canStart}
          onClick={startGame}
        >
          Start Game
        </PrimaryButton>
      </>
    );
  }

  function GameStartCountdown({
    startTime,
    onStart,
    DELTA_MS = 50,
  }: {
    startTime: number;
    onStart: () => void;
    DELTA_MS?: number;
  }) {
    const [timeLeft, setTimeLeft] = useState(() => startTime - Date.now());
    const hasStarted = useRef<boolean>(false);

    useEffect(() => {
      if (hasStarted.current) return;
      if (timeLeft <= DELTA_MS) {
        hasStarted.current = true;
        onStart();
      }
      setTimeout(() => {
        setTimeLeft(startTime - Date.now());
      }, DELTA_MS);
    }, [timeLeft]);

    return (
      <>
        <p className="text-3xl">
          {hasStarted.current ? "Start!" : (timeLeft / 1000.0).toFixed(1)}
        </p>
      </>
    );
  }

  function GameOptionsDisplay({
    options,
    canEditOptions,
    setOptions,
    gameOptionsError,
  }: {
    options: GameOptions;
    canEditOptions: boolean;
    setOptions: (newOpts: GameOptions) => void;
    gameOptionsError: string | undefined;
  }) {
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [newOptions, setNewOptions] = useState<GameOptions>({ ...options });

    function startEdit() {
      setNewOptions({ ...options });
      setIsEditing(true);
    }
    function cancelEdit() {
      if (!isEditing) return;
      setIsEditing(false);
    }
    function saveEdit() {
      if (!isEditing) return;
      setOptions(newOptions);
      setIsEditing(false);
    }

    const onChangeOpt = (name: string, value: any) => {
      setNewOptions((oldOpts) => {
        const newOpts = { ...oldOpts };
        switch (name) {
          case "difficulty": {
            newOpts.difficulty = value;
            break;
          }
        }

        return newOpts;
      });
    };

    return (
      <>
        <p className="text-2xl text-center bold">Game Options:</p>
        <div
          className={clsx(
            "flex flex-col w-full mx-auto gap-3 justify-between items-center my-1",
            !canEditOptions && "opacity-0.4",
          )}
        >
          {gameOptionsError && <ErrorLabel text={gameOptionsError} />}
          {/* Maze Dimensions */}
          <MazeDifficultySection />
          {/* Edit buttons */}
          <div className="my-1">
            {canEditOptions &&
              (isEditing ? (
                <div className="flex justify-between w-full">
                  <PrimaryButton
                    className="text-2xl bg-red-500/90 hover:bg-red-500"
                    onClick={cancelEdit}
                  >
                    Cancel
                  </PrimaryButton>
                  <PrimaryButton
                    className="text-2xl w-1/2 bg-green-500/90 hover:bg-green-500 "
                    onClick={saveEdit}
                  >
                    Save
                  </PrimaryButton>
                </div>
              ) : (
                <div className="w-full">
                  <PrimaryButton
                    className="text-xl mx-auto bg-gray-500/90 hover:bg-gray-500"
                    onClick={startEdit}
                  >
                    Edit
                  </PrimaryButton>
                </div>
              ))}
          </div>
        </div>
      </>
    );

    function MazeDifficultySection() {
      return isEditing ? (
        <div className="text-xl truncate">
          <span>Maze Difficulty: </span>
          <div className="flex justify-around w-4/5 my-2">
            <select
              value={newOptions.difficulty}
              onChange={(t) => onChangeOpt("difficulty", t.target.value)}
              className="border-2 rounded-xl p-1"
            >
              {Object.values(MazeDifficulty).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="text-xl truncate">
          <span>Maze Difficulty: </span>
          <span className="text-blue-500/80 font-semibold">
            {options.difficulty}
          </span>
        </div>
      );
    }
  }

  function GameStopwatch({
    startTime,
    finishTime,
    DELTA_MS = 50,
  }: {
    startTime: number;
    finishTime: number | undefined;
    DELTA_MS?: number;
  }) {
    const [timeSinceStart, setTimeSinceStart] = useState<number>(
      () => Date.now() - startTime,
    );

    useEffect(() => {
      if (finishTime != null) return;
      setTimeout(() => {
        setTimeSinceStart(Date.now() - startTime);
      }, DELTA_MS);
    }, [startTime, timeSinceStart]);
    // useEffect(() => {
    //   if (finishTime != null) setTimeSinceStart(finishTime);
    // }, [finishTime]);

    return (
      <>
        <div className="w-full my-1">
          <p className="text-4xl text-center font-semibold">
            {formatTime(finishTime ?? timeSinceStart)}
          </p>
        </div>
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
              ? "bg-emerald-400 hover:bg-emerald-400/80 active:bg-emerald-500/80"
              : "bg-green-500 hover:bg-green-500/80 active:bg-green-600/80",
          )}
          disabled={disabled}
          onClick={() =>
            setIsReady((r) => {
              return !r;
            })
          }
        >
          {isReady ? "Unready" : "Ready"}
        </PrimaryButton>
      </>
    );
  }

  // function RestartButton({}: {}) {
  //   return (
  //     <>
  //       <PrimaryButton className="text-2xl">Restart</PrimaryButton>
  //     </>
  //   );
  // }

  function GameResultsPanel() {
    if (!lastGameResults) return <></>;

    return (
      <>
        {/* <OverlayModal></OverlayModal> */}
        <div className="bg-gray-400/30">
          <p className="text-3xl">Results:</p>
          {lastGameResults.map((res, i) => (
            <div key={res.username}>
              <p className="text-2xl">
                {i + 1}. {res.username} - {formatTime(res.timeMs)}s
              </p>
            </div>
          ))}
        </div>
      </>
    );
  }

  function PlayersList({
    players,
    finishTimes,
  }: {
    players: PlayerInfo[];
    finishTimes: Map<string, number>; // map player name -> finish time ms
  }) {
    return (
      <div className="text-2xl flex flex-col justify-start truncate text-left">
        {players.map((p) => (
          <span
            key={p.username}
            className={clsx(
              "text-2xl",
              p.role == PlayerRole.ADMIN && "text-blue-800",
              p.role == PlayerRole.PLAYER && "",
            )}
          >
            {p.username}
            {p.role == PlayerRole.ADMIN ? " (admin)" : ""}
            {gameState == GameState.Waiting ? (
              <>
                {" - "}
                {p.isReady ? (
                  <span className="text-green-500">Ready</span>
                ) : (
                  <span className="text-red-500">Not Ready</span>
                )}
              </>
            ) : (
              <>
                {finishTimes.get(p.username) && (
                  <span>
                    {` - ${(finishTimes.get(p.username)! / 1000.0).toFixed(2)}s`}
                  </span>
                )}
              </>
            )}
          </span>
        ))}
      </div>
    );
  }
}

export default GameView;
