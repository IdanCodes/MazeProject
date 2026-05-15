import React, {
  JSX,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PageTitle from "@src/components/PageTitle";
import { MazeSize } from "@src/types/maze-size";
import GameInstance, { GameInstanceHandle } from "@src/components/GameInstance";
import { ButtonSize } from "@src/components/buttons/ButtonSize";
import { RoutePath } from "@src/constants/route-path";
import PrimaryButton from "@src/components/buttons/PrimaryButton";
import { generateMaze, Maze } from "@src/types/Maze";
import { RedirectButton } from "@src/components/buttons/RedirectButton";
import { generateDFSRectGrid } from "@src/utils/maze-generator";
import LoadingSpinner from "@src/components/LoadingSpinner";
import {
  equalVec,
  isVector2,
  parseVector2,
  Vector2,
  ZERO_VEC,
} from "@src/interfaces/Vector2";
import { PlayerInfo } from "@src/interfaces/PlayerInfo";
import { PlayerRole } from "@src/constants/PlayerRole";
import { GameOptions, MazeDifficulty } from "@src/interfaces/GameOptions";
import GameState from "@src/constants/GameState";
import GameOptionsDisplay from "./SharedComponents/GameOptionsDisplay";
import StartGameButton from "./SharedComponents/StartGameButton";
import { useNetworkContext } from "@src/contexts/NetworkContext";
import { GameMsgType, ResponseCode } from "@src/constants/GameMsgType";
import { CellType, Grid } from "@src/types/Grid";
import GameStartCountdown from "./SharedComponents/GameStartCountdown";
import GameStopwatch from "./SharedComponents/GameStopwatch";
import { ErrorLabel } from "@src/components/ErrorLabel";

export default function Singleplayer({
  callerId = "Singleplayer",
  playerName,
}: {
  callerId?: string;
  playerName: string;
}): JSX.Element {
  // const [maze, setMaze] = useState<Maze>(generateMaze(gameOptions.mazeScale));
  // const navigate = useNavigate();
  // function handleClickGenerate() {
  //   setMaze(generateMaze(gameOptions.mazeScale));
  // }
  // return (
  //   <>
  //     <PageTitle text="Singleplayer" />
  //     <br />
  //     <div className="w-full place-items-center">
  //       <GameInstance
  //         gameOptions={gameOptions}
  //         maze={maze}
  //         otherPlayers={new Map()}
  //       />
  //       <div>
  //         <GameOptionsSelector
  //           gameOptionsState={[gameOptions, setGameOptions]}
  //         />
  //         <PrimaryButton className="text-3xl" onClick={handleClickGenerate}>
  //           Generate
  //         </PrimaryButton>
  //       </div>
  //       <div className="mx-auto w-fit">
  //         <PrimaryButton
  //           className="text-4xl"
  //           onClick={() => navigate(RoutePath.Home)}
  //         >
  //           Home
  //         </PrimaryButton>
  //       </div>
  //     </div>
  //   </>
  // );

  const gameInstanceRef = useRef<GameInstanceHandle | null>(null);
  const { sendMessage, onResponse } = useNetworkContext();
  const [maze, setMaze] = useState<Maze | undefined>(undefined);
  const [finishCell, setFinishCell] = useState<Vector2>({ x: -1, y: -1 });
  const [gameState, setGameState] = useState<GameState>(GameState.Ended);
  const gState = useRef<GameState>(GameState.Waiting);
  const [disableStartBtn, setDisableStartBtn] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [canMove, setCanMove] = useState<boolean>(true);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [gameStartTime, setGameStartTime] = useState<number>(-1);
  const [finishTime, setFinishTime] = useState<number | undefined>();
  const [gameOptions, setGameOptions] = useState<GameOptions>({
    difficulty: MazeDifficulty.Medium,
  });
  const [player, setPlayer] = useState<PlayerInfo>({
    username: playerName,
    position: ZERO_VEC,
    isReady: true,
    role: PlayerRole.ADMIN,
  } as PlayerInfo);
  const cellScale = useMemo(
    () => (gameInstanceRef.current ? gameInstanceRef.current.cellScale : 0),
    [gameInstanceRef.current],
  );

  const canvasToVisualGrid = useMemo(
    () =>
      gameInstanceRef.current && gameInstanceRef.current.gameCanvasRef
        ? gameInstanceRef.current.gameCanvasRef.canvasToVisualGrid
        : (_: Vector2) => ZERO_VEC,
    [gameInstanceRef.current],
  );

  // const playerGridCell = useMemo(
  //   () => canvasToGrid(player.position),
  //   [player.position],
  // );
  const playerGridCell = useRef<Vector2>(ZERO_VEC);

  const onEnterCell = (gridCell: Vector2) => {
    if (equalVec(gridCell, finishCell)) {
      console.log("Finish Maze!", gridCell);
      onPlayerFinishMaze(Date.now() - gameStartTime);
    }
  };

  const setPlayerPos = (action: SetStateAction<Vector2>) => {
    setPlayer((pl) => {
      const newPl = { ...pl };
      const newVal = typeof action == "function" ? action(pl.position) : action;
      const newGridCell = canvasToVisualGrid(newVal);
      if (!equalVec(newGridCell, playerGridCell.current)) {
        playerGridCell.current = newGridCell;
        onEnterCell(newGridCell);
      }
      newPl.position = newVal;
      return newPl;
    });
  };

  const resetPlayerPosition = () => {
    setPlayerPos({
      x: cellScale / 2,
      y: cellScale / 2,
    });
  };

  const handleStartGame = () => {
    setDisableStartBtn(true);
    console.log("in handle:", gameState);
    sendMessage(GameMsgType.GENERATE_MAZE, gameOptions);
  };

  useEffect(resetPlayerPosition, [maze, cellScale]);

  useEffect(() => {
    onResponse(callerId, GameMsgType.GENERATE_MAZE, (res) => {
      setDisableStartBtn(false);
      if (res.code == ResponseCode.ERROR) {
        setError(res.data);
        return console.error(
          "Singleplayer: Received invalid GENERATE_MAZE response:",
          res.data,
        );
      }

      const data = res.data;
      if (
        !data ||
        typeof data != "object" ||
        !data.grid ||
        !data.finishCell ||
        !isVector2(data.finishCell)
      ) {
        setError("Encountered An Error Generating The Maze. Check Console");
        return console.error(
          "Singleplayer: Received invalid GENERATE_MAZE response:",
          res.data,
        );
      }
      const matrix = res.data.grid as CellType[][];
      const grid = new Grid(matrix);
      const maze = new Maze(grid);
      const finishCell = parseVector2(res.data.finishCell)!;

      if (gState.current == GameState.Waiting) {
        onStartGame(maze, finishCell, Date.now() + 3 * 1_000);
      } else if (gState.current == GameState.Ended) {
        onRestartGame(maze);
      }
    });

    if (gState.current == GameState.Ended) return;
    gState.current = GameState.Ended;
    sendMessage(GameMsgType.GENERATE_MAZE, {
      difficulty: MazeDifficulty.Medium,
    } as GameOptions);
  }, []);

  const onStartGame = (maze: Maze, finishCell: Vector2, startTime: number) => {
    console.log("On start");
    setMaze(maze);
    setFinishCell(finishCell);
    setGameStartTime(startTime);
    setGameState(GameState.Active);
    gState.current = GameState.Active;
    setCanMove(false);
    setTimeout(resetPlayerPosition, 0);
  };

  const onFinishCountdown = () => {
    setGameStarted(true);
    setCanMove(true);
  };

  const onRestartGame = (maze: Maze) => {
    console.log("On restart");
    setMaze(maze);
    setGameStarted(false);
    setGameState(GameState.Waiting);
    gState.current = GameState.Waiting;
    setGameStartTime(-1);
    setFinishCell({ x: -1, y: -1 });
    setFinishTime(undefined);
  };

  function onPlayerFinishMaze(timeMs: number) {
    // TODO: handle local player finishing
    setGameState(GameState.Ended);
    gState.current = GameState.Ended;
    setFinishTime(timeMs);
    setMaze(undefined);
    sendMessage(GameMsgType.GENERATE_MAZE, {
      difficulty: MazeDifficulty.Medium,
    } as GameOptions);
  }

  return (
    <>
      <RedirectButton
        path={RoutePath.Home}
        className="text-2xl absolute left-10"
      >
        Back
      </RedirectButton>
      <PageTitle text="Singleplayer" />
      {maze ? (
        <div className="flex justify-center my-5 gap-5">
          <div className="w-full">
            <GameOptionsDisplay
              optionsState={[gameOptions, setGameOptions]}
              canEditOptions={true}
              gameOptionsError=""
            />
          </div>
          <div className="w-full">
            <ErrorLabel text={error} />
            <GameInstance
              ref={gameInstanceRef}
              mazeSize={MazeSize.Medium}
              maze={maze}
              finishCell={finishCell}
              otherPlayers={[]}
              playerPosState={[
                player.position,
                (action: React.SetStateAction<Vector2>) => {
                  if (canMove) setPlayerPos(action);
                },
              ]}
              onPlayerMove={(pos) => {
                setPlayerPos(pos);
              }}
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
                finishTime={finishTime}
              />
            )}
            {gameState == GameState.Waiting && (
              <>
                {disableStartBtn && <LoadingSpinner size={20} />}
                <div className="flex justify-around pt-2 pb-1">
                  <div className="w-3/5 flex justify-center">
                    {gameState == GameState.Waiting && (
                      <>
                        <StartGameButton
                          canStart={!disableStartBtn}
                          startGame={handleStartGame}
                        />
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="w-full"></div>
        </div>
      ) : (
        <>
          <p className="text-3xl text-center">Waiting for a maze...</p>
          <LoadingSpinner />
        </>
      )}
    </>
  );
}
