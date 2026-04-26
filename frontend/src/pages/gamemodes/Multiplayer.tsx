import PrimaryButton from "@src/components/buttons/PrimaryButton";
import { ErrorLabel } from "@src/components/ErrorLabel";
import GameInstance, { GameInstanceHandle } from "@src/components/GameInstance";
import PageTitle from "@src/components/PageTitle";
import { GameMsgType, ResponseCode } from "@src/constants/game-msg-type";
import { useMazePlayerSocket } from "@src/hooks/useMazePlayerSocket";
import {
  NetworkMessage,
  ServerResponse,
  useNetworkHandler,
} from "@src/hooks/useNetworkHandler";
import { usePassedState } from "@src/hooks/usePassedState";
import {
  gameIsFull as roomIsFull,
  GameRoomInfo,
  isRoomInfo,
} from "@src/interfaces/GameRoomInfo";
import {
  isPlayerInfo,
  parsePlayerInfo,
  PlayerInfo,
} from "@src/interfaces/PlayerInfo";
import { equalVec, Vector2, ZERO_VEC } from "@src/interfaces/Vector2";
import { Maze } from "@src/types/Maze";
import { MazeSize } from "@src/types/maze-size";
import { PassedState, SetStateFunc } from "@src/types/passed-state";
import { getUsernameError, maxNameLen } from "@src/utils/game-protocol";
import clsx from "clsx";
import { JSX, useEffect, useMemo, useRef, useState } from "react";
import { WS_PORT_PARAM, WS_TOKEN_PARAM } from "../Home";

export default function Multiplayer(): JSX.Element {
  const gameOnMessageCb = useRef<{ cb: (msg: NetworkMessage) => void }>({
    cb: () => {},
  });
  const url = useRef<string>("");
  const [playerName, setPlayerName] = useState<string>("");
  const [roomsList, setRoomsList] = useState<GameRoomInfo[]>([]);
  const [createRoomError, setCreateRoomError] = useState<string>("");
  const [roomsError, setRoomsError] = useState<string>("");
  const [currentRoom, setCurrentRoom] = useState<GameRoomInfo | undefined>(
    undefined,
  ); // undefined -> in lobby

  useEffect(() => {
    const port = localStorage.getItem(WS_PORT_PARAM);
    const token = localStorage.getItem(WS_TOKEN_PARAM);
    url.current = `ws://127.0.0.1:${port}?token=${token}`;
  }, []);

  const handleOnClose = (e: WebSocketEventMap["close"]) => {
    console.log("Disconnected from server");
  };

  const handleMessage = (msg: NetworkMessage) => {
    gameOnMessageCb.current.cb(msg);
    switch (msg.msgType) {
      case GameMsgType.JOIN_ROOM: {
        const data = msg.data;
        if (!data || !isRoomInfo(data)) {
          console.error("Join room failed! No room info provided.\nMsg:", msg);
          return;
        }
        setCurrentRoom(data);
        return;
      }
    }
  };

  const handleResponse = (res: ServerResponse) => {
    switch (res.responseTo) {
      case GameMsgType.ROOMS_LIST: {
        if (res.code != ResponseCode.SUCCESS) {
          console.error("Encountered error when retrieving rooms list");
          setRoomsError(
            "Could not retrieve rooms list" +
              (res.data.error && ` - ${res.data.error}`),
          );
          setRoomsList([]);
          return;
        }
        setRoomsList(res.data);
        return;
      }

      case GameMsgType.CREATE_ROOM: {
        if (res.code != ResponseCode.SUCCESS) {
          console.error("Encountered an error when creating a room", res.data);
          setCreateRoomError(res.data.error);
          return;
        }
        console.log("Room created successfuly!");
        return;
      }

      case GameMsgType.JOIN_ROOM: {
        if (res.code == ResponseCode.SUCCESS) {
          console.log("Successfuly joined room");
          setRoomsError("");
        } else
          setRoomsError(
            "Could not join room" + (res.data.error && ` - ${res.data.error}`),
          );
        return;
      }
    }
  };

  const { sendMessage, connect, disconnect, isConnected } = useMazePlayerSocket(
    url.current,
    {
      onConnect: () => {
        console.log("Connection is open!");
      },
      onMessage: (msg: NetworkMessage) => handleMessage(msg),
      onResponse: (res: ServerResponse) => handleResponse(res),
      onDisconnect: (e: CloseEvent) => handleOnClose(e),
    },
  );

  const createRoom = (name: string, capacity: number, password: string) => {
    setCreateRoomError("");
    sendMessage(GameMsgType.CREATE_ROOM, {
      name,
      capacity,
      password,
    });
    refreshRoomsList();
  };

  const joinRoom = (room_id: string, room_password: string) => {
    sendMessage(GameMsgType.JOIN_ROOM, {
      id: room_id,
      password: room_password,
    });
    refreshRoomsList();
  };

  function refreshRoomsList() {
    setRoomsList([]);
    sendMessage(GameMsgType.ROOMS_LIST);
  }

  function leaveRoom() {
    sendMessage(GameMsgType.LEAVE_ROOM);
    setCurrentRoom(undefined);
  }

  return (
    <>
      <PageTitle text="Multiplayer" />
      {!isConnected && (
        <UsernameInputPanel
          playerNameState={[playerName, setPlayerName]}
          connect={connect}
        />
      )}
      {isConnected && !currentRoom && (
        <>
          <p className="text-3xl">Name: {playerName}</p>
          <DisconnectButton
            handleDisconnect={() => {
              disconnect();
            }}
          />
          <RoomsPanel
            handleCreateRoom={createRoom}
            handleJoinRoom={joinRoom}
            refreshList={refreshRoomsList}
            roomsList={roomsList}
            createRoomError={createRoomError}
            roomsError={roomsError}
          />
        </>
      )}
      {isConnected && currentRoom && (
        <GamePanel
          playerName={playerName}
          leaveRoom={leaveRoom}
          sendMessage={sendMessage}
          onMessageCb={gameOnMessageCb.current}
        />
      )}
    </>
  );
}

function UsernameInputPanel({
  playerNameState,
  connect,
}: {
  playerNameState: PassedState<string>;
  connect: (name: string) => Promise<string>;
}) {
  const [playerName, setPlayerName] = usePassedState(playerNameState);
  const [usernameError, setUsernameError] = useState<string>("");

  useEffect(() => {
    setUsernameError(getUsernameError(playerName) ?? "");
  }, [playerName]);

  return (
    <>
      <NameInput nameState={playerNameState} disabled={false} />
      <ErrorLabel text={usernameError} />
      <ConnectButton
        handleConnect={() => {
          setPlayerName(playerName.trim());
          connect(playerName.trim()).catch(setUsernameError);
        }}
        disabled={getUsernameError(playerName) !== null}
      />
    </>
  );
}

function ConnectButton({
  handleConnect,
  disabled,
}: {
  handleConnect: React.MouseEventHandler;
  disabled: boolean;
}) {
  return (
    <PrimaryButton
      disabled={disabled}
      className="bg-green-500 hover:bg-green-600 text-2xl p-3 rounded-2xl"
      onClick={handleConnect}
    >
      Connect
    </PrimaryButton>
  );
}

function DisconnectButton({
  handleDisconnect,
}: {
  handleDisconnect: () => void;
}) {
  return (
    <PrimaryButton
      className="bg-red-500 hover:bg-red-600 text-2xl p-3 rounded-2xl"
      onClick={handleDisconnect}
    >
      Disconnect
    </PrimaryButton>
  );
}

function NameInput({
  nameState,
  disabled,
}: {
  nameState: PassedState<string>;
  disabled: boolean;
}) {
  const [name, setName] = usePassedState(nameState);

  return (
    <>
      <input
        type="text"
        className="bg-white text-2xl rounded-md p-2"
        disabled={disabled}
        placeholder="Name"
        maxLength={maxNameLen}
        value={name}
        onChange={(e) => {
          e.preventDefault();
          setName(e.target.value);
        }}
      />
    </>
  );
}

function RoomsPanel({
  refreshList,
  handleCreateRoom,
  handleJoinRoom,
  roomsError,
  roomsList,
  refreshTimeoutMS = 500,
  createRoomError = "",
}: {
  refreshList: () => void;
  handleCreateRoom: (name: string, capacity: number, password: string) => void;
  handleJoinRoom: (room_id: string, room_password: string) => void;
  roomsError: string;
  roomsList: GameRoomInfo[];
  refreshTimeoutMS?: number;
  createRoomError?: string;
}): JSX.Element {
  const [disabledRefresh, setDisabledRefresh] = useState<boolean>(false);
  function handleRefresh() {
    setDisabledRefresh(true);
    refreshList();

    setTimeout(() => setDisabledRefresh(false), refreshTimeoutMS);
  }

  useEffect(() => {
    if (roomsList.length > 0) setDisabledRefresh(false);
  }, [roomsList]);

  const roomCountStr = useMemo<string>(() => {
    if (roomsList.length == 0) return "There are no rooms open";
    if (roomsList.length == 1) return "There is 1 room open";
    return `There are ${roomsList.length} rooms open`;
  }, [roomsList]);
  return (
    <div>
      <CreateRoomPanel
        handleCreateRoom={handleCreateRoom}
        error={createRoomError}
      />
      <div className="w-7/10 mx-auto">
        <RefreshRoomListBtn
          handleRefresh={handleRefresh}
          disabled={disabledRefresh}
        />
        <ErrorLabel text={roomsError} />
        <p className="text-2xl">{roomCountStr}</p>
        <RoomList rooms={roomsList} handleJoinRoom={handleJoinRoom} />
      </div>
    </div>
  );
}

function RefreshRoomListBtn({
  handleRefresh,
  disabled,
}: {
  handleRefresh: () => void;
  disabled: boolean;
}): JSX.Element {
  useEffect(() => {
    handleRefresh();
  }, []);

  return (
    <PrimaryButton
      className="text-2xl p-3 rounded-2xl"
      onClick={handleRefresh}
      disabled={disabled}
    >
      Refresh List
    </PrimaryButton>
  );
}

function CreateRoomPanel({
  handleCreateRoom,
  error,
}: {
  handleCreateRoom: (name: string, capacity: number, password: string) => void;
  error: string;
}): JSX.Element {
  const [name, setName] = useState<string>("New Room");
  const [capacity, setCapacity] = useState<number>(2);
  const [password, setPassword] = useState<string>("");
  const btnDisabled = useMemo(
    () =>
      name.length <= 2 ||
      name.length > 20 ||
      capacity <= 1 ||
      capacity > 10 ||
      password.length > 16,
    [name, capacity, password],
  );

  const handleClick = () => {
    setName("");
    setCapacity(2);
    setPassword("");
    handleCreateRoom(name, capacity, password);
  };

  return (
    <div className="w-full flex flex-col">
      <div className="flex flex-row w-3/5 justify-between mx-auto">
        <div>
          <p className="text-3xl">Room Name: </p>
          <input
            type="text"
            placeholder="Room Name"
            className="bg-white w-50 py-1 rounded-md"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <p className="text-3xl">Capacity: </p>
          <input
            type="number"
            placeholder="1"
            className="bg-white w-50 rounded-md"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value as unknown as number)}
          />
        </div>
        <div>
          <p className="text-3xl">Password (Optional): </p>
          <input
            type="text"
            placeholder=""
            className="bg-white w-50 rounded-md text-xl"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
      <PrimaryButton
        className="bg-green-500 hover:bg-green-600 text-2xl w-50 mx-auto"
        onClick={handleClick}
        disabled={btnDisabled}
      >
        Create Room
      </PrimaryButton>
      <div className="mx-auto">
        <ErrorLabel text={error} />
      </div>
    </div>
  );
}

function RoomList({
  rooms,
  handleJoinRoom,
}: {
  rooms: GameRoomInfo[];
  handleJoinRoom: (room_id: string, room_password: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {rooms.map((roomInfo) => (
        <RoomDisplay
          key={roomInfo.id}
          room={roomInfo}
          joinRoom={(room_password: string) => {
            handleJoinRoom(roomInfo.id, room_password);
          }}
        />
      ))}
    </div>
  );

  function RoomDisplay({
    room,
    joinRoom,
  }: {
    room: GameRoomInfo;
    joinRoom: (room_password: string) => void;
  }) {
    const [password, setPassword] = useState<string>("");
    return (
      <div className="bg-gray-300 border-black border-4 rounded-2xl flex-row flex px-5 justify-between gap-5">
        <div className="flex flex-col w-1/2">
          <p className="font-semibold text-4xl">{room.name}</p>
          <div className="flex flex-row justify-between">
            <p className="text-xl">
              Active: {room.playerCount}/{room.capacity}
            </p>
          </div>
        </div>
        <div className="flex flex-row justify-between w-full">
          {room.hasPassword ? (
            <div className="flex flex-row my-1 gap-2">
              <p className="text-2xl my-auto">Password:</p>
              <input
                type="text"
                className="bg-white text-2xl w-50 h-10 my-auto rounded-md"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          ) : (
            <p className="text-2xl my-auto">No Password</p>
          )}
          <PrimaryButton
            className="text-5xl"
            disabled={roomIsFull(room)}
            onClick={() => {
              joinRoom(password);
            }}
          >
            Join
          </PrimaryButton>
        </div>
      </div>
    );
  }
}

function GamePanel({
  playerName,
  onMessageCb,
  sendMessage,
  leaveRoom,
}: {
  playerName: string;
  onMessageCb: { cb: (msg: NetworkMessage) => void };
  sendMessage: (msgType: GameMsgType, data?: any | undefined) => void;
  leaveRoom: () => void;
}): JSX.Element {
  const [localPlayer, setLocalPlayer] = useState<PlayerInfo>({
    name: playerName,
    position: ZERO_VEC,
    isReady: false,
  } as PlayerInfo);
  const [canMove, setCanMove] = useState<boolean>(true);
  const [gameStartTime, setGameStartTime] = useState<number>(-1);
  const [isGameActive, setIsGameActive] = useState<boolean>(false);
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
  // #endregion
  const [maze, setMaze] = useState<Maze | undefined>(undefined);
  const gameInstanceRef = useRef<GameInstanceHandle | null>(null);
  const cellScale = useMemo(
    () => (gameInstanceRef.current ? gameInstanceRef.current.cellScale : 0),
    [gameInstanceRef.current],
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

  const { otherPlayers, onMessage } = useNetworkHandler(
    localPlayer,
    canvasDimensions,
    setMaze,
    sendMessage,
    onStartGame,
    onFinishMaze,
    onEndGame,
  );
  const allPlayersReady = useMemo(
    () => isReady && !otherPlayers.find((p) => !p.isReady),
    [isReady, otherPlayers],
  );
  onMessageCb.cb = onMessage;

  function sendStartGame() {
    sendMessage(GameMsgType.START_GAME);
  }

  function onStartGame(startTime: number) {
    setGameStartTime(startTime);
    console.log(`Game starting in ${startTime - Date.now()}ms`);
    setIsGameActive(true);
    setCanMove(false);
  }

  function onFinishCountdown() {
    setCanMove(true);
    console.log("Start!");
  }

  function onFinishMaze(place: number, timeMs: number) {
    setCanMove(false);
    // TODO: handle local player finishing
  }

  function onEndGame(gameResults: { name: string; timeMs: number }[]) {
    // print results
    for (let i = 0; i < gameResults.length; i++) {
      console.log(
        `${i + 1}. ${gameResults[i].name} (${gameResults[i].timeMs / 10 / 100.0}s)`,
      );
    }
  }

  useEffect(() => {
    setPlayerPos({
      x: cellScale / 2,
      y: cellScale / 2,
    }); // teleport to start of maze
  }, [maze, cellScale]);

  function startGameCountdown(startTime: number) {}

  return !maze ? (
    <>Waiting for maze...</>
  ) : (
    <div>
      <DisconnectButton handleDisconnect={leaveRoom} />
      <div className="flex flex-col items-center">
        <div className="flex flex-col justify-center w-fit">
          <div className="mx-auto">
            {!isGameActive ? (
              <StartGameButton
                canStart={allPlayersReady}
                startGame={sendStartGame}
              />
            ) : (
              <GameStartCountdown
                startTime={gameStartTime}
                onStart={onFinishCountdown}
              />
            )}
          </div>
          <GameInstance
            ref={gameInstanceRef}
            mazeSize={MazeSize.Medium}
            maze={maze}
            otherPlayers={otherPlayers}
            playerPosState={[
              playerPos,
              (action: React.SetStateAction<Vector2>) => {
                if (canMove) setPlayerPos(action);
              },
            ]}
          />
          <div className="flex flex-row justify-between">
            <PlayersList players={[localPlayer, ...otherPlayers]} />
            <ReadyButton readyState={[isReady, setIsReady]} disabled={false} />
          </div>
        </div>
      </div>
    </div>
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

function PlayersList({ players }: { players: PlayerInfo[] }) {
  return (
    <div className="text-xl flex flex-col truncate text-left">
      {players.map((p) => (
        <span key={p.name} className="">
          {p.name}
          {" - "}
          {p.isReady ? (
            <span className="text-green-500">Ready</span>
          ) : (
            <span className="text-red-500">Not Ready</span>
          )}
        </span>
      ))}
    </div>
  );
}

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
  const hasStarted = useMemo<boolean>(() => timeLeft <= DELTA_MS, [timeLeft]);

  useEffect(() => {
    setTimeout(() => {
      if (!hasStarted) setTimeLeft(startTime - Date.now());
      else onStart();
    }, DELTA_MS);
  }, [startTime, timeLeft]);

  return (
    <>
      <p className="text-3xl">
        {hasStarted ? "Start!" : (timeLeft / 1000.0).toFixed(2)}
      </p>
    </>
  );
}
